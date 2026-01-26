/**
 * Monte Carlo Simulation Utility for Financial Projections
 */

interface SimulationStats {
    mean: number;
    stdDev: number;
}

interface SimulationResult {
    p10: number; // Worst case (10th percentile)
    p50: number; // Median case
    p90: number; // Best case (90th percentile)
    riskOfDeficit: number; // Probability expenses > income
    simulations: number[]; // All simulation results (optional, for histograms)
}

/**
 * Calculates Mean and Standard Deviation from a dataset
 */
export const calculateStatistics = (values: number[]): SimulationStats => {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Variance = Sum((x - mean)^2) / n
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
};

/**
 * Generates a random number with Normal Distribution (Gaussian)
 * using Box-Muller transform
 */
const randomNormal = (mean: number, stdDev: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
};

/**
 * Runs the Monte Carlo Simulation
 * @param incomeHistory Array of historical income totals per cycle
 * @param expenseHistory Array of historical expense totals per cycle
 * @param iterations Number of simulations to run (default 1000)
 */
export const runMonteCarloSimulation = (
    incomeHistory: number[],
    expenseHistory: number[],
    iterations: number = 2000
): SimulationResult => {
    // 1. Get stats from history
    // If we have too little data, we assume a small default volatility (5%)
    let incomeStats = calculateStatistics(incomeHistory);
    let expenseStats = calculateStatistics(expenseHistory);

    if (incomeHistory.length < 2) incomeStats = { mean: incomeStats.mean || 0, stdDev: incomeStats.mean * 0.05 };
    if (expenseHistory.length < 2) expenseStats = { mean: expenseStats.mean || 0, stdDev: expenseStats.mean * 0.05 };

    const results: number[] = [];
    let deficitCount = 0;

    // 2. Run Simulations
    for (let i = 0; i < iterations; i++) {
        // Simulate next month's totals based on history + volatility
        const simIncome = Math.max(0, randomNormal(incomeStats.mean, incomeStats.stdDev));
        const simExpense = Math.max(0, randomNormal(expenseStats.mean, expenseStats.stdDev));

        const balance = simIncome - simExpense;
        results.push(balance);

        if (balance < 0) {
            deficitCount++;
        }
    }

    // 3. Sort results to find percentiles
    results.sort((a, b) => a - b);

    const p10Index = Math.floor(iterations * 0.1);
    const p50Index = Math.floor(iterations * 0.5);
    const p90Index = Math.floor(iterations * 0.9);

    return {
        p10: Math.round(results[p10Index]),
        p50: Math.round(results[p50Index]),
        p90: Math.round(results[p90Index]),
        riskOfDeficit: Math.round((deficitCount / iterations) * 100),
        simulations: results
    };
};
