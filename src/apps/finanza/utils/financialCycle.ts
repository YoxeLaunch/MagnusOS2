export interface FinancialCycle {
    start: Date;
    end: Date;
    label: string; // e.g. "Enero" (even if starts in Dec)
}

/**
 * Returns the financial cycle for a given reference date.
 * Cycle rule: Day 26 of PrevMonth to Day 25 of CurrMonth.
 * Example: Reference Jan 10 -> Start: Dec 26, End: Jan 25. Label: "Enero"
 * Example: Reference Jan 27 -> Start: Jan 26, End: Feb 25. Label: "Febrero"
 * 
 * EXCEPTION: Cycle "Enero 2026" starts on Dec 1, 2025 instead of Dec 26.
 */
export const getFinancialCycle = (referenceDate: Date): FinancialCycle => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth(); // 0-11
    const day = referenceDate.getDate();

    // SPECIAL EXCEPTION: Dec 2025 & Jan 1-25, 2026
    // Extended cycle: Dec 1, 2025 to Jan 25, 2026
    if (year === 2025 && month === 11) {
        // Any date in Dec 2025 is part of Jan 2026 cycle
        const start = new Date(2025, 11, 1);
        const end = new Date(2026, 0, 25);
        return { start, end, label: 'Enero' };
    }

    if (year === 2026 && month === 0 && day <= 25) {
        // Jan 1-25, 2026 is also part of this extended cycle
        const start = new Date(2025, 11, 1);
        const end = new Date(2026, 0, 25);
        return { start, end, label: 'Enero' };
    }

    // Normal Logic
    // If day >= 26, we are in the NEXT month's cycle
    if (day >= 26) {
        // Start: 26th of current month
        const start = new Date(year, month, 26);
        // End: 25th of next month
        const end = new Date(year, month + 1, 25);

        // Label is next month name
        const labelDate = new Date(year, month + 1, 1);
        const label = labelDate.toLocaleDateString('es-ES', { month: 'long' });

        return { start, end, label };
    } else {
        // We are before the 26th, so we are in the current month's cycle (which started prev month)

        const start = new Date(year, month - 1, 26);
        const end = new Date(year, month, 25);

        // Label is current month name
        const labelDate = new Date(year, month, 1);
        const label = labelDate.toLocaleDateString('es-ES', { month: 'long' });

        return { start, end, label };
    }
};

/**
 * Checks if a transaction date falls within a cycle
 */
export const isDateInCycle = (dateStr: string, cycle: FinancialCycle): boolean => {
    // Parse input date (YYYY-MM-DD) manually to avoid timezone issues
    const [y, m, d] = dateStr.split('-').map(Number);
    // Create UTC date for the transaction (00:00:00 UTC)
    const transactionDate = new Date(Date.UTC(y, m - 1, d));

    // Normalize cycle dates to UTC (00:00:00 UTC)
    const start = new Date(Date.UTC(cycle.start.getFullYear(), cycle.start.getMonth(), cycle.start.getDate()));
    const end = new Date(Date.UTC(cycle.end.getFullYear(), cycle.end.getMonth(), cycle.end.getDate()));

    return transactionDate >= start && transactionDate <= end;
};

/**
 * Generates a sortable Cycle ID (Format: YYYY-MM) based on the cycle label month.
 * Example: Dec 26 2024 -> Jan 25 2025 Cycle -> ID: "2025-01"
 */
export const getCycleId = (dateStr: string): string => {
    const date = new Date(dateStr);

    // Use the getFinancialCycle logic to find the cycle, then derive ID
    const cycle = getFinancialCycle(date);

    // Robust way: Use cycle.end
    const year = cycle.end.getFullYear();
    const month = cycle.end.getMonth() + 1; // 1-12
    return `${year}-${String(month).padStart(2, '0')}`;
};

/**
 * Returns the start and end date for a given Cycle ID (YYYY-MM).
 */
export const getCycleFromId = (cycleId: string): FinancialCycle => {
    const [yearStr, monthStr] = cycleId.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-11

    // EXCEPTION: 2026-01
    if (year === 2026 && month === 0) {
        return {
            start: new Date(2025, 11, 1), // Dec 1, 2025
            end: new Date(2026, 0, 25),   // Jan 25, 2026
            label: 'Enero'
        };
    }

    // EXCEPTION: 2025-12 (to bridge the gap if requested)
    // Standard Start: Nov 26. Standard End: Dec 25.
    // Modified End: Nov 30 (since Dec 1 starts Jan cycle).
    if (year === 2025 && month === 11) {
        return {
            start: new Date(2025, 10, 26), // Nov 26, 2025
            end: new Date(2025, 10, 30),   // Nov 30, 2025
            label: 'Diciembre'
        };
    }

    // Reconstruct dates based on rule:
    // Cycle "Month" ends on 25th of that month.
    // Starts 26th of previous month.

    const end = new Date(year, month, 25);
    const start = new Date(year, month - 1, 26);

    // Label logic re-use
    const labelDate = new Date(year, month, 1);
    const label = labelDate.toLocaleDateString('es-ES', { month: 'long' });

    return { start, end, label };
};
