/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE
 * Baseline Benchmark Econometric Models (Phases 3.1 & 3.2)
 * All models enforce strict non-anticipation (zero lookahead leakage).
 * ============================================================================
 */

export class RandomWalkModel {
    static id = 'random_walk';
    static name = 'Random Walk (Naive Baseline)';

    constructor(params = {}) {
        this.params = params;
    }

    /**
     * Train model on historical series (read-only in-sample)
     */
    fit(trainPoints) {
        if (!trainPoints || trainPoints.length < 2) throw new Error('Se requieren al menos 2 puntos de entrenamiento');
        const logReturns = [];
        for (let i = 1; i < trainPoints.length; i++) {
            logReturns.push(Math.log(trainPoints[i].price / trainPoints[i - 1].price));
        }
        const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
        const variance = logReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (logReturns.length - 1);
        this.sigma = Math.sqrt(variance);
        this.lastObs = trainPoints[trainPoints.length - 1];
        return this;
    }

    /**
     * Predict h steps ahead from the origin point P_t
     */
    predict(currentPoint, horizon = 1) {
        const pt = Number(currentPoint.price);
        const forecast = pt; // Naive: P_{t+h} = P_t
        const margin = 1.96 * this.sigma * Math.sqrt(horizon) * pt;

        return {
            predictedValue: forecast,
            lower95: Math.max(0.01, forecast - margin),
            upper95: forecast + margin,
            horizon
        };
    }
}

export class RandomWalkWithDriftModel {
    static id = 'random_walk_drift';
    static name = 'Random Walk with In-Sample Drift';

    constructor(params = {}) {
        this.params = params;
    }

    fit(trainPoints) {
        if (!trainPoints || trainPoints.length < 2) throw new Error('Se requieren al menos 2 puntos de entrenamiento');
        const logReturns = [];
        for (let i = 1; i < trainPoints.length; i++) {
            logReturns.push(Math.log(trainPoints[i].price / trainPoints[i - 1].price));
        }
        const n = logReturns.length;
        this.mu = logReturns.reduce((a, b) => a + b, 0) / n; // strictly in-sample drift
        const variance = logReturns.reduce((acc, r) => acc + Math.pow(r - this.mu, 2), 0) / (n - 1);
        this.sigma = Math.sqrt(variance);
        return this;
    }

    predict(currentPoint, horizon = 1) {
        const pt = Number(currentPoint.price);
        const forecast = pt * Math.exp(this.mu * horizon);
        const margin = 1.96 * this.sigma * Math.sqrt(horizon) * forecast;

        return {
            predictedValue: forecast,
            lower95: Math.max(0.01, forecast - margin),
            upper95: forecast + margin,
            driftDaily: this.mu,
            horizon
        };
    }
}

export class MovingAverageModel {
    static id = 'moving_average';
    static name = 'Moving Average Indicator Model';

    constructor(params = {}) {
        this.window = params.window || 20; // 5, 20, 60 sessions
    }

    fit(trainPoints) {
        if (!trainPoints || trainPoints.length < this.window) {
            throw new Error(`Se requieren al menos ${this.window} puntos para SMA(${this.window})`);
        }
        this.trainPoints = trainPoints;
        const prices = trainPoints.map(p => Number(p.price));
        const sub = prices.slice(-this.window);
        this.currentSma = sub.reduce((a, b) => a + b, 0) / this.window;

        // Estimate residual variance
        const residuals = [];
        for (let i = this.window; i < prices.length; i++) {
            const sma = prices.slice(i - this.window, i).reduce((a, b) => a + b, 0) / this.window;
            residuals.push(prices[i] - sma);
        }
        const varRes = residuals.reduce((acc, r) => acc + r * r, 0) / (residuals.length || 1);
        this.sigma = Math.sqrt(varRes);
        return this;
    }

    predict(currentPoint, horizon = 1) {
        // SMA projection
        const forecast = this.currentSma;
        const margin = 1.96 * this.sigma * Math.sqrt(horizon);

        return {
            predictedValue: forecast,
            lower95: Math.max(0.01, forecast - margin),
            upper95: forecast + margin,
            window: this.window,
            horizon
        };
    }
}

export class SimpleExponentialSmoothingModel {
    static id = 'ses_exponential_smoothing';
    static name = 'Simple Exponential Smoothing (SES)';

    constructor(params = {}) {
        this.alpha = params.alpha || null; // if null, optimized in-sample
    }

    fit(trainPoints) {
        if (!trainPoints || trainPoints.length < 5) throw new Error('Se requieren al menos 5 puntos para SES');
        const prices = trainPoints.map(p => Number(p.price));

        if (this.alpha === null) {
            // In-sample 1D grid search for optimal alpha minimizing sum of squared one-step errors
            let bestAlpha = 0.3;
            let bestSse = Infinity;

            for (let a = 0.05; a <= 0.95; a += 0.05) {
                let s = prices[0];
                let sse = 0;
                for (let i = 1; i < prices.length; i++) {
                    const error = prices[i] - s;
                    sse += error * error;
                    s = a * prices[i] + (1 - a) * s;
                }
                if (sse < bestSse) {
                    bestSse = sse;
                    bestAlpha = a;
                }
            }
            this.optimalAlpha = bestAlpha;
        } else {
            this.optimalAlpha = this.alpha;
        }

        // Run full recursion up to end of train points
        let level = prices[0];
        const errors = [];
        for (let i = 1; i < prices.length; i++) {
            errors.push(prices[i] - level);
            level = this.optimalAlpha * prices[i] + (1 - this.optimalAlpha) * level;
        }
        this.currentLevel = level;
        const s2 = errors.reduce((acc, e) => acc + e * e, 0) / errors.length;
        this.sigma = Math.sqrt(s2);

        return this;
    }

    predict(currentPoint, horizon = 1) {
        const forecast = this.currentLevel;
        // In SES, h-step forecast variance increases as: sigma^2 * (1 + (h-1) * alpha^2)
        const hVar = Math.pow(this.sigma, 2) * (1 + (horizon - 1) * Math.pow(this.optimalAlpha, 2));
        const margin = 1.96 * Math.sqrt(hVar);

        return {
            predictedValue: forecast,
            lower95: Math.max(0.01, forecast - margin),
            upper95: forecast + margin,
            alpha: this.optimalAlpha,
            horizon
        };
    }
}
