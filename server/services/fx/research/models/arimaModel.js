/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE
 * Experimental ARIMA (AutoRegressive Integrated Moving Average) Module (Phase 3.4)
 * Evaluates ARIMA(1,1,0), ARIMA(0,1,1) on Dominican FX spot series.
 * ============================================================================
 */

export class ArimaModel {
    static id = 'arima_experimental';
    static name = 'Experimental ARIMA(p,d,q)';

    constructor(params = {}) {
        this.p = params.p !== undefined ? params.p : 1;
        this.d = params.d !== undefined ? params.d : 1;
        this.q = params.q !== undefined ? params.q : 0;
    }

    /**
     * Fit ARIMA(p,1,q) on price series by differencing prices to log returns
     */
    fit(trainPoints) {
        if (!trainPoints || trainPoints.length < 30) {
            throw new Error('Se requieren al menos 30 puntos para estimar ARIMA');
        }

        const prices = trainPoints.map(p => Number(p.price));
        const n = prices.length;

        // Step 1: Compute d=1 differences (log returns r_t = ln(P_t / P_{t-1}))
        const diffs = [];
        for (let i = 1; i < n; i++) {
            diffs.push(Math.log(prices[i] / prices[i - 1]));
        }

        const numDiffs = diffs.length;
        const meanDiff = diffs.reduce((a, b) => a + b, 0) / numDiffs;

        // Step 2: Estimate AR(1) or MA(1) parameters
        let phi = 0;
        let theta = 0;
        let c = meanDiff;
        let residuals = [];

        if (this.p === 1 && this.q === 0) {
            // AR(1) on differenced series: r_t = c + phi * r_{t-1} + e_t
            // OLS / Yule-Walker estimate
            let num = 0, den = 0;
            for (let i = 1; i < numDiffs; i++) {
                num += (diffs[i] - meanDiff) * (diffs[i - 1] - meanDiff);
                den += Math.pow(diffs[i - 1] - meanDiff, 2);
            }
            phi = den > 0 ? num / den : 0;

            // Enforce stationarity condition: |phi| < 0.99
            if (Math.abs(phi) >= 0.99) {
                phi = Math.sign(phi) * 0.95;
            }
            c = meanDiff * (1 - phi);

            for (let i = 1; i < numDiffs; i++) {
                const fitted = c + phi * diffs[i - 1];
                residuals.push(diffs[i] - fitted);
            }
        } else if (this.p === 0 && this.q === 1) {
            // MA(1) on differenced series: r_t = c + e_t + theta * e_{t-1}
            // Analytical moment estimator from lag 1 autocorrelation rho_1 = theta / (1 + theta^2)
            let num = 0, den = 0;
            for (let i = 1; i < numDiffs; i++) {
                num += (diffs[i] - meanDiff) * (diffs[i - 1] - meanDiff);
                den += Math.pow(diffs[i] - meanDiff, 2);
            }
            const rho1 = den > 0 ? num / den : 0;
            if (Math.abs(rho1) < 0.5) {
                // theta = (1 - sqrt(1 - 4 * rho1^2)) / (2 * rho1)
                theta = (1 - Math.sqrt(Math.max(0, 1 - 4 * rho1 * rho1))) / (2 * (rho1 || 0.0001));
            } else {
                theta = Math.sign(rho1) * 0.5;
            }
            c = meanDiff;

            let prevE = 0;
            for (let i = 0; i < numDiffs; i++) {
                const e = diffs[i] - (c + theta * prevE);
                residuals.push(e);
                prevE = e;
            }
        } else {
            // Default to Random Walk / AR(0) with drift
            residuals = diffs.map(d => d - meanDiff);
        }

        // Step 3: Residual diagnostics & variance
        const resVar = residuals.reduce((acc, r) => acc + r * r, 0) / (residuals.length - 1 || 1);
        this.sigma = Math.sqrt(resVar);
        this.phi = phi;
        this.theta = theta;
        this.c = c;
        this.lastDiff = diffs[diffs.length - 1];
        this.lastResidual = residuals.length ? residuals[residuals.length - 1] : 0;

        // Ljung-Box test statistic on residuals (lag 5)
        let lbSum = 0;
        const resMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
        let resDen = residuals.reduce((acc, r) => acc + Math.pow(r - resMean, 2), 0);
        for (let k = 1; k <= 5; k++) {
            let resNum = 0;
            for (let i = k; i < residuals.length; i++) {
                resNum += (residuals[i] - resMean) * (residuals[i - k] - resMean);
            }
            const rk = resDen > 0 ? resNum / resDen : 0;
            lbSum += (rk * rk) / (residuals.length - k);
        }
        this.ljungBoxQ = residuals.length * (residuals.length + 2) * lbSum;

        return this;
    }

    /**
     * Forecast h steps ahead
     */
    predict(currentPoint, horizon = 1) {
        const pt = Number(currentPoint.price);

        // Iterate forward in difference space
        let currentR = this.lastDiff;
        let cumulativeReturn = 0;

        for (let step = 1; step <= horizon; step++) {
            let nextR = 0;
            if (this.p === 1) {
                nextR = this.c + this.phi * currentR;
            } else if (this.q === 1 && step === 1) {
                nextR = this.c + this.theta * this.lastResidual;
            } else {
                nextR = this.c;
            }
            cumulativeReturn += nextR;
            currentR = nextR;
        }

        const forecast = pt * Math.exp(cumulativeReturn);
        const margin = 1.96 * this.sigma * Math.sqrt(horizon) * forecast;

        return {
            predictedValue: forecast,
            lower95: Math.max(0.01, forecast - margin),
            upper95: forecast + margin,
            order: `(${this.p},${this.d},${this.q})`,
            phi: this.phi,
            theta: this.theta,
            ljungBoxQ: this.ljungBoxQ,
            horizon
        };
    }
}
