import { DailyTransaction } from '../types';

export interface DataPoint {
    date: Date;
    value: number;
}

interface TrendResult {
    predict: (date: Date) => number;
    confidence: number;
    method: 'average' | 'linear' | 'seasonal';
    average?: number;
    seasonalFactors?: number[]; // 12-element array for monthly adjustment
    slope?: number; // Rate of change per month
}

// ============================================================================
// SEASONALITY SUPPORT
// ============================================================================

interface MonthlyAggregation {
    month: number; // 0-11
    values: number[];
    average: number;
}

/**
 * Calculates monthly averages from data points.
 * Used for seasonal adjustment when there's at least 12 months of data.
 * 
 * @param dataPoints Array of data points with date and value
 * @returns Object with monthly averages and global average
 */
export const calculateMonthlyAverages = (dataPoints: DataPoint[]): {
    monthlyAverages: number[]; // 12-element array (Jan=0 to Dec=11)
    globalAverage: number;
    monthsWithData: number;
} => {
    // Group values by month (0-11)
    const monthlyData: MonthlyAggregation[] = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        values: [],
        average: 0
    }));

    dataPoints.forEach(point => {
        const month = point.date.getMonth();
        monthlyData[month].values.push(point.value);
    });

    // Calculate average for each month
    let totalSum = 0;
    let totalCount = 0;
    let monthsWithData = 0;

    monthlyData.forEach(m => {
        if (m.values.length > 0) {
            m.average = m.values.reduce((a, b) => a + b, 0) / m.values.length;
            totalSum += m.values.reduce((a, b) => a + b, 0);
            totalCount += m.values.length;
            monthsWithData++;
        }
    });

    const globalAverage = totalCount > 0 ? totalSum / totalCount : 0;

    // Fill missing months with global average
    const monthlyAverages = monthlyData.map(m =>
        m.values.length > 0 ? m.average : globalAverage
    );

    return {
        monthlyAverages,
        globalAverage,
        monthsWithData
    };
};

/**
 * Calculates seasonal factors (multipliers relative to global average).
 * A factor > 1 means that month is above average, < 1 means below.
 * 
 * @param monthlyAverages 12-element array of monthly averages
 * @param globalAverage The global average across all months
 * @returns 12-element array of seasonal factors
 */
export const calculateSeasonalFactors = (
    monthlyAverages: number[],
    globalAverage: number
): number[] => {
    if (globalAverage === 0) {
        return Array(12).fill(1);
    }

    return monthlyAverages.map(avg => {
        const factor = avg / globalAverage;
        // Clamp factors to reasonable range (0.5 to 2.0)
        return Math.max(0.5, Math.min(2.0, factor));
    });
};

// ============================================================================
// MAIN TREND CALCULATION
// ============================================================================

/**
 * Calculates a trend from AGGREGATED cycle totals.
 * Rules:
 * - If < 3 points: Use Average.
 * - If >= 3 points and < 12 unique months: Use Linear Regression.
 * - If >= 12 unique months: Use Seasonal adjustment with linear trend.
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
            predict: () => Math.round(avg),
            confidence: 0.5,
            method: 'average',
            average: avg,
            slope: 0
        };
    }

    // Check if we have enough data for seasonality (>=12 unique months)
    const { monthlyAverages, globalAverage, monthsWithData } = calculateMonthlyAverages(data);

    // Calculate date range in months
    const firstDate = data[0].date.getTime();
    const lastDate = data[data.length - 1].date.getTime();
    const rangeMonths = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30);

    // RULE 3: If we have >= 12 months of data range AND >= 10 months with data -> Seasonal
    const useSeasonality = rangeMonths >= 11 && monthsWithData >= 10;

    // Calculate linear regression components
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    data.forEach(p => {
        const x = (p.date.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 30);
        const y = p.value;

        sumX += x;
        sumY += y;
        sumXY += (x * y);
        sumXX += (x * x);
    });

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
            average: avg,
            slope: 0
        };
    }

    // RULE 2 & 3: Linear or Seasonal
    if (useSeasonality) {
        const seasonalFactors = calculateSeasonalFactors(monthlyAverages, globalAverage);

        return {
            predict: (targetDate: Date) => {
                // Get linear trend value
                const x = (targetDate.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 30);
                const linearValue = slope * x + intercept;

                // Apply seasonal factor for target month
                const targetMonth = targetDate.getMonth();
                const seasonalValue = linearValue * seasonalFactors[targetMonth];

                return Math.max(0, Math.round(seasonalValue));
            },
            confidence: Math.min((monthsWithData / 12) * 0.9 + 0.1, 1),
            method: 'seasonal',
            seasonalFactors,
            slope: slope
        };
    }

    // Standard linear regression
    return {
        predict: (targetDate: Date) => {
            const x = (targetDate.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 30);
            const value = slope * x + intercept;
            return Math.max(0, Math.round(value));
        },
        confidence: Math.min(n / 12, 1),
        method: 'linear',
        slope: slope
    };
};
