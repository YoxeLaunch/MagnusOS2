/**
 * FIRE Calculator Widget
 * 
 * Calculates the estimated time to Financial Independence / Retire Early
 * using the user's current savings rate and adjustable assumptions.
 * 
 * Features:
 * - Circular progress indicator toward FIRE goal
 * - Adjustable inputs with localStorage persistence
 * - Handles edge cases (negative savings, etc.)
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Flame, TrendingUp, Target, Clock, DollarSign, Percent, Settings } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface FIREInputs {
    currentPortfolio: number;
    annualExpenses: number;
    annualSavings: number;
    expectedAnnualReturn: number; // As decimal (e.g., 0.07 for 7%)
    safeWithdrawalRate: number; // As decimal (e.g., 0.04 for 4%)
}

export interface FIREResult {
    targetPortfolio: number;
    yearsToFIRE: number | null; // null = not achievable
    progress: number; // 0 to 1
    isAchievable: boolean;
    message: string;
}

// ============================================================================
// STORAGE
// ============================================================================

const FIRE_STORAGE_KEY = 'magnus_fire_inputs';

const saveInputs = (inputs: Partial<FIREInputs>): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const existing = loadInputs();
            localStorage.setItem(FIRE_STORAGE_KEY, JSON.stringify({ ...existing, ...inputs }));
        } catch {
            // Ignore storage errors
        }
    }
};

const loadInputs = (): Partial<FIREInputs> => {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const stored = localStorage.getItem(FIRE_STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch {
            // Ignore parse errors
        }
    }
    return {};
};

// ============================================================================
// CALCULATION
// ============================================================================

/**
 * Calculates years to FIRE using iterative simulation.
 * Avoids complex formulas that can produce NaN/Infinity.
 */
export const calculateFIREProjection = (inputs: FIREInputs): FIREResult => {
    const {
        currentPortfolio,
        annualExpenses,
        annualSavings,
        expectedAnnualReturn,
        safeWithdrawalRate
    } = inputs;

    // Calculate target portfolio using the SWR rule
    // If SWR is 4%, you need 25x annual expenses
    const targetPortfolio = safeWithdrawalRate > 0
        ? annualExpenses / safeWithdrawalRate
        : annualExpenses * 25;

    // Already FIRE?
    if (currentPortfolio >= targetPortfolio) {
        return {
            targetPortfolio,
            yearsToFIRE: 0,
            progress: 1,
            isAchievable: true,
            message: '¡Felicidades! Ya alcanzaste la Independencia Financiera'
        };
    }

    // Not achievable if no savings or negative
    if (annualSavings <= 0 && expectedAnnualReturn <= 0) {
        return {
            targetPortfolio,
            yearsToFIRE: null,
            progress: Math.min(1, currentPortfolio / targetPortfolio),
            isAchievable: false,
            message: 'No alcanzable: Aumenta tus ahorros o retorno esperado'
        };
    }

    // Iterative simulation
    let portfolio = currentPortfolio;
    let years = 0;
    const maxYears = 100; // Cap to prevent infinite loops

    while (portfolio < targetPortfolio && years < maxYears) {
        // Compound growth + new savings
        portfolio = portfolio * (1 + expectedAnnualReturn) + annualSavings;
        years++;

        // Safety: break if portfolio is going backwards
        if (annualSavings < 0 && portfolio <= currentPortfolio && years > 2) {
            return {
                targetPortfolio,
                yearsToFIRE: null,
                progress: Math.min(1, currentPortfolio / targetPortfolio),
                isAchievable: false,
                message: 'No alcanzable: El portafolio decrece con estos supuestos'
            };
        }
    }

    if (years >= maxYears) {
        return {
            targetPortfolio,
            yearsToFIRE: null,
            progress: Math.min(1, currentPortfolio / targetPortfolio),
            isAchievable: false,
            message: 'Más de 100 años: Ajusta tus parámetros'
        };
    }

    return {
        targetPortfolio,
        yearsToFIRE: years,
        progress: Math.min(1, currentPortfolio / targetPortfolio),
        isAchievable: true,
        message: `Libertad financiera en ${years} año${years === 1 ? '' : 's'}`
    };
};

// ============================================================================
// CIRCULAR PROGRESS COMPONENT
// ============================================================================

interface CircularProgressProps {
    progress: number; // 0 to 1
    size?: number;
    strokeWidth?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
    progress,
    size = 160,
    strokeWidth = 12
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress * circumference);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                {/* Background circle */}
                <circle
                    className="text-slate-200 dark:text-white/10"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress circle */}
                <circle
                    className={`transition-all duration-1000 ease-out ${progress >= 1 ? 'text-emerald-500' :
                        progress >= 0.5 ? 'text-amber-500' : 'text-primary'
                        }`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Flame className={`w-8 h-8 ${progress >= 1 ? 'text-emerald-500' : 'text-primary'}`} />
                <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {Math.round(progress * 100)}%
                </span>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface FIRECalculatorProps {
    /** Average annual income from projections (optional, used for defaults) */
    avgAnnualIncome?: number;
    /** Average annual expenses from projections (optional, used for defaults) */
    avgAnnualExpenses?: number;
    /** Current savings rate percentage (0-100) */
    savingsRate?: number;
}

export const FIRECalculator: React.FC<FIRECalculatorProps> = ({
    avgAnnualIncome = 0,
    avgAnnualExpenses = 0,
    savingsRate = 0
}) => {
    const [showSettings, setShowSettings] = useState(false);

    // Load persisted inputs or use defaults
    const storedInputs = loadInputs();

    const [currentPortfolio, setCurrentPortfolio] = useState(
        storedInputs.currentPortfolio ?? 0
    );
    const [annualExpenses, setAnnualExpenses] = useState(
        storedInputs.annualExpenses ?? ((avgAnnualExpenses * 12) || 36000)
    );
    const [annualSavings, setAnnualSavings] = useState(
        storedInputs.annualSavings ?? (Math.max(0, (avgAnnualIncome - avgAnnualExpenses) * 12) || 12000)
    );
    const [expectedReturn, setExpectedReturn] = useState(
        storedInputs.expectedAnnualReturn ?? 0.07
    );
    const [swr, setSwr] = useState(
        storedInputs.safeWithdrawalRate ?? 0.04
    );

    // Persist inputs when they change
    useEffect(() => {
        saveInputs({
            currentPortfolio,
            annualExpenses,
            annualSavings,
            expectedAnnualReturn: expectedReturn,
            safeWithdrawalRate: swr
        });
    }, [currentPortfolio, annualExpenses, annualSavings, expectedReturn, swr]);

    // Calculate FIRE projection
    const result = useMemo(() => {
        return calculateFIREProjection({
            currentPortfolio,
            annualExpenses,
            annualSavings,
            expectedAnnualReturn: expectedReturn,
            safeWithdrawalRate: swr
        });
    }, [currentPortfolio, annualExpenses, annualSavings, expectedReturn, swr]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                        <Flame className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            Calculadora F.I.R.E.
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Independencia Financiera / Retiro Temprano
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${showSettings
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400'
                        }`}
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                            Portafolio Actual
                        </label>
                        <input
                            type="number"
                            value={currentPortfolio}
                            onChange={(e) => setCurrentPortfolio(Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-900 dark:text-white"
                            min={0}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                            Gastos Anuales
                        </label>
                        <input
                            type="number"
                            value={annualExpenses}
                            onChange={(e) => setAnnualExpenses(Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-900 dark:text-white"
                            min={0}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                            Ahorro Anual
                        </label>
                        <input
                            type="number"
                            value={annualSavings}
                            onChange={(e) => setAnnualSavings(Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                            Retorno Esperado (%)
                        </label>
                        <input
                            type="number"
                            value={expectedReturn * 100}
                            onChange={(e) => setExpectedReturn(Number(e.target.value) / 100)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-900 dark:text-white"
                            min={0}
                            max={30}
                            step={0.5}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                            Tasa Retiro Seguro (%)
                        </label>
                        <input
                            type="number"
                            value={swr * 100}
                            onChange={(e) => setSwr(Number(e.target.value) / 100)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-900 dark:text-white"
                            min={1}
                            max={10}
                            step={0.25}
                        />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Circular Progress */}
                    <CircularProgress progress={result.progress} />

                    {/* Stats */}
                    <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="text-center md:text-left">
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-center md:justify-start">
                                <Target className="w-3 h-3" /> Meta FIRE
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {formatCurrency(result.targetPortfolio)}
                            </p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-center md:justify-start">
                                <DollarSign className="w-3 h-3" /> Portafolio Actual
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {formatCurrency(currentPortfolio)}
                            </p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-center md:justify-start">
                                <Clock className="w-3 h-3" /> Años Estimados
                            </p>
                            <p className={`text-lg font-bold ${result.isAchievable ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                {result.yearsToFIRE !== null ? result.yearsToFIRE : '—'}
                            </p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-center md:justify-start">
                                <TrendingUp className="w-3 h-3" /> Ahorro Anual
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {formatCurrency(annualSavings)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Message */}
                <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium text-center ${result.isAchievable
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                    {result.message}
                </div>

                {/* Quick Facts */}
                <div className="mt-4 flex justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Retorno: {(expectedReturn * 100).toFixed(1)}%
                    </span>
                    <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        SWR: {(swr * 100).toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FIRECalculator;
