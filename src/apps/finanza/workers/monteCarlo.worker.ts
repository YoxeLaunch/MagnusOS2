/**
 * Monte Carlo Web Worker
 * 
 * Offloads heavy Monte Carlo simulations to a background thread
 * to prevent UI freezing during calculations.
 * 
 * Uses Vite's native web worker support.
 */

// We need to inline the simulation logic since workers can't import from main thread
// This is a self-contained version of the Monte Carlo simulation

// ============================================================================
// TYPES (duplicated for worker isolation)
// ============================================================================

interface SimulationStats {
    mean: number;
    stdDev: number;
}

export interface SimulationResult {
    p10: number;
    p50: number;
    p90: number;
    riskOfDeficit: number;
    simulations: number[];
    seed: string;
}

export interface WorkerInput {
    incomeHistory: number[];
    expenseHistory: number[];
    iterations: number;
    seed: string;
    dataHash: string;
}

export interface WorkerOutput {
    type: 'result' | 'error' | 'progress';
    result?: SimulationResult;
    error?: string;
    progress?: number;
}

// ============================================================================
// SEEDED RANDOM (inline implementation - no external dependencies in workers)
// ============================================================================

/**
 * Simple seeded PRNG using Mulberry32 algorithm.
 * Fast and produces reasonable quality random numbers for simulation.
 */
function createSeededRandom(seed: string): () => number {
    // Hash the seed string to a number
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Mulberry32 PRNG
    return function () {
        let t = hash += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Creates a random normal generator using Box-Muller transform.
 */
function createRandomNormalGenerator(seed: string) {
    const rng = createSeededRandom(seed);

    return (mean: number, stdDev: number): number => {
        const u1 = rng();
        const u2 = rng();

        const safeU1 = Math.max(u1, Number.MIN_VALUE);

        const z0 = Math.sqrt(-2.0 * Math.log(safeU1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    };
}

// ============================================================================
// STATISTICS
// ============================================================================

function calculateStatistics(values: number[]): SimulationStats {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
}

// ============================================================================
// SIMULATION CORE
// ============================================================================

function runSimulation(input: WorkerInput): SimulationResult {
    const { incomeHistory, expenseHistory, iterations, seed, dataHash } = input;

    const effectiveSeed = dataHash ? `${seed}-${dataHash}` : seed;
    const randomNormal = createRandomNormalGenerator(effectiveSeed);

    // Get stats from history
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

    // Run simulations with progress reporting
    const progressInterval = Math.floor(iterations / 10);

    for (let i = 0; i < iterations; i++) {
        const simIncome = Math.max(0, randomNormal(incomeStats.mean, incomeStats.stdDev));
        const simExpense = Math.max(0, randomNormal(expenseStats.mean, expenseStats.stdDev));

        const balance = simIncome - simExpense;
        results.push(balance);

        if (balance < 0) {
            deficitCount++;
        }

        // Report progress every 10%
        if (progressInterval > 0 && i % progressInterval === 0) {
            self.postMessage({
                type: 'progress',
                progress: Math.round((i / iterations) * 100)
            } as WorkerOutput);
        }
    }

    // Sort and calculate percentiles
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
}

// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================

self.onmessage = (event: MessageEvent<WorkerInput>) => {
    try {
        const result = runSimulation(event.data);
        self.postMessage({
            type: 'result',
            result
        } as WorkerOutput);
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error in worker'
        } as WorkerOutput);
    }
};

// Signal that worker is ready
self.postMessage({ type: 'progress', progress: 0 } as WorkerOutput);
