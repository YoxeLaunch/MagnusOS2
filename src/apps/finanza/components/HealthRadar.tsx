/**
 * Financial Health Radar Widget
 * 
 * Displays a 5-axis radar chart showing normalized financial health scores.
 * Uses Recharts RadarChart for visualization.
 * 
 * Axes:
 * 1. Tasa de Ahorro (Savings Rate) - vs 20% reference
 * 2. Estabilidad de Gastos (Expense Stability) - existing metric
 * 3. Pista de Efectivo (Cash Runway) - vs 6 months reference  
 * 4. Disciplina Financiera - existing metric
 * 5. Ratio de Inversión - investments / income
 */

import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { sanitizeTransactions } from '../utils/dataQuality';
import { getCycleId } from '../utils/financialCycle';

// ============================================================================
// TYPES
// ============================================================================

interface HealthAxis {
    axis: string;
    shortLabel: string;
    score: number; // 0-100
    rawValue: number;
    unit: string;
    reference: number;
    referenceUnit: string;
}

interface HealthAnalysis {
    strengths: string[];
    opportunities: string[];
    overallScore: number;
}

// ============================================================================
// SCORE NORMALIZATION HELPERS
// ============================================================================

/**
 * Clamps a value between 0 and 100
 */
const clamp = (value: number, min = 0, max = 100): number => {
    return Math.max(min, Math.min(max, value));
};

/**
 * Normalizes a value against a reference (100 = at or above reference)
 */
const normalizeAgainstReference = (value: number, reference: number): number => {
    if (reference <= 0) return 0;
    return clamp(Math.round((value / reference) * 100));
};

// ============================================================================
// HEALTH SCORE CALCULATION
// ============================================================================

interface HealthScoreInputs {
    savingsRate: number; // 0-100 percentage
    expenseStability: number; // 0-100 score
    cashRunway: number; // months
    financialDiscipline: number; // 0-100 score  
    investmentRatio: number; // 0-100 percentage
}

const REFERENCES = {
    savingsRate: 20, // 20% savings rate is excellent
    expenseStability: 80, // 80+ is stable
    cashRunway: 6, // 6 months emergency fund
    financialDiscipline: 70, // 70+ is disciplined
    investmentRatio: 15 // 15% of income to investments
};

export const calculateHealthScores = (inputs: HealthScoreInputs): HealthAxis[] => {
    const { savingsRate, expenseStability, cashRunway, financialDiscipline, investmentRatio } = inputs;

    return [
        {
            axis: 'Tasa de Ahorro',
            shortLabel: 'Ahorro',
            score: normalizeAgainstReference(savingsRate, REFERENCES.savingsRate),
            rawValue: savingsRate,
            unit: '%',
            reference: REFERENCES.savingsRate,
            referenceUnit: '%'
        },
        {
            axis: 'Estabilidad de Gastos',
            shortLabel: 'Estabilidad',
            score: normalizeAgainstReference(expenseStability, REFERENCES.expenseStability),
            rawValue: expenseStability,
            unit: 'pts',
            reference: REFERENCES.expenseStability,
            referenceUnit: 'pts'
        },
        {
            axis: 'Pista de Efectivo',
            shortLabel: 'Runway',
            score: normalizeAgainstReference(cashRunway, REFERENCES.cashRunway),
            rawValue: cashRunway,
            unit: 'meses',
            reference: REFERENCES.cashRunway,
            referenceUnit: 'meses'
        },
        {
            axis: 'Disciplina Financiera',
            shortLabel: 'Disciplina',
            score: normalizeAgainstReference(financialDiscipline, REFERENCES.financialDiscipline),
            rawValue: financialDiscipline,
            unit: 'pts',
            reference: REFERENCES.financialDiscipline,
            referenceUnit: 'pts'
        },
        {
            axis: 'Ratio de Inversión',
            shortLabel: 'Inversión',
            score: normalizeAgainstReference(investmentRatio, REFERENCES.investmentRatio),
            rawValue: investmentRatio,
            unit: '%',
            reference: REFERENCES.investmentRatio,
            referenceUnit: '%'
        }
    ];
};

const analyzeHealth = (axes: HealthAxis[]): HealthAnalysis => {
    const strengths = axes.filter(a => a.score >= 80).map(a => a.axis);
    const opportunities = axes.filter(a => a.score < 60).map(a => a.axis);
    const overallScore = Math.round(axes.reduce((sum, a) => sum + a.score, 0) / axes.length);

    return { strengths, opportunities, overallScore };
};

// ============================================================================
// COMPONENT
// ============================================================================

interface HealthRadarProps {
    /** Pre-calculated savings rate (0-100) */
    savingsRate?: number;
    /** Pre-calculated expense stability (0-100) */
    expenseStability?: number;
    /** Pre-calculated cash runway in months */
    cashRunway?: number;
    /** Pre-calculated financial discipline (0-100) */
    financialDiscipline?: number;
}

export const HealthRadar: React.FC<HealthRadarProps> = ({
    savingsRate = 0,
    expenseStability = 0,
    cashRunway = 0,
    financialDiscipline = 0
}) => {
    const { dailyTransactions } = useData();

    // Calculate investment ratio from transactions
    const investmentRatio = useMemo(() => {
        const { clean: cleanTransactions } = sanitizeTransactions(dailyTransactions, {
            filterZeroAmounts: true,
            filterFutureDates: true,
            detectOutliers: false
        });

        if (cleanTransactions.length === 0) return 0;

        // Aggregate by cycle to get per-cycle totals
        const cycleTotals: Record<string, { income: number; investment: number }> = {};
        const currentCycleId = getCycleId(new Date().toISOString().slice(0, 10));

        cleanTransactions.forEach(t => {
            const cycleId = getCycleId(t.date);
            if (cycleId === currentCycleId) return; // Skip incomplete current cycle

            if (!cycleTotals[cycleId]) {
                cycleTotals[cycleId] = { income: 0, investment: 0 };
            }

            if (t.type === 'income') {
                cycleTotals[cycleId].income += t.amount;
            } else if (t.type === 'investment') {
                cycleTotals[cycleId].investment += t.amount;
            }
        });

        const cycles = Object.values(cycleTotals);
        if (cycles.length === 0) return 0;

        const totalIncome = cycles.reduce((sum, c) => sum + c.income, 0);
        const totalInvestment = cycles.reduce((sum, c) => sum + c.investment, 0);

        if (totalIncome === 0) return 0;
        return Math.round((totalInvestment / totalIncome) * 100);
    }, [dailyTransactions]);

    // Calculate health scores
    const healthAxes = useMemo(() => {
        return calculateHealthScores({
            savingsRate,
            expenseStability,
            cashRunway,
            financialDiscipline,
            investmentRatio
        });
    }, [savingsRate, expenseStability, cashRunway, financialDiscipline, investmentRatio]);

    // Analyze strengths and opportunities
    const analysis = useMemo(() => analyzeHealth(healthAxes), [healthAxes]);

    // Format data for Recharts
    const chartData = healthAxes.map(axis => ({
        subject: axis.shortLabel,
        score: axis.score,
        fullMark: 100
    }));

    // Color based on overall score
    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-emerald-500';
        if (score >= 40) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreBg = (score: number) => {
        if (score >= 70) return 'bg-emerald-500';
        if (score >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            Radar de Salud Financiera
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            5 dimensiones normalizadas
                        </p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(analysis.overallScore)} text-white`}>
                    {analysis.overallScore}
                </div>
            </div>

            {/* Radar Chart */}
            <div className="p-4">
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
                            <PolarGrid
                                stroke="currentColor"
                                className="text-slate-200 dark:text-white/10"
                            />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{
                                    fill: 'currentColor',
                                    fontSize: 11,
                                    className: 'text-slate-600 dark:text-slate-400'
                                }}
                            />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                            />
                            <Radar
                                name="Score"
                                dataKey="score"
                                stroke="#3B82F6"
                                fill="#3B82F6"
                                fillOpacity={0.3}
                                strokeWidth={2}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '8px'
                                }}
                                formatter={(value: number) => [`${value}/100`, 'Score']}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Metrics Table */}
            <div className="px-6 pb-4">
                <div className="grid grid-cols-5 gap-2 text-center">
                    {healthAxes.map((axis) => (
                        <div key={axis.axis} className="text-xs">
                            <p className={`font-bold ${getScoreColor(axis.score)}`}>
                                {axis.rawValue}{axis.unit}
                            </p>
                            <p className="text-slate-400 truncate" title={axis.axis}>
                                vs {axis.reference}{axis.referenceUnit}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Analysis */}
            <div className="px-6 pb-6 space-y-3">
                {analysis.strengths.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Fortalezas: </span>
                            <span className="text-slate-600 dark:text-slate-300">
                                {analysis.strengths.join(', ')}
                            </span>
                        </div>
                    </div>
                )}
                {analysis.opportunities.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                        <TrendingDown className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-medium text-amber-600 dark:text-amber-400">Oportunidades: </span>
                            <span className="text-slate-600 dark:text-slate-300">
                                {analysis.opportunities.join(', ')}
                            </span>
                        </div>
                    </div>
                )}
                {analysis.strengths.length === 0 && analysis.opportunities.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <AlertCircle className="w-4 h-4" />
                        <span>Datos insuficientes para análisis detallado</span>
                    </div>
                )}
                {investmentRatio === 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                        <AlertCircle className="w-3 h-3" />
                        <span>No hay datos de inversión registrados</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HealthRadar;
