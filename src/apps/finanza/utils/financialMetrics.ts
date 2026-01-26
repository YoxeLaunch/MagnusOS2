export const calculateSavingsRate = (income: number, expense: number): number => {
    if (income <= 0) return 0;
    return ((income - expense) / income) * 100;
};

export const calculateBurnRate = (totalExpense: number, daysElapsed: number): number => {
    if (daysElapsed <= 0) return 0;
    return totalExpense / daysElapsed;
};

export const calculateRunway = (currentBalance: number, dailyBurnRate: number): number => {
    if (dailyBurnRate <= 0) return 0; // Infinite or undefined runway
    return currentBalance / dailyBurnRate;
};

export const calculateProjectedTotal = (currentTotal: number, daysElapsed: number, totalDaysInMonth: number): number => {
    if (daysElapsed <= 0) return 0;
    const dailyRate = currentTotal / daysElapsed;
    return dailyRate * totalDaysInMonth;
};

export const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const getDaysElapsed = (date: Date): number => {
    return date.getDate();
};
