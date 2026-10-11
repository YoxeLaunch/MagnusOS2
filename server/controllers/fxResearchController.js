/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH CONTROLLER
 * Endpoints for Level 3 Econometric Lab & Quantitative Forecasting
 * ============================================================================
 */

import { quantitativeResearchService } from '../services/fx/research/quantitativeResearchService.js';
import { BacktestEngine } from '../services/fx/research/backtestEngine.js';
import { FxResearchExperiment, FxResearchForecast } from '../models/index.js';

/**
 * GET /api/markets/fx/research/models
 * Returns the catalog of supported quantitative models
 */
export const getResearchModels = async (req, res) => {
    try {
        const catalog = quantitativeResearchService.getModelsCatalog();
        return res.json({
            success: true,
            totalModels: catalog.length,
            models: catalog
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al obtener catálogo de modelos:', error.message);
        return res.status(500).json({ success: false, error: 'Error al consultar catálogo de modelos econométricos' });
    }
};

/**
 * GET /api/markets/fx/research/series/stats
 * Returns statistical and stationarity profile of historical series
 */
export const getSeriesStats = async (req, res) => {
    try {
        const currency = (req.query.currency || 'USD').toUpperCase();
        const provider = (req.query.provider || 'bcrd').toLowerCase();

        const profile = await quantitativeResearchService.getStatisticalProfile({
            currency,
            provider
        });

        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
        return res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al calcular perfil estadístico:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/markets/fx/research/experiments
 * List of registered experiments with metrics
 */
export const getResearchExperiments = async (req, res) => {
    try {
        const currency = (req.query.currency || 'USD').toUpperCase();

        if (FxResearchExperiment) {
            const experiments = await FxResearchExperiment.findAll({
                where: { baseCurrency: currency },
                order: [['created_at', 'DESC']],
                limit: 50
            });
            if (experiments && experiments.length > 0) {
                return res.json({
                    success: true,
                    count: experiments.length,
                    experiments
                });
            }
        }

        // If no DB experiments yet, execute benchmark on the fly with fast step
        const suite = await quantitativeResearchService.runBenchmarkSuite({
            currency,
            stepSize: 5
        });

        return res.json({
            success: true,
            count: suite.benchmarkLeaderboard.length,
            experiments: suite.benchmarkLeaderboard
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al consultar experimentos:', error.message);
        return res.status(500).json({ success: false, error: 'Error al consultar experimentos registrados' });
    }
};

/**
 * GET /api/markets/fx/research/backtests/:id
 * Detailed backtest evaluation for a specific model or experiment
 */
export const getBacktestDetail = async (req, res) => {
    try {
        const modelId = req.params.id;
        const horizon = parseInt(req.query.horizon || '1', 10);
        const currency = (req.query.currency || 'USD').toUpperCase();
        const stepSize = parseInt(req.query.stepSize || '3', 10);

        const seriesData = await quantitativeResearchService.getCleanHistoricalSeries({ currency });
        const backtest = BacktestEngine.runWalkForward({
            modelId,
            points: seriesData.points,
            horizon,
            trainRatio: 0.80,
            stepSize
        });

        // Limit forecast sample points returned for UI performance (sample up to 200 points)
        const sampleRatio = Math.max(1, Math.floor(backtest.forecasts.length / 200));
        const sampledForecasts = backtest.forecasts.filter((_, idx) => idx % sampleRatio === 0);

        return res.json({
            success: true,
            modelId,
            horizon,
            currency,
            metrics: backtest.metrics,
            runtimeMs: backtest.runtimeMs,
            totalEvaluated: backtest.forecastCount,
            forecastSample: sampledForecasts
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error en ejecución de backtest:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/markets/fx/research/run
 * Trigger full benchmark suite across all models
 */
export const runResearchBenchmark = async (req, res) => {
    try {
        const horizon = parseInt(req.body?.horizon || req.query?.horizon || '1', 10);
        const currency = (req.body?.currency || req.query?.currency || 'USD').toUpperCase();
        const stepSize = parseInt(req.body?.stepSize || '3', 10); // Resource-safe step

        const benchmark = await quantitativeResearchService.runBenchmarkSuite({
            horizon,
            currency,
            stepSize
        });

        return res.json({
            success: true,
            benchmark
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al ejecutar suite de benchmark:', error.message);
        return res.status(500).json({ success: false, error: 'Fallo al ejecutar benchmark cuantitativo' });
    }
};
