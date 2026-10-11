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
 * List of registered experiments with metrics strictly adhering to the canonical contract
 */
export const getResearchExperiments = async (req, res) => {
    try {
        const currency = (req.query.currency || 'USD').toUpperCase();
        if (!['USD', 'EUR'].includes(currency)) {
            return res.status(400).json({ success: false, error: 'Moneda no soportada. Permitidas: USD, EUR' });
        }

        const experiments = await quantitativeResearchService.getPersistedExperiments({ currency });

        return res.json({
            success: true,
            count: experiments.length,
            experiments
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al consultar experimentos:', error.message);
        return res.status(500).json({ success: false, error: 'Error al consultar experimentos registrados' });
    }
};

/**
 * GET /api/markets/fx/research/backtests/status
 * Check current execution status of quantitative benchmark suite
 */
export const getBenchmarkStatus = async (req, res) => {
    try {
        const status = quantitativeResearchService.getBenchmarkStatus();
        return res.json({
            success: true,
            status
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al consultar estado de benchmark:', error.message);
        return res.status(500).json({ success: false, error: error.message });
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
 * GET /api/markets/fx/research/forecasts/:id
 * Forward out-of-sample prediction trajectory with 95% uncertainty intervals
 */
export const getForwardForecast = async (req, res) => {
    try {
        const modelId = req.params.id;
        const horizon = parseInt(req.query.horizon || '1', 10);
        const currency = (req.query.currency || 'USD').toUpperCase();
        const provider = (req.query.provider || 'bcrd').toLowerCase();

        const forecast = await quantitativeResearchService.getForwardForecast({
            modelId,
            horizon,
            currency,
            provider
        });

        res.setHeader('Cache-Control', 'public, max-age=180');
        return res.json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al generar pronóstico experimental:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/markets/fx/research/risk/volatility
 * Complete conditional and realized volatility analytics (GARCH, EWMA, returns distribution)
 */
export const getRiskAnalytics = async (req, res) => {
    try {
        const currency = (req.query.currency || 'USD').toUpperCase();
        const provider = (req.query.provider || 'bcrd').toLowerCase();

        const risk = await quantitativeResearchService.getRiskAnalytics({
            currency,
            provider
        });

        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.json({
            success: true,
            data: risk
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al calcular analítica de riesgo:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/markets/fx/research/quality
 * Data quality, historical censuses, documented anomalies and provider status
 */
export const getDataQualityMetrics = async (req, res) => {
    try {
        const quality = await quantitativeResearchService.getDataQualityMetrics();
        res.setHeader('Cache-Control', 'public, max-age=120');
        return res.json({
            success: true,
            data: quality
        });
    } catch (error) {
        console.error('[FX_RESEARCH] Error al consultar calidad de datos:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/markets/fx/research/run & POST /api/markets/fx/research/backtests/run
 * Trigger full benchmark suite across all models
 */
export const runResearchBenchmark = async (req, res) => {
    try {
        const horizon = parseInt(req.body?.horizon || req.query?.horizon || '1', 10);
        const currency = (req.body?.currency || req.query?.currency || 'USD').toUpperCase();
        let stepSize = parseInt(req.body?.stepSize || req.query?.stepSize || '3', 10);

        if (!['USD', 'EUR'].includes(currency)) {
            return res.status(400).json({
                success: false,
                error: 'Parámetro de moneda inválido. Opciones válidas: USD, EUR'
            });
        }

        if (![1, 5, 20, 60].includes(horizon)) {
            return res.status(400).json({
                success: false,
                error: 'Horizonte no admitido. Opciones válidas: 1, 5, 20, 60 días hábiles'
            });
        }

        if (isNaN(stepSize) || stepSize < 2) {
            stepSize = 3;
        } else if (stepSize > 10) {
            stepSize = 10;
        }

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
        if (error.code === 'BENCHMARK_CONCURRENT_BLOCKED') {
            return res.status(409).json({
                success: false,
                error: error.message || 'Ya existe un benchmark en curso en este momento'
            });
        }
        if (error.code === 'BENCHMARK_TIMED_OUT') {
            return res.status(504).json({
                success: false,
                error: error.message || 'El benchmark excedió el tiempo límite permitido'
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message || 'Fallo al ejecutar benchmark cuantitativo'
        });
    }
};
