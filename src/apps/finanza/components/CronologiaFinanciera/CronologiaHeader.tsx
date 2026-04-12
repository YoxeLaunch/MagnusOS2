import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Wallet, TrendingDown, PieChart, Target, PiggyBank, ArrowRight, Settings } from 'lucide-react';
import { EntradaBreakdown } from './EntradaBreakdown';
import { FlujoWaterfall } from './FlujoWaterfall';
import { FormulaStrip } from './FormulaStrip';
import type { FinancialCycle } from '../../utils/financialCycle';
import type { DailyTransaction } from '../../types';

interface CronologiaHeaderProps {
    currentCycle: FinancialCycle;
    transactions: DailyTransaction[];
    stats: { income: number; expense: number; investment: number; available: number };
    globalStats: { available: number; investment: number };
    onAdjustModalOpen: () => void;
    onInvestSweep: () => void;
}

export const CronologiaHeader: React.FC<CronologiaHeaderProps> = ({
    currentCycle,
    transactions,
    stats,
    globalStats,
    onAdjustModalOpen,
    onInvestSweep
}) => {
    // 1. Calculate ahorroMes (same as stats.available but for clarity)
    const ahorroMes = stats.income - stats.expense - stats.investment;

    // Fetch mini-list for investments
    const [historicalInvestments, setHistoricalInvestments] = useState<{ ciclo: string; amount: number }[]>([]);
    
    useEffect(() => {
        const fetchHistorical = async () => {
            try {
                // As per user specification
                const res = await fetch('/api/ledger/investments?groupBy=cycle');
                if (res.ok) {
                    const data = await res.json();
                    // Assumes { data: [{ ciclo: string, amount: number }, ...] } or array directly
                    if (Array.isArray(data)) {
                        setHistoricalInvestments(data.slice(0, 4)); // Last 4 months
                    } else if (data.data) {
                        setHistoricalInvestments(data.data.slice(0, 4));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch historical investments", err);
            }
        };
        fetchHistorical();
    }, []);

    return (
        <div className="space-y-8">
            {/* Upper Info Row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20">
                            <CalendarIcon className="text-white" size={24} />
                        </div>
                        Cronología Financiera
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 ml-1">
                        Ciclo Financiero: <span className="text-blue-500 font-bold capitalize">{currentCycle.label}</span>
                        <span className="text-xs ml-2 opacity-70">
                            ({currentCycle.start.getDate()} {currentCycle.start.toLocaleDateString('es-ES', { month: 'short' })} - {currentCycle.end.getDate()} {currentCycle.end.toLocaleDateString('es-ES', { month: 'short' })})
                        </span>
                    </p>
                </div>

                {/* Global Stats Cards */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Cash Disp. Global */}
                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-4 rounded-xl shadow-lg border border-indigo-500/30 flex items-center gap-4 min-w-[240px]">
                        <div className="p-3 rounded-full bg-white/10 flex-shrink-0">
                            <Wallet size={24} className="text-indigo-300" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Cash Disp. Global</p>
                            <p className="text-2xl font-bold text-white">
                                ${globalStats.available.toLocaleString()}
                            </p>
                            {/* NEW: Subtítulo dinámico para ahorro */}
                            <p className="text-[10px] text-indigo-200 mt-1 opacity-80">
                                +${ahorroMes.toLocaleString()} este ciclo → suma al total
                            </p>
                        </div>
                        <button
                            onClick={onAdjustModalOpen}
                            title="Ajustar saldo manualmente"
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                        >
                            <Settings size={18} />
                        </button>
                    </div>

                    {/* Total Invested (Histórico) */}
                    <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-4 rounded-xl shadow-lg border border-emerald-500/30 flex items-start gap-4 min-w-[240px]">
                        <div className="p-3 rounded-full bg-white/10 flex-shrink-0">
                            <PiggyBank size={24} className="text-yellow-300" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Inversión Ahorrada</p>
                            <div className="flex items-center gap-2">
                                <p className="text-2xl font-bold text-white">
                                    ${globalStats.investment.toLocaleString()}
                                </p>
                                {globalStats.available > 0 && (
                                    <button
                                        onClick={onInvestSweep}
                                        title="Invertir todo el disponible"
                                        className="p-1 px-2 text-[10px] bg-white/20 hover:bg-white/30 rounded-md transition-colors flex items-center gap-1"
                                    >
                                        <ArrowRight size={10} /> Invertir
                                    </button>
                                )}
                            </div>
                            
                            {/* NEW: Mini-lista de los últimos meses */}
                            {historicalInvestments.length > 0 && (
                                <div className="mt-2 text-[10px] text-emerald-100/70">
                                    <p className="border-b border-emerald-500/30 mb-1 pb-0.5">Últimos aportes:</p>
                                    <ul className="space-y-0.5">
                                        {historicalInvestments.map((inv, idx) => (
                                            <li key={idx} className="flex justify-between">
                                                <span className="capitalize">{inv.ciclo}</span>
                                                <span>${Number(inv.amount).toLocaleString()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards & Breakdown Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Entradas */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Entradas</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">${stats.income.toLocaleString()}</p>
                        </div>
                    </div>
                    {/* NEW: EntradaBreakdown */}
                    <EntradaBreakdown transactions={transactions} totalEntradas={stats.income} />
                </div>

                {/* Gastos */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 shadow-sm">
                    <div className="p-3 rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        <TrendingDown size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Salidas</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">${stats.expense.toLocaleString()}</p>
                    </div>
                </div>

                {/* Invertido */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 shadow-sm">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                        <PieChart size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Invertido</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">${stats.investment.toLocaleString()}</p>
                    </div>
                </div>

                {/* Ahorro del Mes */}
                <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-4 rounded-2xl border border-teal-700 flex flex-col justify-center gap-1 shadow-lg shadow-teal-900/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-white/10 text-teal-300">
                            <Target size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-teal-200 uppercase font-bold">Ahorro del Mes</p>
                            <p className={`text-2xl font-bold ${ahorroMes >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                                ${ahorroMes.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <p className="text-[10px] text-teal-100 opacity-70 ml-14">No gastado ni invertido</p>
                </div>
            </div>

            {/* Waterfall Diagram */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-sm">
                <FlujoWaterfall 
                    entradas={stats.income} 
                    gastos={stats.expense} 
                    invertido={stats.investment} 
                    ahorro={ahorroMes} 
                />
            </div>

            {/* Formula Strip */}
            <FormulaStrip 
                entradas={stats.income} 
                gastos={stats.expense} 
                invertido={stats.investment} 
                ahorro={ahorroMes} 
            />
        </div>
    );
};
