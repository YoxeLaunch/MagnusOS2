export const calculateISR = (grossMonthlySalary: number): number => {
    // Annualized salary
    const annualSalary = grossMonthlySalary * 12;
    let isrAnnual = 0;

    // ISR Scale 2025 (Reference: DGII RD)
    // 1. Exempt up to 416,220.00
    // 2. 15% from 416,220.01 to 624,329.00
    // 3. 20% from 624,329.01 to 867,123.00 (+ 31,216.00 base)
    // 4. 25% from 867,123.01 onwards (+ 79,776.00 base)

    if (annualSalary <= 416220.00) {
        isrAnnual = 0;
    } else if (annualSalary <= 624329.00) {
        isrAnnual = (annualSalary - 416220.01) * 0.15;
    } else if (annualSalary <= 867123.00) {
        isrAnnual = 31216.00 + ((annualSalary - 624329.01) * 0.20);
    } else {
        isrAnnual = 79776.00 + ((annualSalary - 867123.01) * 0.25);
    }

    return isrAnnual / 12;
};

export const calculateNetSalary = (grossSalary: number, deductions: { afp: number; sfs: number; isr: number; other: number }): number => {
    return grossSalary - (deductions.afp + deductions.sfs + deductions.isr + deductions.other);
};

// Standard rates in RD (subject to caps, but using percentage for simplicity unless cap is requested)
// AFP: ~2.87% of contribution salary
// SFS: ~3.04% of contribution salary
export const SUGGESTED_RATES = {
    AFP: 0.0287,
    SFS: 0.0304
};
