/**
 * Data Quality Utilities for Financial Predictions
 * 
 * This module provides functions to validate, clean, and sanitize transaction data
 * before feeding it into prediction models (Linear Regression, Monte Carlo).
 * 
 * Key features:
 * - Winsorization: Cap extreme values at configurable percentiles
 * - Outlier detection: Flag values beyond Z-score threshold
 * - Date validation: Filter future dates and handle duplicates
 * - Zero amount filtering: Remove $0 transactions that skew averages
 */

import { DailyTransaction } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface SanitizeResult {
    /** Cleaned transactions ready for model consumption */
    clean: DailyTransaction[];
    /** Transactions that were dropped with reasons */
    dropped: Array<{ transaction: DailyTransaction; reason: string }>;
    /** Non-critical warnings (e.g., potential outliers) */
    warnings: string[];
}

export interface WinsorizeResult {
    /** Values with extremes capped */
    valuesWinsorized: number[];
    /** The bounds used for capping */
    bounds: { lower: number; upper: number };
    /** Count of values that were capped */
    cappedCount: { lower: number; upper: number };
}

export interface OutlierDetectionResult {
    /** Boolean array indicating if each value is an outlier */
    isOutlier: boolean[];
    /** Z-scores for each value */
    zScores: number[];
    /** Indices of outlier values */
    outlierIndices: number[];
}

export interface SanitizeOptions {
    /** Filter out transactions with zero amount (default: true) */
    filterZeroAmounts?: boolean;
    /** Filter out transactions with future dates (default: true) */
    filterFutureDates?: boolean;
    /** Mark outliers in warnings (default: true) */
    detectOutliers?: boolean;
    /** Z-score threshold for outlier detection (default: 3) */
    outlierZThreshold?: number;
    /** Reference date for future date filtering (default: now) */
    referenceDate?: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates the percentile value from a sorted array
 * @param sortedValues - MUST be pre-sorted in ascending order
 * @param percentile - Value between 0 and 1 (e.g., 0.05 for 5th percentile)
 */
export const getPercentile = (sortedValues: number[], percentile: number): number => {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];

    const index = percentile * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
        return sortedValues[lower];
    }

    // Linear interpolation between two closest values
    const fraction = index - lower;
    return sortedValues[lower] * (1 - fraction) + sortedValues[upper] * fraction;
};

/**
 * Calculates mean and standard deviation
 */
export const calculateStats = (values: number[]): { mean: number; stdDev: number } => {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    if (n === 1) return { mean, stdDev: 0 };

    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
};

/**
 * Parse date string safely, returning null for invalid dates
 */
const parseDate = (dateStr: string): Date | null => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Winsorizes an array of values by capping extremes at specified percentiles.
 * This reduces the impact of outliers without removing them entirely.
 * 
 * @param values - Array of numeric values
 * @param pLow - Lower percentile (default: 0.05 = 5th percentile)
 * @param pHigh - Upper percentile (default: 0.95 = 95th percentile)
 * @returns WinsorizeResult with capped values and statistics
 * 
 * @example
 * const result = winsorize([100, 200, 300, 10000], 0.05, 0.95);
 * // result.valuesWinsorized might be [100, 200, 300, ~385] depending on percentile calc
 */
export const winsorize = (
    values: number[],
    pLow: number = 0.05,
    pHigh: number = 0.95
): WinsorizeResult => {
    if (values.length === 0) {
        return {
            valuesWinsorized: [],
            bounds: { lower: 0, upper: 0 },
            cappedCount: { lower: 0, upper: 0 }
        };
    }

    // Create sorted copy for percentile calculation
    const sorted = [...values].sort((a, b) => a - b);

    const lowerBound = getPercentile(sorted, pLow);
    const upperBound = getPercentile(sorted, pHigh);

    let cappedLower = 0;
    let cappedUpper = 0;

    const valuesWinsorized = values.map(v => {
        if (v < lowerBound) {
            cappedLower++;
            return lowerBound;
        }
        if (v > upperBound) {
            cappedUpper++;
            return upperBound;
        }
        return v;
    });

    return {
        valuesWinsorized,
        bounds: { lower: lowerBound, upper: upperBound },
        cappedCount: { lower: cappedLower, upper: cappedUpper }
    };
};

/**
 * Detects outliers using Z-score method.
 * Values with |Z| > threshold are marked as outliers.
 * 
 * @param values - Array of numeric values
 * @param threshold - Z-score threshold (default: 3)
 * @returns OutlierDetectionResult with flags and z-scores
 * 
 * @example
 * const result = detectOutliersZ([100, 102, 98, 1000], 3);
 * // result.isOutlier = [false, false, false, true]
 */
export const detectOutliersZ = (
    values: number[],
    threshold: number = 3
): OutlierDetectionResult => {
    if (values.length < 2) {
        return {
            isOutlier: values.map(() => false),
            zScores: values.map(() => 0),
            outlierIndices: []
        };
    }

    const { mean, stdDev } = calculateStats(values);

    // If stdDev is 0, no variation = no outliers
    if (stdDev === 0) {
        return {
            isOutlier: values.map(() => false),
            zScores: values.map(() => 0),
            outlierIndices: []
        };
    }

    const zScores = values.map(v => (v - mean) / stdDev);
    const isOutlier = zScores.map(z => Math.abs(z) > threshold);
    const outlierIndices = isOutlier
        .map((is, idx) => (is ? idx : -1))
        .filter(idx => idx !== -1);

    return { isOutlier, zScores, outlierIndices };
};

/**
 * Sanitizes transaction data for prediction models.
 * This is the main entry point that combines all validation logic.
 * 
 * @param transactions - Raw transaction array
 * @param options - Sanitization options
 * @returns SanitizeResult with clean data, dropped items, and warnings
 * 
 * @example
 * const { clean, dropped, warnings } = sanitizeTransactions(rawData, {
 *   filterZeroAmounts: true,
 *   filterFutureDates: true,
 *   detectOutliers: true,
 *   outlierZThreshold: 3
 * });
 */
export const sanitizeTransactions = (
    transactions: DailyTransaction[] | undefined | null,
    options: SanitizeOptions = {}
): SanitizeResult => {
    const {
        filterZeroAmounts = true,
        filterFutureDates = true,
        detectOutliers = true,
        outlierZThreshold = 3,
        referenceDate = new Date()
    } = options;

    // Handle null/undefined input
    if (!transactions || transactions.length === 0) {
        return { clean: [], dropped: [], warnings: ['No transactions provided'] };
    }

    const clean: DailyTransaction[] = [];
    const dropped: Array<{ transaction: DailyTransaction; reason: string }> = [];
    const warnings: string[] = [];

    // Normalize reference date to start of day for fair comparison
    const refDateNormalized = new Date(referenceDate);
    refDateNormalized.setHours(23, 59, 59, 999);

    // Track seen transaction signatures for duplicate detection
    const seen = new Set<string>();

    for (const tx of transactions) {
        // 1. Validate ID exists
        if (tx.id === undefined || tx.id === null) {
            dropped.push({ transaction: tx, reason: 'Missing ID' });
            continue;
        }

        // 2. Validate and parse date
        const txDate = parseDate(tx.date);
        if (!txDate) {
            dropped.push({ transaction: tx, reason: `Invalid date format: ${tx.date}` });
            continue;
        }

        // 3. Filter future dates
        if (filterFutureDates && txDate > refDateNormalized) {
            dropped.push({ transaction: tx, reason: `Future date: ${tx.date}` });
            continue;
        }

        // 4. Validate amount is a number
        if (typeof tx.amount !== 'number' || isNaN(tx.amount)) {
            dropped.push({ transaction: tx, reason: `Invalid amount: ${tx.amount}` });
            continue;
        }

        // 5. Filter zero amounts
        if (filterZeroAmounts && tx.amount === 0) {
            dropped.push({ transaction: tx, reason: 'Zero amount' });
            continue;
        }

        // 6. Check for duplicates (by id + date + amount + type)
        const signature = `${tx.id}-${tx.date}-${tx.amount}-${tx.type}`;
        if (seen.has(signature)) {
            dropped.push({ transaction: tx, reason: 'Duplicate transaction' });
            continue;
        }
        seen.add(signature);

        // Transaction passed all validations
        clean.push(tx);
    }

    // 7. Detect outliers in the clean data and warn (but don't remove)
    if (detectOutliers && clean.length > 2) {
        const amounts = clean.map(tx => tx.amount);
        const { outlierIndices } = detectOutliersZ(amounts, outlierZThreshold);

        if (outlierIndices.length > 0) {
            outlierIndices.forEach(idx => {
                const tx = clean[idx];
                warnings.push(
                    `Potential outlier detected: ${tx.type} of $${tx.amount} on ${tx.date} (ID: ${tx.id})`
                );
            });
        }
    }

    // Summary warning if items were dropped
    if (dropped.length > 0) {
        warnings.unshift(`${dropped.length} transaction(s) dropped during sanitization`);
    }

    return { clean, dropped, warnings };
};

/**
 * Extracts and winsorizes amounts from transactions, grouped by type.
 * Useful for getting clean values before feeding into prediction.
 * 
 * @param transactions - Cleaned transaction array
 * @param type - Transaction type to filter
 * @param pLow - Lower percentile for winsorization
 * @param pHigh - Upper percentile for winsorization
 */
export const getWinsorizedAmountsByType = (
    transactions: DailyTransaction[],
    type: 'income' | 'expense' | 'investment',
    pLow: number = 0.05,
    pHigh: number = 0.95
): WinsorizeResult => {
    const filtered = transactions.filter(tx => tx.type === type);
    const amounts = filtered.map(tx => tx.amount);
    return winsorize(amounts, pLow, pHigh);
};

/**
 * Creates a stable hash string from transactions for cache keying.
 * Ensures consistent ordering to avoid false cache misses.
 * 
 * @param transactions - Transaction array
 * @returns Stable hash string
 */
export const hashTransactions = (transactions: DailyTransaction[] | undefined | null): string => {
    if (!transactions || transactions.length === 0) return 'empty';

    // Sort by stable fields for consistency
    const sorted = [...transactions].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.id !== b.id) return a.id - b.id;
        return 0;
    });

    // Create hash from key fields using FNV-1a inspired simple hash
    let hash = 2166136261; // FNV offset basis

    for (const tx of sorted) {
        const str = `${tx.id}|${tx.date}|${tx.amount}|${tx.type}`;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619); // FNV prime
        }
    }

    // Convert to hex string
    return (hash >>> 0).toString(16);
};
