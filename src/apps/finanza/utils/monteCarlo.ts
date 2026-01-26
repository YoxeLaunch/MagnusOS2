/**
 * Monte Carlo Simulation Utility for Financial Projections
 * 
 * UPDATED: Now uses seedrandom for reproducible simulations.
 * The same seed produces identical results across page refreshes.
 */

import seedrandom from 'seedrandom';

// ============================================================================
// TYPES
// ============================================================================

interface SimulationStats {
    mean: number;
    stdDev: number;
}

export interface SimulationResult {
    p10: number; // Worst case (10th percentile)
    p50: number; // Median case
    p90: number; // Best case (90th percentile)
    riskOfDeficit: number; // Probability expenses > income
    simulations: number[]; // All simulation results (optional, for histograms)
    seed: string; // The seed used for this simulation
}

// ============================================================================
// SEED MANAGEMENT
// ============================================================================

const SEED_KEY = 'magnus_mc_seed';

/**
 * Gets or creates a stable seed for Monte Carlo simulations.
 * The seed is persisted in localStorage so results are reproducible
 * across page refreshes until the user clears storage or data changes.
 * 
 * @returns A stable seed string
 */
export const getOrCreateSeed = (): string => {
    // Handle SSR/test environments without localStorage
    if (typeof window === 'undefined' || !window.localStorage) {
        return 'server-fallback-seed-' + Date.now();
    }

    try {
        let seed = localStorage.getItem(SEED_KEY);
        if (!seed) {
            // Generate a new seed using crypto if available, otherwise fallback
            seed = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'mc-' + Date.now() + '-' + Math.random().toString(36).slice(2);
            localStorage.setItem(SEED_KEY, seed);
        }
        return seed;
    } catch {
        // localStorage might be blocked (private browsing, etc.)
        return 'fallback-seed-' + Date.now();
    }
};

/**
 * Resets the Monte Carlo seed, forcing new random results on next simulation.
 * Useful for testing or when user wants fresh predictions.
 */
export const resetSeed = (): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            localStorage.removeItem(SEED_KEY);
        } catch {
            // Ignore storage errors
        }
    }
};

/**
 * Creates a combined seed from the base seed and data hash.
 * This ensures that different data produces different results,
 * but the same data always produces the same results.
 * 
 * @param baseSeed The persistent user seed
 * @param dataHash A hash of the input data
 */
export const createCombinedSeed = (baseSeed: string, dataHash: string): string => {
    return `${baseSeed}-${dataHash}`;
};

// ============================================================================
// STATISTICS
// ============================================================================

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

// ============================================================================
// RANDOM NUMBER GENERATION
// ============================================================================

/**
 * Creates a seeded random normal generator using Box-Muller transform.
 * Returns a function that generates normally distributed random numbers.
 * 
 * @param seed The seed for reproducibility
 */
const createRandomNormalGenerator = (seed: string) => {
    const rng = seedrandom(seed);

    return (mean: number, stdDev: number): number => {
        const u1 = rng();
        const u2 = rng();

        // Avoid log(0) which produces -Infinity
        const safeU1 = Math.max(u1, Number.MIN_VALUE);

        const z0 = Math.sqrt(-2.0 * Math.log(safeU1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    };
};

// ============================================================================
// SIMULATION
// ============================================================================

export interface MonteCarloOptions {
    /** Number of simulations to run (default: 2000) */
    iterations?: number;
    /** Custom seed (default: auto-generated from localStorage) */
    seed?: string;
    /** Data hash for cache key generation */
    dataHash?: string;
}

/**
 * Runs the Monte Carlo Simulation with reproducible results.
 * 
 * @param incomeHistory Array of historical income totals per cycle
 * @param expenseHistory Array of historical expense totals per cycle
 * @param options Simulation options
 * @returns SimulationResult with percentiles and risk metrics
 */
export const runMonteCarloSimulation = (
    incomeHistory: number[],
    expenseHistory: number[],
    options: MonteCarloOptions | number = {}
): SimulationResult => {
    // Handle legacy call signature where 3rd param was iterations
    const opts: MonteCarloOptions = typeof options === 'number'
        ? { iterations: options }
        : options;

    const {
        iterations = 2000,
        seed: customSeed,
        dataHash = ''
    } = opts;

    // Get or create seed
    const baseSeed = customSeed || getOrCreateSeed();
    const effectiveSeed = dataHash ? createCombinedSeed(baseSeed, dataHash) : baseSeed;

    // Create seeded random generator
    const randomNormal = createRandomNormalGenerator(effectiveSeed);

    // 1. Get stats from history
    // If we have too little data, we assume a small default volatility (5%)
    let incomeStats = calculateStatistics(incomeHistory);
    let expenseStats = calculateStatistics(expenseHistory);

    if (incomeHistory.length < 2) {
        incomeStats = { mean: incomeStats.mean || 0, stdDev: incomeStats.mean * 0.05 };
    }
    if (expenseHistory.length < 2) {
        expenseStats = { mean: expenseStats.mean || 0, stdDev: expenseStats.mean * 0.05 };
    }

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
        simulations: results,
        seed: effectiveSeed
    };
};
