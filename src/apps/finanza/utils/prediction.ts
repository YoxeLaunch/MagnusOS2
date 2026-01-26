import { DailyTransaction } from '../types';

export interface DataPoint {
    date: Date;
    value: number;
}

interface TrendResult {
    predict: (date: Date) => number;
    confidence: number;
    method: 'average' | 'linear';
    average?: number;
}

/**
 * Calculates a trend from AGGREGATED cycle totals.
 * Rules:
 * - If < 3 points: Use Average.
 * - If >= 3 points: Use Linear Regression.
 */
export const calculateTrend = (dataPoints: DataPoint[]): TrendResult | null => {
    // Sort by date
    const data = [...dataPoints].sort((a, b) => a.date.getTime() - b.date.getTime());

    if (data.length === 0) return null;

    // RULE 1: Less than 3 cycles -> Use Pure Average
    if (data.length < 3) {
        const sum = data.reduce((acc, curr) => acc + curr.value, 0);
        const avg = sum / data.length;

        return {
            predict: () => Math.round(avg), // Always return average
            confidence: 0.5, // Medium confidence
            method: 'average',
            average: avg
        };
    }

    // RULE 2: >= 3 cycles -> Linear Regression
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    // Use timestamps as X values
    const firstDate = data[0].date.getTime();

    data.forEach(p => {
        const x = (p.date.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 30); // Months since start (approx)
        const y = p.value;

        sumX += x;
        sumY += y;
        sumXY += (x * y);
        sumXX += (x * x);
    });

    // Linear Regression Formula
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Fallback if calculation fails
    if (!isFinite(slope) || !isFinite(intercept)) {
        const sum = data.reduce((acc, curr) => acc + curr.value, 0);
        const avg = sum / data.length;
        return {
            predict: () => Math.round(avg),
            confidence: 0.5,
            method: 'average',
            average: avg
        };
    }

    return {
        predict: (targetDate: Date) => {
            const x = (targetDate.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 30);
            const value = slope * x + intercept;
            return Math.max(0, Math.round(value));
        },
        confidence: Math.min(n / 12, 1), // Confidence increases with more months
        method: 'linear'
    };
};
