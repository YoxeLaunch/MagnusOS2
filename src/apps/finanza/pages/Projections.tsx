
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, ShieldCheck, Target, Award, Calendar, Info } from 'lucide-react';
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
import { RiskAlert } from '../components/RiskAlert';

export const Projections: React.FC = () => {
    const { dailyTransactions } = useData();
    const [manualEvents, setManualEvents] = useState<ManualEvent[]>([]);

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

        // Safety check for empty data after sanitization
        if (cleanTransactions.length === 0) {
            return {
                projectionData: [],
                modelConfidence: { income: 0, expense: 0, average: 0, method: 'none' as const },
                trends: { incomeSlope: 0, expenseSlope: 0 }
            };
        }

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
        // We identify the current cycle ID based on today's date
        const currentCycleId = getCycleId(new Date().toISOString().slice(0, 10));

        const incomePoints = Object.entries(cycleTotals)
            .filter(([id]) => id !== currentCycleId) // Exclude current incomplete cycle
            .map(([_, v]) => ({ date: v.date, value: v.income }));

        const expensePoints = Object.entries(cycleTotals)
            .filter(([id]) => id !== currentCycleId)
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
                savingsRate: Math.max(0, Math.round(((predIncome - predExpense) / predIncome) * 100))
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

        if (avgIncome === 0) return 0;
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

        if (avgMonthlyExpense === 0) return 0;
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
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Calendar className="text-primary" size={32} />
                        Proyección Financiera 2026
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                        Motor de predicción estocástica y determinista para visualizar tu futuro financiero.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        AI ACTIVE
                    </span>
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-mono text-sm font-bold border border-primary/20">
                        CYCLE: 2024-Q3
                    </div>
                </div>
            </div>

            {/* SECTION 1: RISK & HIGH LEVEL METRICS (The "Brain") */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* PRIMARY: Monte Carlo Engine */}
                <div className="xl:col-span-8 space-y-6">
                    {/* Risk Alert Banner */}
                    <RiskAlert
                        savingsRate={savingsRate}
                        cashRunway={cashRunway}
                        financialDiscipline={financialDiscipline}
                        incomeTrend={trends.incomeSlope}
                        expenseTrend={trends.expenseSlope}
                    />

                    {/* Monte Carlo Hero Card */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-0 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden min-h-[500px]">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Target size={20} className="text-primary" />
                                Simulación de Probabilidad (Monte Carlo)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Proyección de 1,000 escenarios posibles basados en tu volatilidad histórica.
                            </p>
                        </div>
                        <div className="p-2">
                            <MonteCarloRisk />
                        </div>
                    </div>
                </div>

                {/* SIDE RAIL: KPIs & Confidence */}
                <div className="xl:col-span-4 space-y-6">

                    {/* Confidence Widget */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider">Confianza del Modelo</h4>
                            <Info size={16} className="text-slate-400" />
                        </div>

                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-4xl font-extrabold ${modelConfidence.average >= 70 ? 'text-emerald-500' : modelConfidence.average >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                {modelConfidence.average}%
                            </span>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                    {modelConfidence.method === 'seasonal' && 'Estacional'}
                                    {modelConfidence.method === 'linear' && 'Lineal'}
                                    {modelConfidence.method === 'average' && 'Promedio'}
                                    {modelConfidence.method === 'none' && 'Insuficiente'}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase">Algoritmo</span>
                            </div>
                        </div>

                        <div className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mb-4">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${modelConfidence.average >= 70 ? 'bg-emerald-500' : modelConfidence.average >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${modelConfidence.average}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                            Basado en la calidad y consistencia de tus datos históricos.
                        </p>
                    </div>

                    {/* Compact KPI Stack */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                        <KPICompact title="Tasa de Ahorro" value={savingsRate} suffix="%" icon={TrendingUp} color="emerald" userValue="Healthy" />
                        <KPICompact title="Pista de Efectivo" value={cashRunway} suffix=" mo" icon={Award} color="amber" userValue="Caution" />
                        <KPICompact title="Disciplina" value={financialDiscipline} suffix="%" icon={ShieldCheck} color="blue" />
                    </div>

                    {/* Scenario Simulator Mini */}
                    <div className="bg-indigo-900/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                        <h4 className="font-bold text-indigo-700 dark:text-indigo-300 text-sm mb-2 flex items-center gap-2">
                            <Target size={16} /> Simulador Rápido
                        </h4>
                        <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mb-3">
                            Ajusta parámetros globales para ver impacto en tiempo real.
                        </p>
                        <ScenarioSimulator />
                    </div>
                </div>
            </div>

            {/* SECTION 2: DETERMINISTIC PROJECTION (Traditional View) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Cash Flow Area Chart */}
                <div className="lg:col-span-2 bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative group hover:border-blue-500/20 transition-all">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-500" />
                        Flujo de Caja Esperado
                    </h3>
                    <div className="h-[300px]">
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
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(4px)' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                                <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* KPI Charts Stack */}
                <div className="space-y-6">
                    {/* Savings Trend */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm h-[180px] flex flex-col">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tendencia de Ahorro</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={projectionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" hide />
                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                    <Line type="monotone" dataKey="savingsRate" stroke="#8B5CF6" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Accumulation Bar */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm h-[180px] flex flex-col">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Acumulación Estimada</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                                    <Bar dataKey="ahorro" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: PLANNING & LONG TERM (FIRE / Health) */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="text-primary" />
                    Salud a Largo Plazo
                </h2>
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

            {/* SECTION 4: DETAILED BREAKDOWN (Collapsible or Bottom) */}
            <div className="pt-8 border-t border-slate-200 dark:border-white/10">
                <h2 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wider text-sm">
                    Análisis Detallado
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ManualEventInput
                        events={manualEvents}
                        onAddEvent={(e) => setManualEvents(prev => [...prev, e])}
                        onRemoveEvent={(id) => setManualEvents(prev => prev.filter(e => e.id !== id))}
                    />
                    <div className="space-y-6">
                        <CategoryCohort />
                        <SpendingHeatmap />
                    </div>
                </div>
                <div className="mt-8">
                    <FinancialSankey />
                </div>
            </div>

        </div>
    );
};

// --- SUB COMPONENTS (Local for layout polish) ---

const KPICompact = ({ title, value, suffix, icon: Icon, color }: any) => {
    const colorClasses: any = {
        emerald: 'text-emerald-500 bg-emerald-500/10',
        amber: 'text-amber-500 bg-amber-500/10',
        blue: 'text-blue-500 bg-blue-500/10',
        indigo: 'text-indigo-500 bg-indigo-500/10',
        purple: 'text-purple-500 bg-purple-500/10'
    };
    const activeColor = colorClasses[color] || colorClasses['blue'];

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                    {value}<span className="text-sm font-medium text-slate-400">{suffix}</span>
                </p>
            </div>
            <div className={`p-3 rounded-xl ${activeColor}`}>
                <Icon size={20} />
            </div>
        </div>
    )
}

