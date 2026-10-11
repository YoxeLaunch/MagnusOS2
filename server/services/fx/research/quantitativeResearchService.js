/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE SERVICE
 * Orchestrates econometric research, statistical profiling, and model registry
 * ============================================================================
 */

import crypto from 'crypto';
import { FxRateObservation, FxResearchExperiment, FxResearchForecast } from '../../../models/index.js';
import { SeriesPreparation } from './seriesPreparation.js';
import { BacktestEngine } from './backtestEngine.js';
import { MODEL_REGISTRY } from './models/modelRegistry.js';

export class QuantitativeResearchService {
    constructor() {
        this.cache = new Map();
        this.cacheTtlMs = 10 * 60 * 1000; // 10 minutes
    }

    /**
     * Fetch clean historical series read-only from database
     */
    async getCleanHistoricalSeries(options = {}) {
        const baseCurrency = (options.currency || options.baseCurrency || 'USD').toUpperCase();
        const provider = (options.provider || 'bcrd').toLowerCase();

        const cacheKey = `series_${provider}_${baseCurrency}`;
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < this.cacheTtlMs)) {
            return cached.data;
        }

        // Query read-only from PostgreSQL
        const rows = await FxRateObservation.findAll({
            where: {
                provider,
                baseCurrency
            },
            attributes: ['economicDate', 'buy', 'sell', 'mid', 'buyExact', 'sellExact'],
            order: [['economic_date', 'ASC'], ['id', 'ASC']]
        });

        if (!rows || rows.length === 0) {
            throw new Error(`No se encontraron observaciones históricas para ${provider} ${baseCurrency}`);
        }

        const points = rows.map(r => {
            const b = r.buyExact != null ? Number(r.buyExact) : Number(r.buy);
            const s = r.sellExact != null ? Number(r.sellExact) : Number(r.sell);
            const mid = (b && s) ? (b + s) / 2 : (s || b);
            return {
                date: r.economicDate,
                buy: b,
                sell: s,
                price: mid
            };
        }).filter(p => p.price != null && !isNaN(p.price) && p.price > 0);

        const prepared = SeriesPreparation.extractReturns(points);
        const data = {
            provider,
            baseCurrency,
            pointsCount: points.length,
            firstDate: points[0].date,
            lastDate: points[points.length - 1].date,
            datasetHash: prepared.datasetHash,
            points: prepared.points,
            returns: prepared.returns
        };

        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    }

    /**
     * Compute and return complete statistical profile of historical series
     */
    async getStatisticalProfile(options = {}) {
        const seriesData = await this.getCleanHistoricalSeries(options);
        const stats = SeriesPreparation.computeDescriptiveStatistics(seriesData.returns);

        return {
            provider: seriesData.provider,
            baseCurrency: seriesData.baseCurrency,
            firstDate: seriesData.firstDate,
            lastDate: seriesData.lastDate,
            datasetHash: seriesData.datasetHash,
            statistics: stats
        };
    }

    /**
     * Get list of available models and categories
     */
    getModelsCatalog() {
        return Object.values(MODEL_REGISTRY).map(m => ({
            id: m.id,
            name: m.name,
            category: m.category,
            description: m.description
        }));
    }

    /**
     * Run comparative benchmark across all models for a specific horizon
     */
    async runBenchmarkSuite(options = {}) {
        const horizon = parseInt(options.horizon || '1', 10);
        const currency = (options.currency || 'USD').toUpperCase();
        const provider = (options.provider || 'bcrd').toLowerCase();
        const stepSize = parseInt(options.stepSize || '1', 10); // 1 = exhaustive, 5 = fast

        const seriesData = await this.getCleanHistoricalSeries({ currency, provider });
        const modelsToTest = [
            'random_walk',
            'random_walk_drift',
            'moving_average',
            'ses_exponential_smoothing',
            'arima_experimental',
            'garch_1_1'
        ];

        const results = [];
        for (const modelId of modelsToTest) {
            const bt = BacktestEngine.runWalkForward({
                modelId,
                points: seriesData.points,
                horizon,
                trainRatio: 0.80,
                stepSize,
                windowType: 'expanding'
            });

            // Experiment ID deterministic hash
            const expId = `exp_${modelId}_${currency}_h${horizon}_${seriesData.datasetHash.slice(0, 8)}`;
            results.push({
                experimentId: expId,
                modelId,
                modelName: MODEL_REGISTRY[modelId].name,
                category: MODEL_REGISTRY[modelId].category,
                horizon,
                metrics: bt.metrics,
                runtimeMs: bt.runtimeMs,
                forecastCount: bt.forecastCount,
                testRange: `${bt.testStartDate} a ${bt.testEndDate}`
            });

            // Attempt persistence if table is available
            try {
                if (FxResearchExperiment) {
                    await FxResearchExperiment.upsert({
                        id: expId,
                        modelId,
                        modelName: MODEL_REGISTRY[modelId].name,
                        baseCurrency: currency,
                        quoteCurrency: 'DOP',
                        sourceProvider: provider,
                        horizonDays: horizon,
                        trainStartDate: bt.trainStartDate,
                        trainEndDate: bt.trainEndDate,
                        testStartDate: bt.testStartDate,
                        testEndDate: bt.testEndDate,
                        observationsCount: bt.forecastCount,
                        datasetHash: seriesData.datasetHash,
                        parameters: {},
                        metrics: bt.metrics,
                        runtimeMs: bt.runtimeMs
                    });
                }
            } catch (err) {
                // Table might not be migrated in certain environments, continue gracefully
            }
        }

        // Sort by RMSE ascending (best model first)
        results.sort((a, b) => a.metrics.rmse - b.metrics.rmse);

        return {
            currency,
            provider,
            horizon,
            evaluatedAt: new Date().toISOString(),
            datasetHash: seriesData.datasetHash,
            benchmarkLeaderboard: results
        };
    }
}

export const quantitativeResearchService = new QuantitativeResearchService();
