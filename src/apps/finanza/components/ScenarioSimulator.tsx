/**
 * ScenarioSimulator Component
 * 
 * Interactive What-If analysis tool that lets users adjust income and expense
 * multipliers to see how different scenarios affect their financial projections.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Sliders, TrendingUp, TrendingDown, RotateCcw, Info } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getCycleId } from '../utils/financialCycle';

interface ScenarioState {
    incomeMultiplier: number; // 0.5 to 2.0 (50% to 200%)
    expenseMultiplier: number;
    savingsRate: number; // 0 to 0.5 (0% to 50% additional savings)
}

interface SimulatedProjection {
    baseIncome: number;
    baseExpense: number;
    adjustedIncome: number;
    adjustedExpense: number;
    monthlySurplus: number;
    annualSavings: number;
    yearsToGoal: number | null;
}

const DEFAULT_SCENARIO: ScenarioState = {
    incomeMultiplier: 1.0,
    expenseMultiplier: 1.0,
    savingsRate: 0
};

// Helper to format currency
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

// Custom Slider Component
interface SliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    formatValue: (value: number) => string;
    icon: React.ReactNode;
    color: 'green' | 'red' | 'blue';
}

const Slider: React.FC<SliderProps> = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
    formatValue,
    icon,
    color
}) => {
    const colorClasses = {
        green: 'accent-emerald-500',
        red: 'accent-rose-500',
        blue: 'accent-violet-500'
    };

    const bgClasses = {
        green: 'bg-emerald-500/10',
        red: 'bg-rose-500/10',
        blue: 'bg-violet-500/10'
    };

    const textClasses = {
        green: 'text-emerald-500',
        red: 'text-rose-500',
        blue: 'text-violet-500'
    };

    return (
        <div className={`p-4 rounded-xl ${bgClasses[color]} border border-white/5`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={textClasses[color]}>{icon}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {label}
                    </span>
                </div>
                <span className={`font-bold ${textClasses[color]}`}>
                    {formatValue(value)}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${colorClasses[color]}`}
                style={{
                    background: `linear-gradient(to right, ${color === 'green' ? '#10B981' : color === 'red' ? '#F43F5E' : '#8B5CF6'} 0%, ${color === 'green' ? '#10B981' : color === 'red' ? '#F43F5E' : '#8B5CF6'} ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`
                }}
            />
            <div className="flex justify-between mt-1 text-xs text-slate-400">
                <span>{formatValue(min)}</span>
                <span>{formatValue(max)}</span>
            </div>
        </div>
    );
};

export const ScenarioSimulator: React.FC = () => {
    const { dailyTransactions } = useData();
    const [scenario, setScenario] = useState<ScenarioState>(DEFAULT_SCENARIO);
    const [goalAmount, setGoalAmount] = useState<number>(100000);

    // Calculate baseline from historical data
    const baseline = useMemo(() => {
        if (dailyTransactions.length === 0) return null;

        // Get last 6 closed cycles
        const cycleTotals: Record<string, { income: number; expense: number }> = {};
        const currentCycleId = getCycleId(new Date().toISOString().slice(0, 10));

        dailyTransactions.forEach(t => {
            const cycleId = getCycleId(t.date);
            if (cycleId === currentCycleId) return; // Skip current cycle

            if (!cycleTotals[cycleId]) {
                cycleTotals[cycleId] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                cycleTotals[cycleId].income += t.amount;
            } else if (t.type === 'expense') {
                cycleTotals[cycleId].expense += t.amount;
            }
        });

        const cycles = Object.values(cycleTotals);
        if (cycles.length === 0) return null;

        // Take last 6 cycles or all if fewer
        const recentCycles = cycles.slice(-6);
        const avgIncome = recentCycles.reduce((sum, c) => sum + c.income, 0) / recentCycles.length;
        const avgExpense = recentCycles.reduce((sum, c) => sum + c.expense, 0) / recentCycles.length;

        return { avgIncome, avgExpense };
    }, [dailyTransactions]);

    // Calculate projection based on scenario
    const projection = useMemo((): SimulatedProjection | null => {
        if (!baseline) return null;

        const adjustedIncome = baseline.avgIncome * scenario.incomeMultiplier;
        const adjustedExpense = baseline.avgExpense * scenario.expenseMultiplier;
        const additionalSavings = adjustedIncome * scenario.savingsRate;
        const monthlySurplus = adjustedIncome - adjustedExpense - additionalSavings;
        const annualSavings = (monthlySurplus + additionalSavings) * 12;

        // Calculate years to goal
        let yearsToGoal: number | null = null;
        if (annualSavings > 0 && goalAmount > 0) {
            yearsToGoal = goalAmount / annualSavings;
        }

        return {
            baseIncome: baseline.avgIncome,
            baseExpense: baseline.avgExpense,
            adjustedIncome,
            adjustedExpense,
            monthlySurplus,
            annualSavings,
            yearsToGoal
        };
    }, [baseline, scenario, goalAmount]);

    const handleReset = useCallback(() => {
        setScenario(DEFAULT_SCENARIO);
    }, []);

    const isModified = scenario.incomeMultiplier !== 1 ||
        scenario.expenseMultiplier !== 1 ||
        scenario.savingsRate !== 0;

    if (!baseline || !projection) {
        return (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-3 text-slate-400">
                    <Info size={20} />
                    <p>Se necesitan al menos 1 ciclo completo de datos para el simulador de escenarios.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:border-violet-500/30">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                        <Sliders className="text-violet-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            Simulador de Escenarios
                        </h3>
                        <p className="text-sm text-slate-500">
                            ¿Qué pasaría si...?
                        </p>
                    </div>
                </div>
                {isModified && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <RotateCcw size={14} />
                        Reiniciar
                    </button>
                )}
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Slider
                    label="Ingresos"
                    value={scenario.incomeMultiplier}
                    onChange={(v) => setScenario(s => ({ ...s, incomeMultiplier: v }))}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    icon={<TrendingUp size={16} />}
                    color="green"
                />
                <Slider
                    label="Gastos"
                    value={scenario.expenseMultiplier}
                    onChange={(v) => setScenario(s => ({ ...s, expenseMultiplier: v }))}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    icon={<TrendingDown size={16} />}
                    color="red"
                />
                <Slider
                    label="Ahorro Forzado"
                    value={scenario.savingsRate}
                    onChange={(v) => setScenario(s => ({ ...s, savingsRate: v }))}
                    min={0}
                    max={0.5}
                    step={0.05}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    icon={<Sliders size={16} />}
                    color="blue"
                />
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">Ingreso Mensual</p>
                    <p className="text-lg font-bold text-emerald-500">
                        {formatCurrency(projection.adjustedIncome)}
                    </p>
                    {projection.adjustedIncome !== projection.baseIncome && (
                        <p className="text-xs text-slate-400 mt-1">
                            Base: {formatCurrency(projection.baseIncome)}
                        </p>
                    )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">Gasto Mensual</p>
                    <p className="text-lg font-bold text-rose-500">
                        {formatCurrency(projection.adjustedExpense)}
                    </p>
                    {projection.adjustedExpense !== projection.baseExpense && (
                        <p className="text-xs text-slate-400 mt-1">
                            Base: {formatCurrency(projection.baseExpense)}
                        </p>
                    )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">Superávit Mensual</p>
                    <p className={`text-lg font-bold ${projection.monthlySurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(projection.monthlySurplus)}
                    </p>
                </div>
                <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <p className="text-xs text-violet-400 mb-1">Ahorro Anual</p>
                    <p className={`text-lg font-bold ${projection.annualSavings >= 0 ? 'text-violet-500' : 'text-rose-500'}`}>
                        {formatCurrency(projection.annualSavings)}
                    </p>
                </div>
            </div>

            {/* Goal Calculator */}
            <div className="p-4 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-xl border border-violet-500/20">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-2">
                            Meta de Ahorro
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <input
                                type="number"
                                value={goalAmount}
                                onChange={(e) => setGoalAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full pl-8 pr-4 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="100000"
                            />
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-right">
                        {projection.yearsToGoal !== null && projection.yearsToGoal > 0 ? (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Tiempo estimado</p>
                                <p className="text-2xl font-black text-violet-500">
                                    {projection.yearsToGoal < 1
                                        ? `${Math.round(projection.yearsToGoal * 12)} meses`
                                        : `${projection.yearsToGoal.toFixed(1)} años`
                                    }
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Tiempo estimado</p>
                                <p className="text-lg font-bold text-rose-500">
                                    {projection.annualSavings <= 0 ? 'Sin capacidad de ahorro' : '—'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScenarioSimulator;
