/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE
 * Series Preparation, Statistical Properties & Stationarity Analysis
 * ============================================================================
 */

import crypto from 'crypto';

/**
 * Normal distribution cumulative distribution function (approximation)
 */
function normalCdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
}

/**
 * Chi-squared (1 degree of freedom) survival function (p-value): P(X >= x)
 */
function chiSquare1Survival(x) {
    if (x <= 0) return 1.0;
    // For 1 dof, chi-square is square of standard normal: P(Z^2 >= x) = 2 * (1 - Phi(sqrt(x)))
    const z = Math.sqrt(x);
    return 2 * (1 - normalCdf(z));
}

export class SeriesPreparation {
    /**
     * Compute SHA-256 hash over price series for experiment provenance
     */
    static computeDatasetHash(points) {
        const payload = points.map(p => `${p.date}|${p.price}`).join(';');
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Prepare continuous financial series and compute returns
     */
    static extractReturns(points) {
        if (!points || points.length < 2) {
            throw new Error('La serie debe tener al menos 2 observaciones para calcular retornos');
        }

        const validPoints = points
            .filter(p => p.price != null && !isNaN(p.price) && p.price > 0)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const returns = [];
        for (let i = 1; i < validPoints.length; i++) {
            const pPrev = Number(validPoints[i - 1].price);
            const pCur = Number(validPoints[i].price);
            const simpleReturn = (pCur - pPrev) / pPrev;
            const logReturn = Math.log(pCur / pPrev);

            returns.push({
                date: validPoints[i].date,
                prevDate: validPoints[i - 1].date,
                prevPrice: pPrev,
                price: pCur,
                simpleReturn,
                logReturn,
                squaredLogReturn: logReturn * logReturn
            });
        }

        return {
            points: validPoints,
            returns,
            datasetHash: this.computeDatasetHash(validPoints)
        };
    }

    /**
     * Compute comprehensive statistical properties on series returns
     */
    static computeDescriptiveStatistics(returns) {
        const n = returns.length;
        if (n < 10) throw new Error('Insuficientes observaciones para análisis estadístico');

        const logVals = returns.map(r => r.logReturn);
        const sorted = [...logVals].sort((a, b) => a - b);

        // Mean & Median
        const mean = logVals.reduce((a, b) => a + b, 0) / n;
        const median = n % 2 === 0
            ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
            : sorted[Math.floor(n / 2)];

        // Variance & Standard Deviation
        const variance = logVals.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        const annualizedVol = stdDev * Math.sqrt(252);

        // Skewness (b1) & Kurtosis (b2)
        const m3 = logVals.reduce((acc, r) => acc + Math.pow(r - mean, 3), 0) / n;
        const m4 = logVals.reduce((acc, r) => acc + Math.pow(r - mean, 4), 0) / n;
        const skewness = m3 / Math.pow(variance, 1.5);
        const kurtosis = m4 / Math.pow(variance, 2);
        const excessKurtosis = kurtosis - 3.0;

        // Autocorrelations ACF(k)
        const acf = {};
        const lags = [1, 2, 3, 5, 10, 20];
        let denomAcf = 0;
        for (let i = 0; i < n; i++) denomAcf += Math.pow(logVals[i] - mean, 2);

        for (const lag of lags) {
            if (lag < n) {
                let num = 0;
                for (let i = lag; i < n; i++) {
                    num += (logVals[i] - mean) * (logVals[i - lag] - mean);
                }
                acf[`lag_${lag}`] = denomAcf > 0 ? num / denomAcf : 0;
            }
        }

        // Squared returns ACF (proxy for volatility clustering)
        const sqVals = logVals.map(r => r * r);
        const sqMean = sqVals.reduce((a, b) => a + b, 0) / n;
        let denomSq = 0;
        for (let i = 0; i < n; i++) denomSq += Math.pow(sqVals[i] - sqMean, 2);

        const acfSquared = {};
        for (const lag of [1, 2, 5]) {
            if (lag < n) {
                let num = 0;
                for (let i = lag; i < n; i++) {
                    num += (sqVals[i] - sqMean) * (sqVals[i - lag] - sqMean);
                }
                acfSquared[`lag_${lag}`] = denomSq > 0 ? num / denomSq : 0;
            }
        }

        // Engle ARCH-LM Test (Lag 1)
        // Regress e_t^2 on e_{t-1}^2 where e_t = r_t - mean
        const e2 = logVals.map(r => Math.pow(r - mean, 2));
        const e2Mean = e2.reduce((a, b) => a + b, 0) / n;
        let e2Cov = 0, e2VarPrev = 0;
        for (let i = 1; i < n; i++) {
            e2Cov += (e2[i] - e2Mean) * (e2[i - 1] - e2Mean);
            e2VarPrev += Math.pow(e2[i - 1] - e2Mean, 2);
        }
        const alpha1 = e2VarPrev > 0 ? e2Cov / e2VarPrev : 0;
        const alpha0 = e2Mean - alpha1 * e2Mean;

        let tss = 0, ess = 0;
        for (let i = 1; i < n; i++) {
            const pred = alpha0 + alpha1 * e2[i - 1];
            ess += Math.pow(pred - e2Mean, 2);
            tss += Math.pow(e2[i] - e2Mean, 2);
        }
        const r2 = tss > 0 ? ess / tss : 0;
        const archLmStatistic = (n - 1) * r2;
        const archLmPValue = chiSquare1Survival(archLmStatistic);

        // Augmented Dickey-Fuller (ADF) test approximation on returns (checking stationarity)
        // Delta y_t = gamma * y_{t-1} + error
        let sumYPrevSq = 0, sumYPrevDy = 0, sumDySq = 0;
        for (let i = 1; i < n; i++) {
            const yPrev = logVals[i - 1];
            const dy = logVals[i] - logVals[i - 1];
            sumYPrevSq += yPrev * yPrev;
            sumYPrevDy += yPrev * dy;
            sumDySq += dy * dy;
        }
        const gamma = sumYPrevSq > 0 ? sumYPrevDy / sumYPrevSq : 0;
        let s2 = 0;
        for (let i = 1; i < n; i++) {
            const dy = logVals[i] - logVals[i - 1];
            const res = dy - gamma * logVals[i - 1];
            s2 += res * res;
        }
        s2 = s2 / (n - 2);
        const seGamma = Math.sqrt(s2 / (sumYPrevSq || 1));
        const adfTStat = seGamma > 0 ? gamma / seGamma : 0;
        const isStationaryReturns = adfTStat < -2.86; // 5% critical value

        // Structural Break Detection (2003-2004 Dominican crisis spike identification)
        const structuralBreaks = this.detectStructuralBreaks(returns);

        return {
            observationsCount: n,
            mean,
            median,
            variance,
            stdDev,
            annualizedVolatility: annualizedVol,
            skewness,
            kurtosis,
            excessKurtosis,
            acf,
            acfSquared,
            archLm: {
                statistic: archLmStatistic,
                pValue: archLmPValue,
                hasVolatilityClustering: archLmPValue < 0.05
            },
            stationarity: {
                adfTStat,
                criticalValue5Pct: -2.86,
                isStationary: isStationaryReturns
            },
            structuralBreaks
        };
    }

    /**
     * Detect structural volatility regime shifts (specifically Dominican banking crisis)
     */
    static detectStructuralBreaks(returns) {
        const windowSize = 60;
        const breaks = [];
        if (returns.length < windowSize * 2) return breaks;

        // Calculate rolling 60-day standard deviation
        for (let i = windowSize; i < returns.length - windowSize; i += 20) {
            const sub = returns.slice(i - windowSize, i).map(r => r.logReturn);
            const m = sub.reduce((a, b) => a + b, 0) / windowSize;
            const v = sub.reduce((acc, r) => acc + Math.pow(r - m, 2), 0) / (windowSize - 1);
            const s = Math.sqrt(v);

            // Dominican historical daily vol baseline is ~0.60%. A rolling vol > 1.8% indicates severe regime break
            if (s > 0.018) {
                const date = returns[i].date;
                const year = parseInt(date.substring(0, 4), 10);
                breaks.push({
                    date,
                    rollingVolAnnualized: s * Math.sqrt(252),
                    episode: (year === 2003 || year === 2004) ? 'CRISIS_BANCARIA_DOMINICANA_2003_2004' : 'VOLATILITY_SPIKE'
                });
            }
        }

        // Return peak break event if found
        if (breaks.length > 0) {
            breaks.sort((a, b) => b.rollingVolAnnualized - a.rollingVolAnnualized);
            return breaks.slice(0, 3);
        }
        return [];
    }
}
