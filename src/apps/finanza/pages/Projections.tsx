import React, { useMemo, useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import {
    TrendingUp, ShieldCheck, Target, Award, Calendar, Info, Gauge, AlertTriangle,
    Layers, Scale, Activity, BarChart3, Cpu, Sparkles, Network, PieChart as PieChartIcon,
    ArrowUpRight, ArrowDownRight, Clock, HelpCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { calculateTrend } from '../utils/prediction';
import { getPortfolioSnapshot, formatCurrency } from '../utils/calculations';
import { getFinancialCycle, getCycleId, getCycleFromId } from '../utils/financialCycle';
import { sanitizeTransactions } from '../utils/dataQuality';
import { formatPeriodLong } from '../utils/bankingFormatters';

import { MonteCarloRisk } from '../components/MonteCarloRisk';
import { FinancialSankey } from '../components/FinancialSankey';
import { FIRECalculator } from '../components/FIRECalculator';
import { HealthRadar } from '../components/HealthRadar';
import { ScenarioSimulator } from '../components/ScenarioSimulator';
import { CategoryCohort } from '../components/CategoryCohort';
import { SpendingHeatmap } from '../components/SpendingHeatmap';
import { ManualEventInput, ManualEvent } from '../components/ManualEventInput';
import { useAuth } from '../../../shared/context/AuthContext';
import { apiFetch } from '../../../shared/utils/apiFetch';
import { ConvergenceTab } from '../components/ConvergenceTab';
import { cashFlowApi, NetWorthResponse } from '../api/finanzaApi';

interface ForecastPoint {
    date: string;
    dayOfWeek: number;
    predictedFlow: number;
    balance: number;
    upperBound: number;
    lowerBound: number;
    horizon: number;
}

interface ForecastSummary {
    minBalance: number;
    riskDate: string | null;
    avgDailyBurn: number;
    daysUntilCritical: number | null;
    confidence: string;
}

type LabGroup = 'resumen' | 'historico' | 'mece' | 'simulaciones';

export const Projections: React.FC = () => {
    const { data, dailyTransactions, currencies } = useData();
    const { user } = useAuth();

    // Misma fuente de verdad que Wealth.tsx, Investments.tsx y PrintReport.tsx
    const portfolio = useMemo(() => getPortfolioSnapshot(data, dailyTransactions, currencies), [data, dailyTransactions, currencies]);
    const [manualEvents, setManualEvents] = useState<ManualEvent[]>([]);

    // Navigation and grouping
    const [activeGroup, setActiveGroup] = useState<LabGroup>('resumen');
    const [historicalView, setHistoricalView] = useState<'flujo' | 'cohortes' | 'distribucion'>('flujo');
    const [simulationView, setSimulationView] = useState<'montecarlo' | 'fire' | 'escenarios' | 'salud'>('montecarlo');

    // Econometric data states
    const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
    const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
    const [mpcBeta, setMpcBeta] = useState<number | null>(null);
    const [mpcInterpretation, setMpcInterpretation] = useState('');
    const [mpcMps, setMpcMps] = useState(0);
    const [mpcDataPoints, setMpcDataPoints] = useState<number>(0);
    const [mpcRSquared, setMpcRSquared] = useState<number>(0);

    // MECE compact reference state
    const [meceNetWorth, setMeceNetWorth] = useState<NetWorthResponse | null>(null);

    // Fetch econometric data & canonical MECE wealth
    useEffect(() => {
        if (!user?.username) return;

        // Forecast
        apiFetch(`/api/econometrics/forecast?userId=${user.username}`)
            .then(r => r.json())
            .then(data => {
                if (data?.forecast) setForecastData(data.forecast);
                if (data?.summary) setForecastSummary(data.summary);
            })
            .catch(() => {});

        // MPC Dashboard (BPMC / OLS Regression)
        apiFetch(`/api/econometrics/dashboard?userId=${user.username}`)
            .then(r => r.json())
            .then(data => {
                if (data?.mpc) {
                    setMpcBeta(data.mpc.beta);
                    setMpcInterpretation(data.mpc.interpretation);
                    setMpcMps(data.mpc.mps);
                    setMpcDataPoints(data.mpc.dataPoints ?? 0);
                    setMpcRSquared(data.mpc.rSquared ?? 0);
                }
            })
            .catch(() => {});

        // Canonical wealth for MECE reference
        cashFlowApi.getNetWorth({ asOfDate: new Date().toISOString().slice(0, 10) })
            .then(nw => setMeceNetWorth(nw))
            .catch(() => {});
    }, [user?.username]);

    // Combined projection memo that returns both projection data and confidence info
    const { projectionData, modelConfidence, trends } = useMemo(() => {
        // 0. Sanitize transactions (filter invalid dates, zeros, duplicates)
        const { clean: cleanTransactions, warnings } = sanitizeTransactions(dailyTransactions, {
            filterZeroAmounts: true,
            filterFutureDates: true,
            detectOutliers: true,
            outlierZThreshold: 3
        });

        // 1. Aggregate Transactions into Cycle Totals
        const cycleTotals: Record<string, { income: number, expense: number, investment: number, date: Date }> = {};

        cleanTransactions.forEach(t => {
            const cycleId = getCycleId(t.date);
            if (!cycleTotals[cycleId]) {
                const cycle = getCycleFromId(cycleId);
                cycleTotals[cycleId] = { income: 0, expense: 0, investment: 0, date: cycle.end };
            }
            if (t.type === 'income') cycleTotals[cycleId].income += t.amount;
            else if (t.type === 'investment') cycleTotals[cycleId].investment += t.amount;
            else cycleTotals[cycleId].expense += t.amount;
        });

        // 2. Convert to arrays and exclude current (incomplete) cycle
        const today = new Date();
        const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const currentCycleId = getCycleId(localDateStr);

        const incomePoints = Object.entries(cycleTotals)
            .filter(([id]) => id !== currentCycleId)
            .filter(([_, v]) => v.income > 0)
            .map(([_, v]) => ({ date: v.date, value: v.income }));

        const expensePoints = Object.entries(cycleTotals)
            .filter(([id]) => id !== currentCycleId)
            .filter(([_, v]) => v.expense > 0)
            .map(([_, v]) => ({ date: v.date, value: v.expense }));

        // 3. Calculate Trends
        const incomeTrend = calculateTrend(incomePoints);
        const expenseTrend = calculateTrend(expensePoints);

        const incomeConfidence = incomeTrend?.confidence ?? 0;
        const expenseConfidence = expenseTrend?.confidence ?? 0;
        const avgConfidence = (incomeConfidence + expenseConfidence) / 2;
        const method = incomeTrend?.method ?? expenseTrend?.method ?? 'none';

        // 4. Generate Projections for Next 12 Cycles with cumulative tracking
        const projectedMonths = [];
        const cyclesToProject = 12;
        let runningAccumulatedSavings = 0;

        for (let i = 1; i <= cyclesToProject; i++) {
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + i);
            const cycle = getFinancialCycle(futureDate);

            let predIncome = incomeTrend ? incomeTrend.predict(cycle.end) : 4500;
            let predExpense = expenseTrend ? expenseTrend.predict(cycle.end) : 2800;

            if (predIncome <= 0 && incomeTrend?.average && incomeTrend.average > 0) {
                predIncome = incomeTrend.average;
            } else if (predIncome <= 0) {
                predIncome = 4500;
            }
            if (predExpense < 0) predExpense = 0;

            // Apply Manual Events
            const monthEvents = manualEvents.filter(e => e.monthOffset === i);
            monthEvents.forEach(e => {
                if (e.type === 'income') predIncome += e.amount;
                else predExpense += e.amount;
            });

            const monthlyAhorro = Math.round(predIncome - predExpense);
            runningAccumulatedSavings += monthlyAhorro;

            projectedMonths.push({
                name: cycle.label,
                ingresos: Math.round(predIncome),
                gastos: Math.round(predExpense),
                ahorro: monthlyAhorro,
                ahorroAcumulado: runningAccumulatedSavings,
                savingsRate: predIncome > 0 ? Math.max(0, Math.round(((predIncome - predExpense) / predIncome) * 100)) : 0
            });
        }

        return {
            projectionData: projectedMonths,
            modelConfidence: {
                income: Math.round(incomeConfidence * 100),
                expense: Math.round(expenseConfidence * 100),
                average: Math.round(avgConfidence * 100),
                method: method
            },
            trends: {
                incomeSlope: incomeTrend?.slope ?? 0,
                expenseSlope: expenseTrend?.slope ?? 0
            }
        };
    }, [dailyTransactions, manualEvents]);

    // Financial Metrics
    const savingsRate = useMemo(() => {
        if (projectionData.length === 0) return 0;
        const avgIncome = projectionData.reduce((acc, curr) => acc + curr.ingresos, 0) / projectionData.length;
        const avgExpense = projectionData.reduce((acc, curr) => acc + curr.gastos, 0) / projectionData.length;
        if (!avgIncome || avgIncome <= 0) return 0;
        return Math.max(0, Math.round(((avgIncome - avgExpense) / avgIncome) * 100));
    }, [projectionData]);

    const financialDiscipline = useMemo(() => {
        if (!dailyTransactions || dailyTransactions.length === 0) return 0;
        const last90Days = 90;
        const now = new Date();
        const uniqueDaysWithData = new Set(
            dailyTransactions
                .filter(t => {
                    const txDate = new Date(t.date);
                    const daysDiff = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff >= 0 && daysDiff <= last90Days;
                })
                .map(t => t.date.slice(0, 10))
        ).size;
        return Math.round((uniqueDaysWithData / last90Days) * 100);
    }, [dailyTransactions]);

    const cashRunway = useMemo(() => {
        if (projectionData.length === 0) return 0;
        const avgMonthlyExpense = projectionData.reduce((acc, curr) => acc + curr.gastos, 0) / projectionData.length;
        if (!avgMonthlyExpense || avgMonthlyExpense <= 0) return 0;
        return Number((Math.max(0, portfolio.liquidAssets) / avgMonthlyExpense).toFixed(1));
    }, [projectionData, portfolio.liquidAssets]);

    const expenseStability = useMemo(() => {
        if (projectionData.length < 2) return 100;
        const expenses = projectionData.map(p => p.gastos);
        const avgExpense = expenses.reduce((a, b) => a + b, 0) / expenses.length;
        const variance = expenses.reduce((sum, e) => sum + Math.pow(e - avgExpense, 2), 0) / expenses.length;
        const stdDev = Math.sqrt(variance);
        if (avgExpense === 0) return 100;
        const volatilityPercent = (stdDev / avgExpense) * 100;
        return Math.max(0, Math.round(100 - Math.min(100, volatilityPercent)));
    }, [projectionData]);

    const totalProjectedSavings = useMemo(() => {
        return projectionData.reduce((acc, curr) => acc + curr.ahorro, 0);
    }, [projectionData]);

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 pb-32 animate-in fade-in duration-500 min-h-screen">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="text-emerald-500" size={32} />
                        Laboratorio Financiero
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-3xl font-sans text-sm">
                        Centro de análisis cuantitativo, modelos econométricos, convergencia macroeconómica MECE y simulaciones de riesgo.
                    </p>
                </div>

                {/* Primary Group Navigation Bar */}
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-white/10">
                    <button
                        onClick={() => setActiveGroup('resumen')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            activeGroup === 'resumen'
                                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <Gauge size={15} />
                        Resumen Cuantitativo
                    </button>
                    <button
                        onClick={() => setActiveGroup('historico')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            activeGroup === 'historico'
                                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <BarChart3 size={15} />
                        Análisis Histórico
                    </button>
                    <button
                        onClick={() => setActiveGroup('mece')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            activeGroup === 'mece'
                                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <Scale size={15} />
                        Convergencia MECE
                    </button>
                    <button
                        onClick={() => setActiveGroup('simulaciones')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            activeGroup === 'simulaciones'
                                ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <Cpu size={15} />
                        Simulaciones Avanzadas
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* GRUPO 1: RESUMEN FINANCIERO (MÉTRICAS CUANTITATIVAS CLAVE)                 */}
            {/* ========================================================================= */}
            {activeGroup === 'resumen' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Fila 1: 4 KPIs Principales de Resumen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPI
                            title="CAPACIDAD DE AHORRO"
                            score={savingsRate}
                            subtitle="Retención Neta"
                            icon={TrendingUp}
                            color="text-emerald-500"
                            bg="bg-emerald-500/10"
                            desc="Porcentaje proyectado de retención de ingresos tras cubrir gastos de consumo (Meta prudente: 20%)."
                        />
                        <KPI
                            title="PISTA DE EFECTIVO"
                            score={cashRunway}
                            isPercentage={false}
                            suffix=" meses"
                            subtitle="Autonomía de Liquidez"
                            icon={Award}
                            color="text-amber-500"
                            bg="bg-amber-500/10"
                            desc="Meses de cobertura operativa con la liquidez real actual sin requerir ingresos adicionales."
                        />
                        <KPI
                            title="PROYECCIÓN NETA (12M)"
                            score={Math.round(totalProjectedSavings / 1000)}
                            isPercentage={false}
                            suffix="k"
                            subtitle="Acumulación Estimada"
                            icon={Target}
                            color="text-purple-500"
                            bg="bg-purple-500/10"
                            desc={`Ahorro neto total proyectado para los próximos 12 ciclos: ${formatCurrency(totalProjectedSavings)}.`}
                        />
                        <KPI
                            title="DISCIPLINA CONTABLE (90D)"
                            score={financialDiscipline}
                            subtitle="Consistencia de Registros"
                            icon={ShieldCheck}
                            color="text-blue-500"
                            bg="bg-blue-500/10"
                            desc="Porcentaje de días con movimientos contables verificados en el Libro Mayor en los últimos 90 días."
                        />
                    </div>

                    {/* Fila 2: Modelos Econométricos — Previsión de Liquidez a 30 Días + Propensión Marginal al Consumo (PMC) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* 30-Day Liquidity Forecast (2/3 width) */}
                        <div className="lg:col-span-2 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
                                <div>
                                    <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <AlertTriangle className="text-cyan-500" size={20} />
                                        Previsión de Liquidez a 30 Días
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                                        Descomposición estacional aditiva con bandas de confianza al 95%
                                    </p>
                                </div>
                                {forecastSummary && (
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold font-mono ${
                                        forecastSummary.confidence === 'high' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                        : forecastSummary.confidence === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                        : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                                    }`}>
                                        Confianza: {forecastSummary.confidence === 'high' ? 'Alta' : forecastSummary.confidence === 'medium' ? 'Media' : 'Baja'}
                                    </span>
                                )}
                            </div>

                            {forecastData.length > 0 ? (
                                <div className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorBandUpper" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false}
                                                tickFormatter={(val) => new Date(val + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })} />
                                            <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false}
                                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                formatter={(value: number, name: string) => [
                                                    `RD$${value.toLocaleString()}`,
                                                    name === 'upperBound' ? 'Límite Superior (95%)'
                                                    : name === 'lowerBound' ? 'Límite Inferior (95%)'
                                                    : 'Balance Proyectado'
                                                ]}
                                                labelFormatter={(label) => new Date(label + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            />
                                            <Area type="monotone" dataKey="upperBound" name="upperBound" stroke="#06b6d4" strokeWidth={1} strokeDasharray="4 4" fillOpacity={0.3} fill="url(#colorBandUpper)" />
                                            <Area type="monotone" dataKey="lowerBound" name="lowerBound" stroke="#06b6d4" strokeWidth={1} strokeDasharray="4 4" fillOpacity={0} fill="transparent" />
                                            <Area type="monotone" dataKey="balance" name="balance" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[320px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                                    <Clock size={28} className="text-slate-500" />
                                    <span>Se requieren al menos 14 días de flujos continuos para calibrar el pronóstico de liquidez.</span>
                                </div>
                            )}

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
                                <span>Supuesto: flujo(t+h) = tendencia + estacionalidad(día_semana) ± 1.96·σ·√h</span>
                                <span>Proyección probabilística no vinculante</span>
                            </div>
                        </div>

                        {/* Marginal Propensity to Consume (PMC - BPMC) (1/3 width) */}
                        <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
                                    <div>
                                        <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <Gauge className="text-purple-500" size={20} />
                                            Propensión Marginal (PMC)
                                        </h3>
                                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                                            Coeficiente β (Regresión MCO: C = α + β·Y)
                                        </p>
                                    </div>
                                </div>

                                {mpcDataPoints >= 3 && mpcBeta !== null ? (
                                    <div className="text-center pt-2">
                                        <div className="relative w-36 h-36 mx-auto mb-4">
                                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5"
                                                    className="text-slate-100 dark:text-white/5" />
                                                <circle cx="18" cy="18" r="15.5" fill="none"
                                                    strokeWidth="2.5" strokeLinecap="round"
                                                    strokeDasharray={`${mpcBeta * 97.4} 97.4`}
                                                    className={mpcBeta >= 0.85 ? 'text-red-500' : mpcBeta >= 0.65 ? 'text-amber-500' : 'text-emerald-500'}
                                                    stroke="currentColor"
                                                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className={`text-2xl font-bold font-mono ${
                                                    mpcBeta >= 0.85 ? 'text-red-500' : mpcBeta >= 0.65 ? 'text-amber-500' : 'text-emerald-500'
                                                }`}>
                                                    {(mpcBeta * 100).toFixed(0)}%
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">β = {mpcBeta}</span>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 px-2">
                                            {mpcInterpretation}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 text-center font-mono">
                                            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-2.5">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Consumo (PMC)</p>
                                                <p className={`text-base font-bold ${
                                                    mpcBeta >= 0.85 ? 'text-red-500' : mpcBeta >= 0.65 ? 'text-amber-500' : 'text-emerald-500'
                                                }`}>{(mpcBeta * 100).toFixed(0)}¢</p>
                                                <p className="text-[9px] text-slate-400">por cada RD$1 extra</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-2.5">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ahorro (PMA)</p>
                                                <p className="text-base font-bold text-emerald-500">{(mpcMps * 100).toFixed(0)}¢</p>
                                                <p className="text-[9px] text-slate-400">por cada RD$1 extra</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 px-2 space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                                            <Info size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Datos Insuficientes</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed mt-1">
                                                Se requieren al menos 3 ciclos completos con ingresos registrados en el Libro Mayor para calibrar una pendiente de regresión válida.
                                            </p>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl text-[11px] font-mono text-slate-400 text-left">
                                            • Muestra actual: {mpcDataPoints} ciclos<br/>
                                            • Mínimo requerido: 3 ciclos<br/>
                                            • Definición: β = ΔConsumo / ΔIngreso
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 text-center font-mono">
                                Metodología: Mínimos Cuadrados Ordinarios (MCO)
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* GRUPO 2: ANÁLISIS HISTÓRICO (TRAYECTORIAS, COHORTES Y DISTRIBUCIÓN)         */}
            {/* ========================================================================= */}
            {activeGroup === 'historico' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Sub-selector de vistas históricas */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                        <button
                            onClick={() => setHistoricalView('flujo')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                historicalView === 'flujo'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white bg-slate-100 dark:bg-neutral-800'
                            }`}
                        >
                            Flujo de Caja y Ahorro
                        </button>
                        <button
                            onClick={() => setHistoricalView('cohortes')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                historicalView === 'cohortes'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white bg-slate-100 dark:bg-neutral-800'
                            }`}
                        >
                            Cohortes de Categorías
                        </button>
                        <button
                            onClick={() => setHistoricalView('distribucion')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                historicalView === 'distribucion'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white bg-slate-100 dark:bg-neutral-800'
                            }`}
                        >
                            Distribución de Dinero y Mapa
                        </button>
                    </div>

                    {historicalView === 'flujo' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Cash Flow Area Chart (2/3 width) */}
                            <div className="lg:col-span-2 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white">
                                            Flujo de Caja Proyectado a 12 Ciclos
                                        </h3>
                                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                                            Ingresos proyectados vs gastos estimados basados en series del Libro Mayor
                                        </p>
                                    </div>
                                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                        Confianza Modelo: {modelConfidence.average}%
                                    </span>
                                </div>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '12px' }}
                                            />
                                            <Legend iconType="circle" />
                                            <Area type="monotone" dataKey="ingresos" name="Ingresos Proyectados" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                                            <Area type="monotone" dataKey="gastos" name="Gastos Estimados" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Savings Charts Stack (1/3 width) */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* Savings Rate Trend */}
                                <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                                    <h3 className="text-base font-serif font-bold text-slate-800 dark:text-white mb-2">
                                        Curva de Tasa de Ahorro
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-mono mb-4">Trayectoria proyectada por ciclo (%)</p>
                                    <div className="h-[180px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                                <XAxis dataKey="name" fontSize={10} stroke="#9CA3AF" tickLine={false} />
                                                <YAxis domain={[0, 100]} fontSize={10} stroke="#9CA3AF" tickFormatter={(v) => `${v}%`} />
                                                <Tooltip
                                                    formatter={(v: number) => [`${v}%`, 'Tasa de Ahorro']}
                                                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                />
                                                <Line type="monotone" dataKey="savingsRate" name="Tasa de Ahorro %" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 3, fill: '#8B5CF6' }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Capital Accumulation (Cumulative Trajectory) */}
                                <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                                    <h3 className="text-base font-serif font-bold text-slate-800 dark:text-white mb-2">
                                        Acumulación de Capital (Ahorro Proyectado)
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-mono mb-4">Suma acumulativa de excedentes netos proyectados</p>
                                    <div className="h-[180px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                                <XAxis dataKey="name" fontSize={10} stroke="#9CA3AF" tickLine={false} />
                                                <YAxis fontSize={10} stroke="#9CA3AF" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                                                <Tooltip
                                                    formatter={(v: number) => [formatCurrency(v), 'Ahorro Acumulado']}
                                                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                />
                                                <Bar dataKey="ahorroAcumulado" name="Capital Acumulado" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {historicalView === 'cohortes' && (
                        <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                            <CategoryCohort />
                        </div>
                    )}

                    {historicalView === 'distribucion' && (
                        <div className="space-y-6">
                            <FinancialSankey />
                            <SpendingHeatmap />
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* GRUPO 3: CONVERGENCIA ECONÓMICA — MECE                                     */}
            {/* ========================================================================= */}
            {activeGroup === 'mece' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Compact MECE Reference Widget for Patrimonio Real */}
                    {meceNetWorth?.realNetWorth && (
                        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/80 border border-emerald-500/25 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                    <Scale size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-serif font-bold text-white text-base">Patrimonio Real Deflactado</h4>
                                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                                            meceNetWorth.realNetWorth.status === 'PROVISIONAL_PENDING_CPI'
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        }`}>
                                            {meceNetWorth.realNetWorth.status === 'PROVISIONAL_PENDING_CPI'
                                                ? `Provisional (IPC ${meceNetWorth.realNetWorth.cpiPeriodUsed})`
                                                : 'Oficial BCRD'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                                        Base de Precios: {meceNetWorth.realNetWorth.basePeriod} (IPC {meceNetWorth.realNetWorth.baseCpi}) | IPC Aplicado: {meceNetWorth.realNetWorth.cpiUsed ?? 'N/D'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 self-end md:self-auto">
                                <div className="text-right">
                                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Poder Real Actual</span>
                                    <span className="text-2xl font-bold font-serif text-emerald-400">
                                        {formatCurrency(meceNetWorth.realNetWorth.realNetWorth || 0)}
                                    </span>
                                </div>
                                {meceNetWorth.realNetWorth.inflationErosion !== null && (
                                    <div className="text-right border-l border-white/10 pl-6">
                                        <span className="text-[10px] uppercase font-mono text-slate-400 block">Erosión IPC</span>
                                        <span className="text-sm font-bold font-mono text-rose-400">
                                            -{formatCurrency(meceNetWorth.realNetWorth.inflationErosion || 0)} (-{meceNetWorth.realNetWorth.inflationErosionPct}%)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Visualizador integral de convergencia económica MECE */}
                    <div className="w-full">
                        <ConvergenceTab userId={user?.username} />
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* GRUPO 4: SIMULACIONES AVANZADAS (MONTE CARLO, FIRE, ESCENARIOS, SALUD)     */}
            {/* ========================================================================= */}
            {activeGroup === 'simulaciones' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Sub-selector de simulaciones */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                        <button
                            onClick={() => setSimulationView('montecarlo')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                simulationView === 'montecarlo'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white bg-slate-100 dark:bg-neutral-800'
                            }`}
                        >
                            Monte Carlo (Riesgo Estocástico)
                        </button>
                        <button
                            onClick={() => setSimulationView('fire')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                simulationView === 'fire'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white bg-slate-100 dark:bg-neutral-800'
                            }`}
                        >
                            Calculadora FIRE
                        </button>
                        <button
                            onClick={() => setSimulationView('escenarios')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                simulationView === 'escenarios'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white bg-slate-100 dark:bg-neutral-800'
                            }`}
                        >
                            Escenarios y Eventos Manuales
                        </button>
                        <button
                            onClick={() => setSimulationView('salud')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                simulationView === 'salud'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white bg-slate-100 dark:bg-neutral-800'
                            }`}
                        >
                            Radar de Salud Financiera
                        </button>
                    </div>

                    {/* Vistas modulares de simulación */}
                    {simulationView === 'montecarlo' && (
                        <div className="animate-in fade-in duration-200">
                            <MonteCarloRisk />
                        </div>
                    )}

                    {simulationView === 'fire' && (
                        <div className="animate-in fade-in duration-200">
                            <FIRECalculator
                                currentPortfolio={portfolio.netWorth}
                                avgAnnualIncome={projectionData.length > 0 ? projectionData.reduce((a, p) => a + p.ingresos, 0) / projectionData.length : 0}
                                avgAnnualExpenses={projectionData.length > 0 ? projectionData.reduce((a, p) => a + p.gastos, 0) / projectionData.length : 0}
                                savingsRate={savingsRate}
                            />
                        </div>
                    )}

                    {simulationView === 'escenarios' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start animate-in fade-in duration-200">
                            <ScenarioSimulator />
                            <ManualEventInput
                                events={manualEvents}
                                onAddEvent={(e) => setManualEvents(prev => [...prev, e])}
                                onRemoveEvent={(id) => setManualEvents(prev => prev.filter(e => e.id !== id))}
                            />
                        </div>
                    )}

                    {simulationView === 'salud' && (
                        <div className="max-w-2xl mx-auto animate-in fade-in duration-200">
                            <HealthRadar
                                savingsRate={savingsRate}
                                expenseStability={expenseStability}
                                cashRunway={cashRunway}
                                financialDiscipline={financialDiscipline}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Componente KPI Reutilizable para Resumen Cuantitativo
const KPI = ({ title, score, icon: Icon, subtitle, color, bg, desc, isPercentage = true, suffix = '' }: any) => (
    <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between">
        <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl ${bg} ${color}`}>
            <Icon size={22} />
        </div>
        <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <h2 className={`text-3xl font-serif font-bold ${color}`}>
                    {score}{isPercentage ? '%' : suffix}
                </h2>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mt-3 mb-1">{subtitle}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {desc}
            </p>
        </div>
        {isPercentage && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-white/5">
                <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }}></div>
            </div>
        )}
    </div>
);

export default Projections;
