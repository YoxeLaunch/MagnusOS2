/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE
 * Experimental GARCH(1,1) Volatility Module (Phase 3.5)
 * Analyzes conditional volatility, volatility clustering, and benchmarks vs EWMA
 * ============================================================================
 */

export class GarchModel {
    static id = 'garch_1_1';
    static name = 'GARCH(1,1) Conditional Volatility Engine';

    constructor(params = {}) {
        this.omega = params.omega || null;
        this.alpha = params.alpha || null;
        this.beta = params.beta || null;
    }

    /**
     * Fit GARCH(1,1) on series of log returns using Quasi-Maximum Likelihood Estimation (QMLE)
     */
    fit(trainPoints) {
        if (!trainPoints || trainPoints.length < 50) {
            throw new Error('Se requieren al menos 50 puntos para estimar GARCH(1,1)');
        }

        const prices = trainPoints.map(p => Number(p.price));
        const logReturns = [];
        for (let i = 1; i < prices.length; i++) {
            logReturns.push(Math.log(prices[i] / prices[i - 1]));
        }

        const n = logReturns.length;
        const mean = logReturns.reduce((a, b) => a + b, 0) / n;
        const eps = logReturns.map(r => r - mean); // innovations e_t

        // Sample variance as initial target
        const sampleVar = eps.reduce((acc, e) => acc + e * e, 0) / n;

        // Optimized parameter search via log-likelihood maximization
        // Log-Likelihood: -0.5 * sum(ln(sigma_t^2) + eps_t^2 / sigma_t^2)
        let bestOmega = 0.000005;
        let bestAlpha = 0.08;
        let bestBeta = 0.90;
        let bestLogLik = -Infinity;

        // Fast focused grid over typical financial parameters (alpha in 0.03-0.20, alpha+beta < 0.99)
        const alphaCandidates = [0.03, 0.05, 0.08, 0.12, 0.15];
        const persistenceCandidates = [0.90, 0.94, 0.97, 0.985];

        for (const alpha of alphaCandidates) {
            for (const persist of persistenceCandidates) {
                if (persist > alpha) {
                    const beta = persist - alpha;
                    const omega = sampleVar * (1 - alpha - beta);

                    if (omega > 0 && alpha >= 0 && beta >= 0 && (alpha + beta) < 1.0) {
                        let currentVar = sampleVar;
                        let logLik = 0;
                        let valid = true;

                        for (let t = 0; t < n; t++) {
                            const e2 = t === 0 ? sampleVar : eps[t - 1] * eps[t - 1];
                            currentVar = omega + alpha * e2 + beta * currentVar;
                            if (currentVar <= 0 || isNaN(currentVar)) {
                                valid = false;
                                break;
                            }
                            logLik -= 0.5 * (Math.log(currentVar) + (eps[t] * eps[t]) / currentVar);
                        }

                        if (valid && logLik > bestLogLik) {
                            bestLogLik = logLik;
                            bestOmega = omega;
                            bestAlpha = alpha;
                            bestBeta = beta;
                        }
                    }
                }
            }
        }

        this.omega = bestOmega;
        this.alpha = bestAlpha;
        this.beta = bestBeta;
        this.mean = mean;
        this.unconditionalVar = this.omega / (1 - this.alpha - this.beta);
        this.unconditionalAnnualVol = Math.sqrt(this.unconditionalVar) * Math.sqrt(252);

        // Run full recursion to obtain final conditional variance sigma_T^2
        let currentSig2 = sampleVar;
        const condVolSeries = [];
        for (let t = 0; t < n; t++) {
            const e2 = t === 0 ? sampleVar : eps[t - 1] * eps[t - 1];
            currentSig2 = this.omega + this.alpha * e2 + this.beta * currentSig2;
            condVolSeries.push(Math.sqrt(currentSig2));
        }

        this.lastCondVar = currentSig2;
        this.lastCondVol = Math.sqrt(currentSig2);
        this.lastCondAnnualVol = this.lastCondVol * Math.sqrt(252);
        this.lastPrice = prices[prices.length - 1];

        // Benchmark: RiskMetrics EWMA (lambda = 0.94)
        let ewmaSig2 = sampleVar;
        for (let t = 0; t < n; t++) {
            const e2 = t === 0 ? sampleVar : eps[t - 1] * eps[t - 1];
            ewmaSig2 = 0.94 * ewmaSig2 + 0.06 * e2;
        }
        this.ewmaAnnualVol = Math.sqrt(ewmaSig2) * Math.sqrt(252);

        // Benchmark: Rolling 20-day historical vol
        const last20 = eps.slice(-20);
        const last20Var = last20.reduce((acc, e) => acc + e * e, 0) / (last20.length || 1);
        this.hist20AnnualVol = Math.sqrt(last20Var) * Math.sqrt(252);

        return this;
    }

    /**
     * Forecast conditional volatility h days ahead
     * Analytical term structure: E[sigma_{t+h}^2] = V_bar + (alpha+beta)^h * (sigma_t^2 - V_bar)
     */
    predictVolatility(horizon = 1) {
        const persistence = this.alpha + this.beta;
        const decay = Math.pow(persistence, horizon);
        const forecastVar = this.unconditionalVar + decay * (this.lastCondVar - this.unconditionalVar);
        const dailyVol = Math.sqrt(forecastVar);
        const annualVol = dailyVol * Math.sqrt(252);

        return {
            horizon,
            forecastDailyVol: dailyVol,
            forecastAnnualVol: annualVol,
            currentCondAnnualVol: this.lastCondAnnualVol,
            unconditionalAnnualVol: this.unconditionalAnnualVol,
            benchmarks: {
                ewma94AnnualVol: this.ewmaAnnualVol,
                historical20dAnnualVol: this.hist20AnnualVol
            },
            parameters: {
                omega: this.omega,
                alpha: this.alpha,
                beta: this.beta,
                persistence
            }
        };
    }

    /**
     * Predict exchange rate level incorporating GARCH conditional volatility bands
     */
    predict(currentPoint, horizon = 1) {
        const pt = Number(currentPoint.price);
        const volForecast = this.predictVolatility(horizon);
        const forecastPrice = pt * Math.exp(this.mean * horizon);
        const margin = 1.96 * volForecast.forecastDailyVol * Math.sqrt(horizon) * forecastPrice;

        return {
            predictedValue: forecastPrice,
            lower95: Math.max(0.01, forecastPrice - margin),
            upper95: forecastPrice + margin,
            conditionalAnnualVol: volForecast.forecastAnnualVol,
            parameters: volForecast.parameters,
            horizon
        };
    }
}
