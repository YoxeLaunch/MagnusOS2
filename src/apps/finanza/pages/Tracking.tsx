import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Wallet, TrendingDown, Target, PieChart, Filter } from 'lucide-react';
import { useData } from '../context/DataContext';
import { DailyTransactionModal } from '../components/DailyTransactionModal';
import { FinancialCalendar } from '../components/FinancialCalendar';
import { TransactionTimeline } from '../components/TransactionTimeline';
import { CategorySummary } from '../components/CategorySummary';
import { getFinancialCycle, isDateInCycle } from '../utils/financialCycle';
import { TRANSACTION_META } from '../utils/categoryIcons';

export const Tracking: React.FC = () => {
    const { dailyTransactions } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'investment'>('all');

    // Calculate current cycle based on the selected date in the calendar view
    const currentCycle = useMemo(() => getFinancialCycle(currentDate), [currentDate]);

    // Filter transactions relevant to the current cycle
    const currentCycleTransactions = useMemo(() => {
        return dailyTransactions.filter(t => isDateInCycle(t.date, currentCycle));
    }, [dailyTransactions, currentCycle]);

    // Calculate Stats
    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        let investment = 0; // New Investment Accumulator

        currentCycleTransactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
            else if (t.type === 'investment') investment += t.amount;
        });

        const available = income - expense - investment; // Net Liquidity

        return { income, expense, investment, available };
    }, [currentCycleTransactions]);

    // Filtered Transactions for Timeline
    const filteredTimelineTransactions = useMemo(() => {
        if (filterType === 'all') return dailyTransactions;
        return dailyTransactions.filter(t => t.type === filterType);
    }, [dailyTransactions, filterType]);

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header Area */}
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
            </div>

            {/* Main Grid Layout */}
            <div className="space-y-8">

                {/* Section 1: Stats & Indicators (Redesigned - 4 Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Income */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 shadow-sm">
                        <div className="p-3 rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Entradas</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">${stats.income.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Expense */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 shadow-sm">
                        <div className="p-3 rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            <TrendingDown size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Salidas</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">${stats.expense.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Investment (New) */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 shadow-sm">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            <PieChart size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Invertido</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">${stats.investment.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Available (Liquidity) */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl border border-slate-700 flex items-center gap-4 shadow-lg shadow-slate-900/20">
                        <div className="p-3 rounded-full bg-white/10">
                            <Target size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Disponible</p>
                            <p className={`text-xl font-bold ${stats.available >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${stats.available.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Calendar & Category Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Calendar (3/4 width) */}
                    <div className="lg:col-span-3">
                        <FinancialCalendar
                            currentDate={currentDate}
                            onDateChange={setCurrentDate}
                            onDateClick={handleDateClick}
                            transactions={dailyTransactions}
                        />
                    </div>

                    {/* Category Summary (1/4 width - Sidebar) */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Resumen</h3>
                        <CategorySummary transactions={currentCycleTransactions} />
                    </div>
                </div>

                {/* Section 3: Recent Activity (Full Width with Filters) */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4 gap-4">
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                            Actividad Reciente
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                {currentCycleTransactions.length} movimientos
                            </span>
                        </h3>

                        {/* Filters */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                            >
                                Todo
                            </button>
                            {(['income', 'expense', 'investment'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize flex items-center gap-1 ${filterType === type ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                                >
                                    {filterType === type && <div className={`w-1.5 h-1.5 rounded-full ${type === 'income' ? 'bg-green-500' : type === 'expense' ? 'bg-red-500' : 'bg-blue-500'}`} />}
                                    {TRANSACTION_META[type].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-transparent md:bg-transparent rounded-2xl p-4 md:p-0">
                        <TransactionTimeline
                            transactions={filteredTimelineTransactions}
                            currentMonth={currentDate}
                        />
                    </div>
                </div>
            </div>

            {isModalOpen && selectedDate && (
                <DailyTransactionModal
                    date={selectedDate}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};
