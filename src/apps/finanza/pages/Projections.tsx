
import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, ShieldCheck, Target, Award, Calendar, Info, Gauge, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { calculateTrend } from '../utils/prediction';
import { getFinancialCycle, getCycleId, getCycleFromId } from '../utils/financialCycle';
import { sanitizeTransactions } from '../utils/dataQuality';

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

export const Projections: React.FC = () => {
    const { dailyTransactions } = useData();
    const { user } = useAuth();
    const [manualEvents, setManualEvents] = useState<ManualEvent[]>([]);

    // Econometric data states
    const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
    const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
    const [mpcBeta, setMpcBeta] = useState<number | null>(null);
    const [mpcInterpretation, setMpcInterpretation] = useState('');
    const [mpcMps, setMpcMps] = useState(0);

    // Fetch econometric data from backend
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

        // MPC Dashboard
        apiFetch(`/api/econometrics/dashboard?userId=${user.username}`)
            .then(r => r.json())
            .then(data => {
                if (data?.mpc) {
                    setMpcBeta(data.mpc.beta);
                    setMpcInterpretation(data.mpc.interpretation);
                    setMpcMps(data.mpc.mps);
                }
            })
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

        // Log warnings in development for debugging
        if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
            console.warn('[Projections] Data quality warnings:', warnings);
        }

        // We removed the early return for empty cleanTransactions so the fallback baseline logic runs.

        // 1. Aggregate Transactions into Cycle Totals
        const cycleTotals: Record<string, { income: number, expense: number, investment: number, date: Date }> = {};

        cleanTransactions.forEach(t => {
            const cycleId = getCycleId(t.date);
            if (!cycleTotals[cycleId]) {
                const cycle = getCycleFromId(cycleId);
                // Use the cycle end date as the representative date for the chart
                cycleTotals[cycleId] = { income: 0, expense: 0, investment: 0, date: cycle.end };
            }
            if (t.type === 'income') cycleTotals[cycleId].income += t.amount;
            else if (t.type === 'investment') cycleTotals[cycleId].investment += t.amount;
            else cycleTotals[cycleId].expense += t.amount;
        });

        // 2. Convert to arrays and exclude current (incomplete) cycle
        // Use local date components (NOT toISOString which is UTC and can differ by 1 day)
        const today = new Date();
        const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const currentCycleId = getCycleId(localDateStr);

        // For income: only include cycles that actually had income (exclude zero-income cycles
        // which are typically partial/transition cycles and skew averages downward)
        const incomePoints = Object.entries(cycleTotals)
            .filter(([id]) => id !== currentCycleId)
            .filter(([_, v]) => v.income > 0) // Only cycles with real income data
            .map(([_, v]) => ({ date: v.date, value: v.income }));

        // For expenses: include all non-current cycles (even zero-expense cycles are valid)
        const expensePoints = Object.entries(cycleTotals)
            .filter(([id]) => id !== currentCycleId)
            .filter(([_, v]) => v.expense > 0) // Only cycles with real expense data
            .map(([_, v]) => ({ date: v.date, value: v.expense }));

        // 3. Calculate Trends AND extract confidence
        const incomeTrend = calculateTrend(incomePoints);
        const expenseTrend = calculateTrend(expensePoints);

        // Calculate model confidence (average of both trends, clamped to 0-1)
        const incomeConfidence = incomeTrend?.confidence ?? 0;
        const expenseConfidence = expenseTrend?.confidence ?? 0;
        const avgConfidence = (incomeConfidence + expenseConfidence) / 2;
        const method = incomeTrend?.method ?? expenseTrend?.method ?? 'none';

        // 4. Generate Projections for Next 12 Cycles
        const projectedMonths = [];
        const cyclesToProject = 12;

        for (let i = 1; i <= cyclesToProject; i++) {
            // Logic to get next cycle date
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + i);
            const cycle = getFinancialCycle(futureDate);

            // Baseline if no data (Manual fallback for cold start)
            let predIncome = incomeTrend ? incomeTrend.predict(cycle.end) : 4500;
            let predExpense = expenseTrend ? expenseTrend.predict(cycle.end) : 2800;

            // Safety floor: if trend predicts 0 or negative income (can happen with sparse data),
            // fall back to a minimum baseline so downstream metrics don't break
            if (predIncome <= 0 && incomeTrend?.average && incomeTrend.average > 0) {
                predIncome = incomeTrend.average;
            } else if (predIncome <= 0) {
                predIncome = 4500; // cold-start baseline
            }
            if (predExpense < 0) predExpense = 0;

            // Apply Manual Events
            const monthEvents = manualEvents.filter(e => e.monthOffset === i);
            monthEvents.forEach(e => {
                if (e.type === 'income') predIncome += e.amount;
                else predExpense += e.amount;
            });

            projectedMonths.push({
                name: cycle.label,
                ingresos: Math.round(predIncome),
                gastos: Math.round(predExpense),
                ahorro: Math.round(predIncome - predExpense),
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

    // ==================== PROFESSIONAL FINANCIAL METRICS ====================

    // 1. SAVINGS RATE (Tasa de Ahorro) - CORRECTED FORMULA
    const savingsRate = useMemo(() => {
        if (projectionData.length === 0) return 0;
        // Average savings rate across all projected months
        const avgIncome = projectionData.reduce((acc, curr) => acc + curr.ingresos, 0) / projectionData.length;
        const avgExpense = projectionData.reduce((acc, curr) => acc + curr.gastos, 0) / projectionData.length; // Consumption Expense

        if (!avgIncome || avgIncome <= 0) return 0;
        // Calculation: (Income - Consumption) / Income = Savings Rate
        return Math.max(0, Math.round(((avgIncome - avgExpense) / avgIncome) * 100));
    }, [projectionData]);

    // 2. FINANCIAL DISCIPLINE (Disciplina Financiera) - REAL CALCULATION
    const financialDiscipline = useMemo(() => {
        if (!dailyTransactions || dailyTransactions.length === 0) return 0;

        // Calculate unique days with transactions in the last 90 days
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

    // 3. PLAN ADHERENCE (Adherencia al Plan) - REAL CALCULATION
    const planAdherence = useMemo(() => {
        if (projectionData.length === 0) return 0;

        // Measure: What percentage of months have positive savings?
        const monthsWithPositiveSavings = projectionData.filter(p => p.ahorro > 0).length;
        return Math.round((monthsWithPositiveSavings / projectionData.length) * 100);
    }, [projectionData]);

    // 4. CASH RUNWAY (Pista de Efectivo) - NEW METRIC
    const cashRunway = useMemo(() => {
        if (projectionData.length === 0) return 0;

        // Calculate average monthly expense from projections
        const avgMonthlyExpense = projectionData.reduce((acc, curr) => acc + curr.gastos, 0) / projectionData.length;

        // Get current savings (sum of all positive savings from projections as proxy)
        // In a real scenario, this would come from actual account balances + Investments
        // Since we don't have a "Total Balance" prop yet, we use projected accumulation + any manual investment logic if needed
        const estimatedSavings = projectionData.reduce((acc, curr) => acc + (curr.ahorro > 0 ? curr.ahorro : 0), 0);

        if (!avgMonthlyExpense || avgMonthlyExpense <= 0) return 0;
        return Number((estimatedSavings / avgMonthlyExpense).toFixed(1));
    }, [projectionData]);

    // 5. EXPENSE VOLATILITY (Volatilidad de Gastos) - NEW METRIC
    const expenseStability = useMemo(() => {
        if (projectionData.length < 2) return 100; // Perfect if no variance possible

        const expenses = projectionData.map(p => p.gastos);
        const avgExpense = expenses.reduce((a, b) => a + b, 0) / expenses.length;

        // Calculate standard deviation
        const variance = expenses.reduce((sum, e) => sum + Math.pow(e - avgExpense, 2), 0) / expenses.length;
        const stdDev = Math.sqrt(variance);

        // Convert to stability score (lower volatility = higher stability)
        if (avgExpense === 0) return 100;
        const volatilityPercent = (stdDev / avgExpense) * 100;

        // Invert so that low volatility = high score
        return Math.max(0, Math.round(100 - Math.min(100, volatilityPercent)));
    }, [projectionData]);

    return (
        <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 pb-32">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Calendar className="text-primary" size={32} />
                        Proyecciones Financieras
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl font-sans">
                        Motor de predicción basado en tus transacciones diarias.
                    </p>
                </div>
            </div>

            {/* SECTION 1: HIGH LEVEL METRICS (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPI
                    title="TASA DE AHORRO"
                    score={savingsRate}
                    subtitle="Saludable"
                    icon={TrendingUp}
                    color="text-emerald-500"
                    bg="bg-emerald-500/10"
                    desc="Porcentaje de tus ingresos totales que logras retener mes a mes."
                />
                <KPI
                    title="PISTA DE EFECTIVO"
                    score={cashRunway}
                    isPercentage={false}
                    suffix=" mo"
                    subtitle="Estabilidad"
                    icon={Award}
                    color="text-amber-500"
                    bg="bg-amber-500/10"
                    desc="Meses que podrías sobrevivir con tus ahorros actuales sin ingresos."
                />
                <KPI
                    title="DISCIPLINA (90D)"
                    score={financialDiscipline}
                    subtitle="Consistencia"
                    icon={ShieldCheck}
                    color="text-blue-500"
                    bg="bg-blue-500/10"
                    desc="Frecuencia y consistencia en el registro de tus transacciones."
                />
                <KPI
                    title="PROYECCIÓN NETA"
                    score={Math.round(projectionData.reduce((acc, c) => acc + c.ahorro, 0) / 1000)}
                    isPercentage={false}
                    suffix="k"
                    subtitle="Capital Anual"
                    icon={Target}
                    color="text-purple-500"
                    bg="bg-purple-500/10"
                    desc="Ahorro total estimado para los próximos 12 ciclos financieros."
                />
            </div>

            {/* SECTION 2: CHARTS & VISUALIZATIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Cash Flow Area Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-blue-500/30 transition-all duration-300">
                    <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white mb-6">
                        Flujo de Caja Proyectado 2026
                    </h3>
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
                                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value} `} />
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
                    {/* Savings Rate Trend (Line) */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-blue-500/30 transition-all duration-300">
                        <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white mb-6">
                            Curva de Tasa de Ahorro
                        </h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={projectionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    />
                                    <Line type="monotone" dataKey="savingsRate" name="Tasa de Ahorro %" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, fill: '#8B5CF6' }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Savings Growth (Bar) */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-blue-500/30 transition-all duration-300">
                        <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white mb-6">
                            Acumulación de Capital
                        </h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                    <XAxis dataKey="name" hide />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    />
                                    <Bar dataKey="ahorro" name="Ahorro Mensual" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: ECONOMETRIC MODELS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 30-Day Liquidity Forecast with Confidence Bands (2/3 width) */}
                <div className="lg:col-span-2 bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-cyan-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="text-cyan-500" size={20} />
                            Previsión de Liquidez — 30 Días
                        </h3>
                        {forecastSummary && (
                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                                forecastSummary.confidence === 'high' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : forecastSummary.confidence === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                            }`}>
                                Confianza: {forecastSummary.confidence === 'high' ? 'Alta' : forecastSummary.confidence === 'medium' ? 'Media' : 'Baja'}
                            </span>
                        )}
                    </div>

                    {forecastData.length > 0 ? (
                        <div className="h-[350px]">
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
                        <div className="h-[350px] flex items-center justify-center text-slate-400 text-sm">
                            Se requieren al menos 14 días de datos para generar la previsión.
                        </div>
                    )}

                    {forecastSummary?.riskDate && (
                        <div className="mt-4 flex items-center gap-2 text-xs bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl">
                            <AlertTriangle size={14} />
                            <span className="font-bold">Alerta:</span> El saldo podría caer al límite de seguridad el {new Date(forecastSummary.riskDate + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })}.
                        </div>
                    )}
                </div>

                {/* MPC Gauge (1/3 width) */}
                <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-purple-500/30 transition-all duration-300">
                    <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                        <Gauge className="text-purple-500" size={20} />
                        Coeficiente β (PMC)
                    </h3>
                    {mpcBeta !== null ? (
                        <div className="text-center">
                            <div className="relative w-40 h-40 mx-auto mb-6">
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
                                    <span className={`text-3xl font-bold ${
                                        mpcBeta >= 0.85 ? 'text-red-500' : mpcBeta >= 0.65 ? 'text-amber-500' : 'text-emerald-500'
                                    }`}>
                                        {(mpcBeta * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono mt-1">β = {mpcBeta}</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 px-2">
                                {mpcInterpretation}
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Consumo</p>
                                    <p className={`text-lg font-bold ${
                                        mpcBeta >= 0.85 ? 'text-red-500' : mpcBeta >= 0.65 ? 'text-amber-500' : 'text-emerald-500'
                                    }`}>{(mpcBeta * 100).toFixed(0)}¢</p>
                                    <p className="text-[10px] text-slate-400">por cada ₱1</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ahorro</p>
                                    <p className="text-lg font-bold text-emerald-500">{(mpcMps * 100).toFixed(0)}¢</p>
                                    <p className="text-[10px] text-slate-400">por cada ₱1</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-4">
                                Objetivo: Reducir β progresivamente para maximizar la capitalización.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center text-sm text-slate-400 py-12">
                            Cargando datos econométricos...
                        </div>
                    )}
                </div>
            </div>

            {/* Category Cohort Analysis - Independent Section */}
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                <CategoryCohort />
            </div>


            {/* Advanced Analysis Section */}
            <div className="space-y-8">
                <MonteCarloRisk />

                {/* Scenario Simulator + Manual Events side by side: neither needs full width */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    <ScenarioSimulator />
                    <ManualEventInput
                        events={manualEvents}
                        onAddEvent={(e) => setManualEvents(prev => [...prev, e])}
                        onRemoveEvent={(id) => setManualEvents(prev => prev.filter(e => e.id !== id))}
                    />
                </div>

                {/* Heatmap and Sankey need horizontal room, kept full width */}
                <SpendingHeatmap />
                <FinancialSankey />
            </div>

            {/* FIRE & Health Radar Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FIRECalculator
                    avgAnnualIncome={projectionData.length > 0 ? projectionData.reduce((a, p) => a + p.ingresos, 0) / projectionData.length : 0}
                    avgAnnualExpenses={projectionData.length > 0 ? projectionData.reduce((a, p) => a + p.gastos, 0) / projectionData.length : 0}
                    savingsRate={savingsRate}
                />
                <HealthRadar
                    savingsRate={savingsRate}
                    expenseStability={expenseStability}
                    cashRunway={cashRunway}
                    financialDiscipline={financialDiscipline}
                />
            </div>
        </div>
    );
};

// Reverting to the Layout with Standard KPI Component (Not Compact)
const KPI = ({ title, score, icon: Icon, subtitle, color, bg, desc, isPercentage = true, suffix = '' }: any) => (
    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-blue-600/50 transition-colors">
        <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl ${bg} ${color}`}>
            <Icon size={24} />
        </div>
        <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <h2 className={`text-4xl font-bold ${color}`}>
                    {score}{isPercentage ? '%' : suffix}
                </h2>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mt-4 mb-2">{subtitle}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%]">
                {desc}
            </p>
        </div>
        {isPercentage && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-white/5">
                <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(100, score)}%` }}></div>
            </div>
        )}
    </div>
);
