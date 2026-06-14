/**
 * econometricsService.js — Quantitative financial analysis engine for MagnusOS2.
 * 
 * Implements three econometric models in pure JavaScript:
 * 1. Marginal Propensity to Consume (MPC/PMC) — OLS Linear Regression
 * 2. 30-Day Liquidity Forecast — Additive seasonal decomposition with confidence bands
 * 3. Residual Anomaly Detection — Multi-variable regression with z-score flagging
 * 
 * All calculations are performed server-side without external Python dependencies.
 */

// ========================================
// 1. OLS Linear Regression (Foundation)
// ========================================

/**
 * Ordinary Least Squares (OLS) simple linear regression.
 * Fits y = α + βx + ε
 * 
 * @param {number[]} x - Independent variable array
 * @param {number[]} y - Dependent variable array
 * @returns {{ alpha: number, beta: number, rSquared: number, standardError: number, pValue: number }}
 */
export const olsRegression = (x, y) => {
    const n = x.length;
    if (n < 3) {
        return { alpha: 0, beta: 0, rSquared: 0, standardError: 0, pValue: 1 };
    }

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) {
        return { alpha: meanY, beta: 0, rSquared: 0, standardError: 0, pValue: 1 };
    }

    const beta = (n * sumXY - sumX * sumY) / denominator;
    const alpha = meanY - beta * meanX;

    // R² (coefficient of determination)
    const ssRes = y.reduce((acc, yi, i) => {
        const predicted = alpha + beta * x[i];
        return acc + (yi - predicted) ** 2;
    }, 0);
    const ssTot = y.reduce((acc, yi) => acc + (yi - meanY) ** 2, 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // Standard error of the estimate
    const standardError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

    // Approximate p-value via t-statistic for the slope
    const seBeta = denominator > 0
        ? standardError / Math.sqrt(sumXX - (sumX * sumX) / n)
        : 0;
    const tStat = seBeta > 0 ? Math.abs(beta / seBeta) : 0;
    // Approximate p-value using the survival function of Student's t-distribution
    const pValue = approximatePValue(tStat, n - 2);

    return { alpha, beta, rSquared, standardError, pValue };
};

/**
 * Approximate two-tailed p-value from t-statistic using the normal approximation.
 * Suitable for n > 30; for smaller n, values are conservative.
 * @param {number} t - t-statistic
 * @param {number} df - degrees of freedom
 * @returns {number} approximate p-value
 */
const approximatePValue = (t, df) => {
    if (df <= 0 || !isFinite(t)) return 1;
    // For large df, t ~ N(0,1); use complementary error function approximation
    const z = t * (1 - 1 / (4 * df)) * Math.sqrt(1 + t * t / (2 * df)) ** -1;
    // Standard normal CDF approximation (Abramowitz & Stegun)
    const p = 0.5 * erfc(z / Math.SQRT2);
    return Math.min(1, 2 * p); // Two-tailed
};

/**
 * Complementary error function approximation.
 * Uses rational approximation from Abramowitz & Stegun, Handbook of Mathematical Functions.
 */
const erfc = (x) => {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    const absX = Math.abs(x);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 1 - sign * y;
};

// ========================================
// 2. Marginal Propensity to Consume (MPC)
// ========================================

/**
 * Calculates the Marginal Propensity to Consume (MPC / PMC).
 * Performs OLS regression of monthly consumption on monthly income:
 *   C_m = α + β * Y_m + ε
 * 
 * β (beta) represents the fraction of each additional peso of income that is consumed.
 * β = 0.80 means 80 centavos of every extra peso are spent.
 * 
 * @param {{ month: string, income: number, expense: number }[]} monthlyData 
 *   Array of monthly aggregates with income and expense totals.
 * @returns {{ beta: number, alpha: number, rSquared: number, pValue: number, 
 *             mps: number, interpretation: string, dataPoints: number }}
 */
export const calculateMPC = (monthlyData) => {
    // Filter out months with zero income (can't regress consumption on zero income)
    const validData = monthlyData.filter(d => d.income > 0 && d.expense >= 0);

    if (validData.length < 3) {
        return {
            beta: 0,
            alpha: 0,
            rSquared: 0,
            pValue: 1,
            mps: 1,
            interpretation: 'Datos insuficientes (se requieren al menos 3 meses con ingresos).',
            dataPoints: validData.length
        };
    }

    const incomes = validData.map(d => d.income);
    const expenses = validData.map(d => d.expense);

    const { alpha, beta, rSquared, pValue } = olsRegression(incomes, expenses);

    // Clamp beta to [0, 1] for economic interpretation
    const clampedBeta = Math.max(0, Math.min(1, beta));
    const mps = Math.max(0, 1 - clampedBeta); // Marginal Propensity to Save

    let interpretation = '';
    if (clampedBeta >= 0.90) {
        interpretation = 'Alerta Crítica: Consumes más del 90% de cada peso adicional. Riesgo alto de vulnerabilidad financiera.';
    } else if (clampedBeta >= 0.75) {
        interpretation = 'Atención: Tu consumo absorbe una porción significativa de tus ingresos extras. Hay margen de mejora.';
    } else if (clampedBeta >= 0.50) {
        interpretation = 'Equilibrado: Destinas una proporción saludable entre consumo y ahorro.';
    } else {
        interpretation = 'Excelente: Tu disciplina de ahorro es superior. Cada peso extra se capitaliza mayoritariamente.';
    }

    return {
        beta: Number(clampedBeta.toFixed(4)),
        alpha: Number(alpha.toFixed(2)),
        rSquared: Number(rSquared.toFixed(4)),
        pValue: Number(pValue.toFixed(4)),
        mps: Number(mps.toFixed(4)),
        interpretation,
        dataPoints: validData.length
    };
};

// ========================================
// 3. 30-Day Liquidity Forecast
// ========================================

/**
 * Generates a 30-day forward liquidity forecast with 95% confidence bands.
 * Uses additive seasonal decomposition:
 *   forecast(t+h) = trend(t+h) + seasonal(dayOfWeek) 
 *   CI = forecast ± 1.96 * σ_e * √h
 * 
 * @param {{ date: string, netFlow: number }[]} dailyData 
 *   Array of daily net flows (income - expenses). Sorted by date ASC.
 * @param {number} currentBalance - Current account balance.
 * @returns {{ forecast: Array, summary: { minBalance: number, riskDate: string|null, 
 *             avgDailyBurn: number, daysUntilCritical: number|null } }}
 */
export const forecastLiquidity = (dailyData, currentBalance = 0) => {
    if (dailyData.length < 14) {
        return {
            forecast: [],
            summary: {
                minBalance: currentBalance,
                riskDate: null,
                avgDailyBurn: 0,
                daysUntilCritical: null,
                confidence: 'low',
                dataPoints: dailyData.length
            }
        };
    }

    // Sort by date
    const sorted = [...dailyData].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Extract net flows as numeric series
    const flows = sorted.map(d => d.netFlow);
    const n = flows.length;

    // Step 1: Compute linear trend via OLS
    const xIndices = Array.from({ length: n }, (_, i) => i);
    const { alpha: trendIntercept, beta: trendSlope, standardError } = olsRegression(xIndices, flows);

    // Step 2: Compute day-of-week seasonal factors (7 buckets)
    const seasonalSums = new Array(7).fill(0);
    const seasonalCounts = new Array(7).fill(0);

    sorted.forEach((d, i) => {
        const dayOfWeek = new Date(d.date).getDay();
        const trendValue = trendIntercept + trendSlope * i;
        const detrended = d.netFlow - trendValue;
        seasonalSums[dayOfWeek] += detrended;
        seasonalCounts[dayOfWeek] += 1;
    });

    const seasonalFactors = seasonalSums.map((sum, i) =>
        seasonalCounts[i] > 0 ? sum / seasonalCounts[i] : 0
    );

    // Center seasonal factors (sum should be ~0)
    const seasonalMean = seasonalFactors.reduce((a, b) => a + b, 0) / 7;
    const centeredSeasonals = seasonalFactors.map(f => f - seasonalMean);

    // Step 3: Generate 30-day forecast
    const forecast = [];
    let cumulativeBalance = currentBalance;
    let minBalance = currentBalance;
    let riskDate = null;
    const SAFETY_THRESHOLD = 0; // Can be configured

    const lastDate = new Date(sorted[n - 1].date);

    for (let h = 1; h <= 30; h++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + h);
        const dayOfWeek = futureDate.getDay();

        // Predicted net flow for day n+h
        const trendValue = trendIntercept + trendSlope * (n + h - 1);
        const seasonalValue = centeredSeasonals[dayOfWeek];
        const predictedFlow = trendValue + seasonalValue;

        // 95% confidence interval widens with forecast horizon
        const ciWidth = 1.96 * standardError * Math.sqrt(h);

        cumulativeBalance += predictedFlow;

        const dayData = {
            date: futureDate.toISOString().slice(0, 10),
            dayOfWeek,
            predictedFlow: Number(predictedFlow.toFixed(2)),
            balance: Number(cumulativeBalance.toFixed(2)),
            upperBound: Number((cumulativeBalance + ciWidth).toFixed(2)),
            lowerBound: Number((cumulativeBalance - ciWidth).toFixed(2)),
            horizon: h
        };

        forecast.push(dayData);

        if (cumulativeBalance < minBalance) {
            minBalance = cumulativeBalance;
        }
        if (cumulativeBalance - ciWidth <= SAFETY_THRESHOLD && !riskDate) {
            riskDate = dayData.date;
        }
    }

    // Average daily burn rate (net outflow)
    const totalFlow = flows.reduce((a, b) => a + b, 0);
    const avgDailyBurn = Number((totalFlow / n).toFixed(2));

    // Days until balance reaches 0 (linear extrapolation)
    const daysUntilCritical = avgDailyBurn < 0
        ? Math.ceil(currentBalance / Math.abs(avgDailyBurn))
        : null;

    return {
        forecast,
        summary: {
            minBalance: Number(minBalance.toFixed(2)),
            riskDate,
            avgDailyBurn,
            daysUntilCritical,
            confidence: n >= 60 ? 'high' : n >= 30 ? 'medium' : 'low',
            dataPoints: n
        }
    };
};

// ========================================
// 4. Residual Anomaly Detection
// ========================================

/**
 * Detects spending anomalies by fitting a regression model per category
 * and flagging residuals beyond 2 standard deviations.
 * 
 * Model per category: E_d = β0 + β1*day_index + β2*isWeekend + ε
 * Anomaly: |ε_d| > 2σ
 * 
 * @param {{ date: string, category: string, amount: number }[]} expenseData 
 *   Array of individual expense records.
 * @param {number} lookbackDays - How many days of history to analyze (default: 90)
 * @param {number} detectDays - How many recent days to check for anomalies (default: 7)
 * @returns {{ anomalies: Array, categorySummaries: Object }}
 */
export const detectAnomalies = (expenseData, lookbackDays = 90, detectDays = 7) => {
    if (expenseData.length < 10) {
        return { anomalies: [], categorySummaries: {} };
    }

    const now = new Date();
    const lookbackDate = new Date(now);
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
    const detectDate = new Date(now);
    detectDate.setDate(detectDate.getDate() - detectDays);

    // Filter to lookback window
    const windowData = expenseData.filter(d => {
        const date = new Date(d.date);
        return date >= lookbackDate && date <= now;
    });

    // Group by category
    const byCategory = {};
    windowData.forEach(d => {
        const cat = d.category || 'Otros';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(d);
    });

    const anomalies = [];
    const categorySummaries = {};

    // Aggregate daily totals per category
    for (const [category, records] of Object.entries(byCategory)) {
        // Aggregate to daily totals
        const dailyTotals = {};
        records.forEach(r => {
            if (!dailyTotals[r.date]) dailyTotals[r.date] = 0;
            dailyTotals[r.date] += r.amount;
        });

        const dates = Object.keys(dailyTotals).sort();
        if (dates.length < 5) continue; // Need minimum data points

        const firstDate = new Date(dates[0]);

        // Build regression variables
        const dayIndices = dates.map(d => {
            return (new Date(d) - firstDate) / (1000 * 60 * 60 * 24);
        });
        const isWeekend = dates.map(d => {
            const dow = new Date(d).getDay();
            return (dow === 0 || dow === 6) ? 1 : 0;
        });
        const amounts = dates.map(d => dailyTotals[d]);

        // Simple OLS on day_index (β1)
        const { alpha: b0, beta: b1, standardError } = olsRegression(dayIndices, amounts);

        // Calculate weekend effect as average deviation
        let weekendSum = 0;
        let weekendCount = 0;
        let weekdaySum = 0;
        let weekdayCount = 0;
        dates.forEach((d, i) => {
            const predicted = b0 + b1 * dayIndices[i];
            const residual = amounts[i] - predicted;
            if (isWeekend[i]) {
                weekendSum += residual;
                weekendCount++;
            } else {
                weekdaySum += residual;
                weekdayCount++;
            }
        });
        const weekendEffect = weekendCount > 0 ? weekendSum / weekendCount : 0;

        // Calculate residuals with weekend adjustment
        const residuals = dates.map((d, i) => {
            const predicted = b0 + b1 * dayIndices[i] + (isWeekend[i] ? weekendEffect : 0);
            return amounts[i] - predicted;
        });

        // Standard deviation of residuals
        const meanResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length;
        const variance = residuals.reduce((acc, r) => acc + (r - meanResidual) ** 2, 0) / residuals.length;
        const sigma = Math.sqrt(variance);

        // Store category summary
        const avgDaily = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        categorySummaries[category] = {
            avgDaily: Number(avgDaily.toFixed(2)),
            sigma: Number(sigma.toFixed(2)),
            trend: Number(b1.toFixed(4)),
            weekendEffect: Number(weekendEffect.toFixed(2)),
            dataPoints: dates.length
        };

        // Detect anomalies in the recent detection window
        dates.forEach((d, i) => {
            const dateObj = new Date(d);
            if (dateObj < detectDate) return; // Only flag recent days

            if (sigma > 0) {
                const zScore = residuals[i] / sigma;
                if (Math.abs(zScore) > 2) {
                    const predicted = b0 + b1 * dayIndices[i] + (isWeekend[i] ? weekendEffect : 0);
                    anomalies.push({
                        date: d,
                        category,
                        amountActual: Number(amounts[i].toFixed(2)),
                        amountExpected: Number(predicted.toFixed(2)),
                        residual: Number(residuals[i].toFixed(2)),
                        zScore: Number(zScore.toFixed(2)),
                        description: zScore > 0
                            ? `Gasto en "${category}" superó la tendencia estadística por ${Math.abs(zScore).toFixed(1)}σ.`
                            : `Gasto en "${category}" fue inusualmente bajo (${Math.abs(zScore).toFixed(1)}σ por debajo).`
                    });
                }
            }
        });
    }

    // Sort anomalies by z-score descending (most extreme first)
    anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

    return { anomalies, categorySummaries };
};

// ========================================
// 5. Aggregate Monthly Data Helper
// ========================================

/**
 * Aggregates daily transactions into monthly income/expense totals.
 * Used as input for MPC calculation.
 * 
 * @param {Array} dailyTransactions - Raw daily transaction records
 * @returns {{ month: string, income: number, expense: number }[]}
 */
export const aggregateMonthly = (dailyTransactions) => {
    const monthlyMap = {};

    dailyTransactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthlyMap[month]) {
            monthlyMap[month] = { month, income: 0, expense: 0 };
        }

        const isIncome = t.type === 'income' || t.type === 'ingreso';
        if (isIncome) {
            monthlyMap[month].income += amount;
        } else {
            monthlyMap[month].expense += Math.abs(amount);
        }
    });

    return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * Aggregates daily transactions into daily net flows (income - expenses).
 * Used as input for liquidity forecast.
 * 
 * @param {Array} dailyTransactions - Raw daily transaction records
 * @returns {{ date: string, netFlow: number }[]}
 */
export const aggregateDailyFlows = (dailyTransactions) => {
    const dailyMap = {};

    dailyTransactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        const date = t.date.substring(0, 10);
        if (!dailyMap[date]) {
            dailyMap[date] = { date, netFlow: 0 };
        }

        const isIncome = t.type === 'income' || t.type === 'ingreso';
        dailyMap[date].netFlow += isIncome ? amount : -Math.abs(amount);
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Aggregates daily transactions into per-category expense records.
 * Used as input for anomaly detection.
 * 
 * @param {Array} dailyTransactions - Raw daily transaction records
 * @returns {{ date: string, category: string, amount: number }[]}
 */
export const aggregateExpensesByCategory = (dailyTransactions) => {
    return dailyTransactions
        .filter(t => {
            const isExpense = t.type === 'expense' || t.type === 'gasto';
            return isExpense && parseFloat(t.amount) > 0;
        })
        .map(t => ({
            date: t.date.substring(0, 10),
            category: t.category || t.description?.split(' ')[0] || 'Otros',
            amount: Math.abs(parseFloat(t.amount))
        }));
};
