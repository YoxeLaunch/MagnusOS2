import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Wallet, TrendingDown, Target, PieChart, Filter, PiggyBank, ArrowRight, Settings } from 'lucide-react';
import { useData } from '../context/DataContext';
import { DailyTransactionModal } from '../components/DailyTransactionModal';
import { GlobalAdjustmentModal } from '../components/GlobalAdjustmentModal';
import { FinancialCalendar } from '../components/FinancialCalendar';
import { TransactionTimeline } from '../components/TransactionTimeline';
import { CategorySummary } from '../components/CategorySummary';
import { getFinancialCycle, isDateInCycle } from '../utils/financialCycle';
import { TRANSACTION_META } from '../utils/categoryIcons';
import { CronologiaHeader } from '../components/CronologiaFinanciera/CronologiaHeader';

export const Tracking: React.FC = () => {
    const { dailyTransactions, isLoading } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<any>(null); // To pass pre-filled data
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'investment'>('all');

    // Calculate current cycle based on the selected date in the calendar view
    const currentCycle = useMemo(() => getFinancialCycle(currentDate), [currentDate]);

    // Filter transactions relevant to the current cycle
    const currentCycleTransactions = useMemo(() => {
        return dailyTransactions.filter(t => isDateInCycle(t.date, currentCycle));
    }, [dailyTransactions, currentCycle]);

    // Calculate Stats (Monthly)
    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        let investment = 0;

        currentCycleTransactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
            else if (t.type === 'investment') investment += t.amount;
        });

        const available = income - expense - investment;

        return { income, expense, investment, available };
    }, [currentCycleTransactions]);

    // Calculate Global Stats (All Time)
    const globalStats = useMemo(() => {
        let income = 0;
        let expense = 0;
        let investment = 0;

        dailyTransactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
            else if (t.type === 'investment') investment += t.amount;
        });

        const available = income - expense - investment;
        return { available, investment };
    }, [dailyTransactions]);

    // Filtered Transactions for Timeline
    const filteredTimelineTransactions = useMemo(() => {
        if (filterType === 'all') return dailyTransactions;
        return dailyTransactions.filter(t => t.type === filterType);
    }, [dailyTransactions, filterType]);

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setModalInitialData(null); // Reset initial data
        setIsModalOpen(true);
    };

    const handleInvestSweep = () => {
        setSelectedDate(new Date()); // Default to today
        setModalInitialData({
            type: 'investment',
            amount: globalStats.available > 0 ? globalStats.available : 0,
            description: `Ahorro Acumulado Global`
        });
        setIsModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 animate-pulse">Sincronizando cronología...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <CronologiaHeader
                currentCycle={currentCycle}
                transactions={currentCycleTransactions}
                stats={stats}
                globalStats={globalStats}
                onAdjustModalOpen={() => setIsAdjustmentModalOpen(true)}
                onInvestSweep={handleInvestSweep}
            />

            {/* Main Grid Layout */}
            <div className="space-y-8">


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
                    initialData={modalInitialData}
                    onClose={() => {
                        setIsModalOpen(false);
                        setModalInitialData(null);
                    }}
                />
            )}

            {isAdjustmentModalOpen && (
                <GlobalAdjustmentModal
                    currentAmount={globalStats.available}
                    onClose={() => setIsAdjustmentModalOpen(false)}
                />
            )}
        </div>
    );
};

