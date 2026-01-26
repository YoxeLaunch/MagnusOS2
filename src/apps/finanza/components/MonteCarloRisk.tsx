import React, { useMemo } from 'react';
import { getCycleId, getCycleFromId } from '../utils/financialCycle';
import { runMonteCarloSimulation } from '../utils/monteCarlo';
import { useData } from '../context/DataContext';
import { AlertTriangle, CheckCircle, TrendingDown, HelpCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { sanitizeTransactions } from '../utils/dataQuality';

export const MonteCarloRisk: React.FC = () => {
    const { dailyTransactions } = useData();

    const simulationResult = useMemo(() => {
        // 0. Sanitize transactions before simulation
        const { clean: cleanTransactions } = sanitizeTransactions(dailyTransactions, {
            filterZeroAmounts: true,
            filterFutureDates: true,
            detectOutliers: false // Don't flag outliers, Monte Carlo already handles volatility
        });

        if (cleanTransactions.length === 0) return null;

        // 1. Aggregate Transactions into Cycle Totals
        const cycleTotals: Record<string, { income: number, expense: number }> = {};

        cleanTransactions.forEach(t => {
            const cycleId = getCycleId(t.date);
            if (!cycleTotals[cycleId]) {
                cycleTotals[cycleId] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') cycleTotals[cycleId].income += t.amount;
            else cycleTotals[cycleId].expense += t.amount;
        });

        const currentCycleId = getCycleId(new Date().toISOString().slice(0, 10));

        // Use ONLY closed cycles for history used in simulation
        const historyIncome = Object.entries(cycleTotals)
            .filter(([id]) => id !== currentCycleId)
            .map(([_, v]) => v.income);

        const historyExpense = Object.entries(cycleTotals)
            .filter(([id]) => id !== currentCycleId)
            .map(([_, v]) => v.expense);

        // Run Sim
        return runMonteCarloSimulation(historyIncome, historyExpense);
    }, [dailyTransactions]);

    if (!simulationResult) return null;

    const { p10, p50, p90, riskOfDeficit } = simulationResult;

    // Determine Risk Level Color
    let riskColor = "text-emerald-500";
    let riskBg = "bg-emerald-500/10";
    let riskLabel = "Bajo Riesgo";
    let RiskIcon = CheckCircle;

    if (riskOfDeficit > 20) {
        riskColor = "text-yellow-500";
        riskBg = "bg-yellow-500/10";
        riskLabel = "Riesgo Moderado";
        RiskIcon = HelpCircle; // Or caution icon
    }
    if (riskOfDeficit > 50) {
        riskColor = "text-red-500";
        riskBg = "bg-red-500/10";
        riskLabel = "Alto Riesgo";
        RiskIcon = AlertTriangle;
    }

    // Chart Data Construction
    // effectively visualizing the Bell Curve / Distribution roughly with 3 points
    const chartData = [
        { name: 'Pesimista (10%)', value: p10 },
        { name: 'Probable (50%)', value: p50 },
        { name: 'Optimista (90%)', value: p90 },
    ];

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:border-violet-500/30">
            <div className="flex flex-col md:flex-row gap-8 items-start">

                {/* Left: Stats & Context */}
                <div className="flex-1 space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <TrendingDown className="text-violet-500" />
                            Simulación de Riesgo (Monte Carlo)
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                            Hemos simulado <strong>2,000 futuros posibles</strong> para tu próximo ciclo basados en tu volatilidad histórica.
                            Este modelo predice qué tan probables son ciertos resultados financieros.
                        </p>
                    </div>

                    <div className={`p-4 rounded-xl border border-slate-100 dark:border-white/5 flex items-center gap-4 ${riskBg}`}>
                        <div className={`p-3 rounded-full bg-white dark:bg-black/20 ${riskColor}`}>
                            <RiskIcon size={24} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider font-bold opacity-70 mb-0.5">Probabilidad de Déficit</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black ${riskColor}`}>{riskOfDeficit}%</span>
                                <span className={`text-sm font-bold ${riskColor}`}>{riskLabel}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                            <p className="text-xs text-slate-400 mb-1">Pesimista (10%)</p>
                            <p className="font-bold text-slate-700 dark:text-slate-200">${p10}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                            <p className="text-xs text-violet-400 mb-1 font-bold">Mediana (50%)</p>
                            <p className="font-bold text-violet-500">${p50}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                            <p className="text-xs text-slate-400 mb-1">Optimista (90%)</p>
                            <p className="font-bold text-slate-700 dark:text-slate-200">${p90}</p>
                        </div>
                    </div>
                </div>

                {/* Right: Visualization */}
                <div className="flex-1 w-full h-[250px] bg-slate-50 dark:bg-black/20 rounded-xl p-4 border border-slate-100 dark:border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                                    <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.6} />
                                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#8B5CF6"
                                fill="url(#colorRisk)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
};
