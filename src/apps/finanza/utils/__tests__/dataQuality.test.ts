/**
 * Unit Tests for dataQuality.ts
 * 
 * Tests the core data validation and sanitization functions used
 * in the financial prediction pipeline.
 */

import {
    sanitizeTransactions,
    winsorize,
    detectOutliersZ,
    getPercentile,
    calculateStats,
    hashTransactions,
    getWinsorizedAmountsByType
} from '../dataQuality';
import { DailyTransaction } from '../../types';

// ============================================================================
// HELPER: Create test transaction
// ============================================================================
const createTransaction = (
    overrides: Partial<DailyTransaction> = {}
): DailyTransaction => ({
    id: 1,
    date: '2025-12-15',
    amount: 100,
    description: 'Test transaction',
    type: 'expense',
    ...overrides
});

// ============================================================================
// getPercentile Tests
// ============================================================================
describe('getPercentile', () => {
    it('should return 0 for empty array', () => {
        expect(getPercentile([], 0.5)).toBe(0);
    });

    it('should return the only value for single-element array', () => {
        expect(getPercentile([42], 0.5)).toBe(42);
    });

    it('should return correct percentile for sorted array', () => {
        const sorted = [10, 20, 30, 40, 50];
        expect(getPercentile(sorted, 0)).toBe(10);
        expect(getPercentile(sorted, 0.5)).toBe(30);
        expect(getPercentile(sorted, 1)).toBe(50);
    });

    it('should interpolate between values', () => {
        const sorted = [0, 100];
        expect(getPercentile(sorted, 0.25)).toBe(25);
        expect(getPercentile(sorted, 0.75)).toBe(75);
    });
});

// ============================================================================
// calculateStats Tests
// ============================================================================
describe('calculateStats', () => {
    it('should return zeros for empty array', () => {
        const result = calculateStats([]);
        expect(result.mean).toBe(0);
        expect(result.stdDev).toBe(0);
    });

    it('should calculate correct mean', () => {
        const result = calculateStats([10, 20, 30]);
        expect(result.mean).toBe(20);
    });

    it('should return 0 stdDev for single value', () => {
        const result = calculateStats([100]);
        expect(result.stdDev).toBe(0);
    });

    it('should calculate correct standard deviation', () => {
        // Values: 2, 4, 4, 4, 5, 5, 7, 9 -> mean = 5, variance = 4, stdDev = 2
        const result = calculateStats([2, 4, 4, 4, 5, 5, 7, 9]);
        expect(result.mean).toBe(5);
        expect(result.stdDev).toBe(2);
    });
});

// ============================================================================
// winsorize Tests
// ============================================================================
describe('winsorize', () => {
    it('should return empty result for empty array', () => {
        const result = winsorize([]);
        expect(result.valuesWinsorized).toEqual([]);
        expect(result.cappedCount.lower).toBe(0);
        expect(result.cappedCount.upper).toBe(0);
    });

    it('should cap extreme values at percentiles', () => {
        // With 10 values [1,2,3,4,5,6,7,8,9,1000], 
        // 5th percentile ~= 1.45, 95th percentile ~= 109.9
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1000];
        const result = winsorize(values, 0.05, 0.95);

        // The extreme 1000 should be capped
        expect(result.cappedCount.upper).toBeGreaterThan(0);
        expect(result.valuesWinsorized[9]).toBeLessThan(1000);
    });

    it('should preserve values within bounds', () => {
        const values = [50, 60, 70, 80, 90];
        const result = winsorize(values, 0.1, 0.9);

        // Middle values should remain unchanged
        expect(result.valuesWinsorized[2]).toBe(70);
    });

    it('should report correct bounds', () => {
        const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const result = winsorize(values, 0.1, 0.9);

        expect(result.bounds.lower).toBeLessThanOrEqual(20);
        expect(result.bounds.upper).toBeGreaterThanOrEqual(90);
    });
});

// ============================================================================
// detectOutliersZ Tests
// ============================================================================
describe('detectOutliersZ', () => {
    it('should return no outliers for empty or single value', () => {
        expect(detectOutliersZ([]).outlierIndices).toEqual([]);
        expect(detectOutliersZ([100]).outlierIndices).toEqual([]);
    });

    it('should return no outliers for uniform data', () => {
        const result = detectOutliersZ([50, 50, 50, 50]);
        expect(result.outlierIndices).toEqual([]);
    });

    it('should detect obvious outliers', () => {
        // Normal values around 100, one extreme at 10000
        const values = [100, 102, 98, 101, 99, 10000];
        const result = detectOutliersZ(values, 3);

        expect(result.isOutlier[5]).toBe(true);
        expect(result.outlierIndices).toContain(5);
    });

    it('should not flag values within threshold', () => {
        const values = [10, 12, 11, 13, 9, 14];
        const result = detectOutliersZ(values, 3);

        expect(result.outlierIndices).toEqual([]);
    });
});

// ============================================================================
// sanitizeTransactions Tests
// ============================================================================
describe('sanitizeTransactions', () => {
    it('should return empty result for null/undefined input', () => {
        const result = sanitizeTransactions(null);
        expect(result.clean).toEqual([]);
        expect(result.warnings).toContain('No transactions provided');
    });

    it('should filter transactions with zero amount', () => {
        const transactions = [
            createTransaction({ id: 1, amount: 100 }),
            createTransaction({ id: 2, amount: 0 }),
            createTransaction({ id: 3, amount: 50 })
        ];

        const result = sanitizeTransactions(transactions, { filterZeroAmounts: true });

        expect(result.clean.length).toBe(2);
        expect(result.dropped.length).toBe(1);
        expect(result.dropped[0].reason).toContain('Zero amount');
    });

    it('should filter future dates', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const transactions = [
            createTransaction({ id: 1, date: '2025-01-15' }),
            createTransaction({ id: 2, date: futureDate.toISOString().slice(0, 10) })
        ];

        const result = sanitizeTransactions(transactions, {
            filterFutureDates: true,
            referenceDate: new Date('2025-06-01')
        });

        expect(result.dropped.some(d => d.reason.includes('Future date'))).toBe(true);
    });

    it('should filter invalid dates', () => {
        const transactions = [
            createTransaction({ id: 1, date: '2025-12-15' }),
            createTransaction({ id: 2, date: 'not-a-date' })
        ];

        const result = sanitizeTransactions(transactions);

        expect(result.dropped.some(d => d.reason.includes('Invalid date'))).toBe(true);
    });

    it('should detect duplicates', () => {
        const tx = createTransaction({ id: 1, date: '2025-12-15', amount: 100 });
        const transactions = [tx, { ...tx }, createTransaction({ id: 2, amount: 200 })];

        const result = sanitizeTransactions(transactions);

        expect(result.dropped.some(d => d.reason.includes('Duplicate'))).toBe(true);
        expect(result.clean.length).toBe(2);
    });

    it('should warn about outliers but not remove them', () => {
        const transactions = [
            createTransaction({ id: 1, amount: 100 }),
            createTransaction({ id: 2, amount: 102 }),
            createTransaction({ id: 3, amount: 98 }),
            createTransaction({ id: 4, amount: 10000 }) // Outlier
        ];

        const result = sanitizeTransactions(transactions, { detectOutliers: true });

        // All 4 should be in clean (outliers are warned, not removed)
        expect(result.clean.length).toBe(4);
        expect(result.warnings.some(w => w.includes('outlier'))).toBe(true);
    });
});

// ============================================================================
// hashTransactions Tests
// ============================================================================
describe('hashTransactions', () => {
    it('should return "empty" for null/undefined/empty array', () => {
        expect(hashTransactions(null)).toBe('empty');
        expect(hashTransactions(undefined)).toBe('empty');
        expect(hashTransactions([])).toBe('empty');
    });

    it('should produce same hash for same data', () => {
        const tx1 = [createTransaction({ id: 1 }), createTransaction({ id: 2 })];
        const tx2 = [createTransaction({ id: 1 }), createTransaction({ id: 2 })];

        expect(hashTransactions(tx1)).toBe(hashTransactions(tx2));
    });

    it('should produce same hash regardless of order', () => {
        const tx1 = [createTransaction({ id: 1 }), createTransaction({ id: 2 })];
        const tx2 = [createTransaction({ id: 2 }), createTransaction({ id: 1 })];

        expect(hashTransactions(tx1)).toBe(hashTransactions(tx2));
    });

    it('should produce different hash for different data', () => {
        const tx1 = [createTransaction({ id: 1, amount: 100 })];
        const tx2 = [createTransaction({ id: 1, amount: 200 })];

        expect(hashTransactions(tx1)).not.toBe(hashTransactions(tx2));
    });
});

// ============================================================================
// getWinsorizedAmountsByType Tests
// ============================================================================
describe('getWinsorizedAmountsByType', () => {
    it('should filter by type and winsorize', () => {
        const transactions = [
            createTransaction({ id: 1, type: 'income', amount: 1000 }),
            createTransaction({ id: 2, type: 'income', amount: 1100 }),
            createTransaction({ id: 3, type: 'expense', amount: 200 }),
            createTransaction({ id: 4, type: 'income', amount: 50000 }), // Outlier income
        ];

        const result = getWinsorizedAmountsByType(transactions, 'income');

        expect(result.valuesWinsorized.length).toBe(3);
    });
});
