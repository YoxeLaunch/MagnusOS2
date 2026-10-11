/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE
 * Walk-Forward Temporal Backtesting Engine (Phase 3.3)
 * Strictly zero lookahead leakage; evaluates point and probabilistic forecasts.
 * ============================================================================
 */

import { createModelInstance } from './models/modelRegistry.js';

export class BacktestEngine {
    /**
     * Execute reproducible walk-forward backtest
     * @param {Object} options
     * @param {string} options.modelId - ID of model to test
     * @param {Object} options.modelParams - Model hyperparameters
     * @param {Array} options.points - Historical price observations { date, price }
     * @param {number} options.horizon - Forecast horizon h in days (1, 5, 20, 60)
     * @param {number} options.trainRatio - Fraction of series for initial training (e.g. 0.80)
     * @param {number} options.stepSize - Step interval for walk-forward (e.g. 1 for exhaustive, 5 for fast)
     * @param {string} options.windowType - 'expanding' or 'rolling'
     */
    static runWalkForward(options = {}) {
        const {
            modelId,
            modelParams = {},
            points,
            horizon = 1,
            trainRatio = 0.80,
            stepSize = 1,
            windowType = 'expanding'
        } = options;

        if (!points || points.length < 50) {
            throw new Error('Insuficientes puntos para backtesting walk-forward (mínimo 50)');
        }

        const sorted = [...points]
            .filter(p => p.price != null && !isNaN(p.price) && p.price > 0)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const totalN = sorted.length;
        const initialTrainSize = Math.max(30, Math.floor(totalN * trainRatio));
        const maxOrigin = totalN - horizon;

        if (initialTrainSize >= maxOrigin) {
            throw new Error(`Ventana de prueba insuficiente para horizonte h=${horizon}`);
        }

        const forecasts = [];
        const rwForecasts = []; // Always compute Random Walk in parallel for benchmark comparison

        const startTime = Date.now();

        for (let originIdx = initialTrainSize; originIdx < maxOrigin; originIdx += stepSize) {
            // Training slice strictly prior to or at originIdx
            const trainSlice = windowType === 'rolling'
                ? sorted.slice(originIdx - initialTrainSize, originIdx + 1)
                : sorted.slice(0, originIdx + 1);

            const originPoint = sorted[originIdx];
            const targetPoint = sorted[originIdx + horizon];

            // 1. Fit model in-sample
            const model = createModelInstance(modelId, modelParams);
            model.fit(trainSlice);
            const prediction = model.predict(originPoint, horizon);

            // 2. Fit Random Walk benchmark
            const rw = createModelInstance('random_walk');
            rw.fit(trainSlice);
            const rwPred = rw.predict(originPoint, horizon);

            const actual = Number(targetPoint.price);
            const predicted = Number(prediction.predictedValue);
            const rwPredicted = Number(rwPred.predictedValue);

            const error = actual - predicted;
            const errorPct = (error / actual) * 100;
            const rwError = actual - rwPredicted;

            // Directional accuracy check: sign(actual - origin) == sign(predicted - origin)
            const actualDirection = Math.sign(actual - originPoint.price);
            const predDirection = Math.sign(predicted - originPoint.price);
            const directionalHit = (actualDirection === predDirection) || (actualDirection === 0 && predDirection === 0);

            // 95% Interval coverage
            const inInterval = prediction.lower95 != null && prediction.upper95 != null
                ? (actual >= prediction.lower95 && actual <= prediction.upper95)
                : null;
            const intervalWidth = prediction.lower95 != null && prediction.upper95 != null
                ? prediction.upper95 - prediction.lower95
                : null;

            // Pinball loss (Quantile loss) for alpha = 0.05 (VaR lower) and alpha = 0.95 (VaR upper)
            const pinball95 = error > 0 ? 0.95 * error : (0.95 - 1) * error;
            const pinball05 = error > 0 ? 0.05 * error : (0.05 - 1) * error;

            forecasts.push({
                originDate: originPoint.date,
                targetDate: targetPoint.date,
                horizon,
                originPrice: originPoint.price,
                actualValue: actual,
                predictedValue: predicted,
                lower95: prediction.lower95,
                upper95: prediction.upper95,
                error,
                errorPct,
                directionalHit,
                inInterval,
                intervalWidth,
                pinball95,
                pinball05
            });

            rwForecasts.push({
                error: rwError,
                absError: Math.abs(rwError),
                sqError: rwError * rwError
            });
        }

        const runtimeMs = Date.now() - startTime;
        const metrics = this.computeMetrics(forecasts, rwForecasts, horizon);

        return {
            modelId,
            horizon,
            trainStartDate: sorted[0].date,
            trainEndDate: sorted[initialTrainSize].date,
            testStartDate: sorted[initialTrainSize + 1].date,
            testEndDate: sorted[sorted.length - 1].date,
            forecastCount: forecasts.length,
            runtimeMs,
            metrics,
            forecasts
        };
    }

    /**
     * Compute comprehensive metrics for point and probabilistic evaluation
     */
    static computeMetrics(forecasts, rwForecasts, horizon) {
        const k = forecasts.length;
        if (k === 0) return {};

        const errors = forecasts.map(f => f.error);
        const absErrors = forecasts.map(f => Math.abs(f.error));
        const sqErrors = forecasts.map(f => f.error * f.error);
        const pctErrors = forecasts.map(f => Math.abs(f.errorPct));

        const mae = absErrors.reduce((a, b) => a + b, 0) / k;
        const mse = sqErrors.reduce((a, b) => a + b, 0) / k;
        const rmse = Math.sqrt(mse);
        const bias = errors.reduce((a, b) => a + b, 0) / k; // Mean Error
        const mape = pctErrors.reduce((a, b) => a + b, 0) / k;

        // Directional Accuracy
        const hits = forecasts.filter(f => f.directionalHit).length;
        const directionalAccuracy = (hits / k) * 100;

        // Interval Coverage (95% target)
        const coveredCount = forecasts.filter(f => f.inInterval === true).length;
        const coverageRate95 = (coveredCount / k) * 100;
        const widths = forecasts.map(f => f.intervalWidth).filter(w => w != null);
        const meanIntervalWidth = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : null;

        // Mean Pinball Loss
        const meanPinball95 = forecasts.reduce((a, b) => a + b.pinball95, 0) / k;

        // Benchmark vs Random Walk (Baseline Comparison)
        const rwMae = rwForecasts.map(f => f.absError).reduce((a, b) => a + b, 0) / k;
        const rwMse = rwForecasts.map(f => f.sqError).reduce((a, b) => a + b, 0) / k;
        const rwRmse = Math.sqrt(rwMse);

        // Theil's U statistic (RMSE_model / RMSE_rw)
        const theilU = rwRmse > 0 ? rmse / rwRmse : 1.0;
        // Skill score: 1 - (RMSE_model / RMSE_rw)
        const skillScorePct = (1 - theilU) * 100;
        const beatsRandomWalk = rmse < rwRmse;

        return {
            mae: Number(mae.toFixed(4)),
            rmse: Number(rmse.toFixed(4)),
            bias: Number(bias.toFixed(4)),
            mape: Number(mape.toFixed(2)),
            directionalAccuracyPct: Number(directionalAccuracy.toFixed(2)),
            coverageRate95Pct: Number(coverageRate95.toFixed(2)),
            meanIntervalWidth: meanIntervalWidth != null ? Number(meanIntervalWidth.toFixed(4)) : null,
            meanPinballLoss95: Number(meanPinball95.toFixed(4)),
            benchmark: {
                rwMae: Number(rwMae.toFixed(4)),
                rwRmse: Number(rwRmse.toFixed(4)),
                theilU: Number(theilU.toFixed(4)),
                skillScorePct: Number(skillScorePct.toFixed(2)),
                beatsRandomWalk
            }
        };
    }
}
