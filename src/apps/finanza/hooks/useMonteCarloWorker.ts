/**
 * useMonteCarloWorker Hook
 * 
 * Provides a unified interface for running Monte Carlo simulations,
 * automatically using Web Worker when available with synchronous fallback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    runMonteCarloSimulation,
    getOrCreateSeed,
    SimulationResult,
    MonteCarloOptions
} from '../utils/monteCarlo';

// Import worker using Vite's worker syntax
import MonteCarloWorker from '../workers/monteCarlo.worker?worker';

interface WorkerInput {
    incomeHistory: number[];
    expenseHistory: number[];
    iterations: number;
    seed: string;
    dataHash: string;
}

interface WorkerOutput {
    type: 'result' | 'error' | 'progress';
    result?: SimulationResult;
    error?: string;
    progress?: number;
}

interface UseMonteCarloResult {
    result: SimulationResult | null;
    isLoading: boolean;
    progress: number;
    error: string | null;
    isWorkerEnabled: boolean;
    runSimulation: (
        incomeHistory: number[],
        expenseHistory: number[],
        options?: MonteCarloOptions
    ) => void;
}

// Check if Web Workers are supported
const isWorkerSupported = typeof Worker !== 'undefined';

/**
 * Hook for running Monte Carlo simulations with Web Worker support.
 * Automatically falls back to synchronous execution if workers are unavailable.
 */
export function useMonteCarloWorker(): UseMonteCarloResult {
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isWorkerEnabled, setIsWorkerEnabled] = useState(false);

    const workerRef = useRef<Worker | null>(null);

    // Initialize worker on mount
    useEffect(() => {
        if (!isWorkerSupported) {
            console.log('[useMonteCarloWorker] Web Workers not supported, using fallback');
            return;
        }

        try {
            workerRef.current = new MonteCarloWorker();
            setIsWorkerEnabled(true);
            console.log('[useMonteCarloWorker] Web Worker initialized');
        } catch (err) {
            console.warn('[useMonteCarloWorker] Failed to create worker:', err);
            setIsWorkerEnabled(false);
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    const runSimulation = useCallback((
        incomeHistory: number[],
        expenseHistory: number[],
        options: MonteCarloOptions = {}
    ) => {
        const { iterations = 2000, seed: customSeed, dataHash = '' } = options;
        const seed = customSeed || getOrCreateSeed();

        setIsLoading(true);
        setProgress(0);
        setError(null);

        // Use worker if available
        if (workerRef.current && isWorkerEnabled) {
            const input: WorkerInput = {
                incomeHistory,
                expenseHistory,
                iterations,
                seed,
                dataHash
            };

            const handleMessage = (event: MessageEvent<WorkerOutput>) => {
                const { type, result: workerResult, error: workerError, progress: workerProgress } = event.data;

                if (type === 'progress' && typeof workerProgress === 'number') {
                    setProgress(workerProgress);
                } else if (type === 'result' && workerResult) {
                    setResult(workerResult);
                    setIsLoading(false);
                    setProgress(100);
                } else if (type === 'error') {
                    setError(workerError || 'Unknown worker error');
                    setIsLoading(false);
                    // Fallback to sync execution
                    console.warn('[useMonteCarloWorker] Worker error, using fallback');
                    const fallbackResult = runMonteCarloSimulation(incomeHistory, expenseHistory, options);
                    setResult(fallbackResult);
                }
            };

            workerRef.current.onmessage = handleMessage;
            workerRef.current.onerror = (err) => {
                console.error('[useMonteCarloWorker] Worker error:', err);
                setError('Worker execution error');
                setIsLoading(false);
                // Fallback
                const fallbackResult = runMonteCarloSimulation(incomeHistory, expenseHistory, options);
                setResult(fallbackResult);
            };

            workerRef.current.postMessage(input);
        } else {
            // Synchronous fallback
            try {
                const syncResult = runMonteCarloSimulation(incomeHistory, expenseHistory, options);
                setResult(syncResult);
                setProgress(100);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Simulation failed');
            } finally {
                setIsLoading(false);
            }
        }
    }, [isWorkerEnabled]);

    return {
        result,
        isLoading,
        progress,
        error,
        isWorkerEnabled,
        runSimulation
    };
}

export default useMonteCarloWorker;
