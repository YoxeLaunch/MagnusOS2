import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { DailyTransaction } from '../types';
import { getFinancialCycle } from '../utils/financialCycle';

interface FinancialCalendarProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onDateClick: (date: Date) => void;
    transactions: DailyTransaction[];
}

export const FinancialCalendar: React.FC<FinancialCalendarProps> = ({
    currentDate,
    onDateChange,
    onDateClick,
    transactions
}) => {

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const prevMonth = () => onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    // Aggregate transactions by date
    const transactionsByDate: { [key: string]: { income: number, expense: number, investment: number } } = {};
    transactions.forEach(t => {
        if (!transactionsByDate[t.date]) transactionsByDate[t.date] = { income: 0, expense: 0, investment: 0 };
        if (t.type === 'income') transactionsByDate[t.date].income += t.amount;
        else if (t.type === 'investment') transactionsByDate[t.date].investment += t.amount;
        else transactionsByDate[t.date].expense += t.amount;
    });

    const renderDays = () => {
        const totalDays = daysInMonth(currentDate);
        const startDay = firstDayOfMonth(currentDate);
        const days = [];

        // Empty cells
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="bg-transparent/5"></div>);
        }

        // Days
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = new Date().toDateString() === date.toDateString();
            const data = transactionsByDate[dateStr];
            const hasData = !!data;

            // Cycle Logic Visualization
            const cycle = getFinancialCycle(date);
            // Check if day belongs to NEXT cycle (e.g. we are in Jan, but day is Jan 28 -> Cycle Feb)
            // Logic: If cycle label is different from current month name (and isn't the exception Dec->Jan)
            const currentMonthName = currentDate.toLocaleDateString('es-ES', { month: 'long' });
            const isNextCycle = cycle.label.toLowerCase() !== currentMonthName.toLowerCase() &&
                !(currentDate.getMonth() === 11 && cycle.label === 'Enero'); // Exception for Dec

            // Special styling for next cycle days (usually 26th+)
            const cycleStyle = isNextCycle
                ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5';

            days.push(
                <div
                    key={day}
                    onClick={() => onDateClick(date)}
                    className={`
                        min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between
                        ${isToday
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 ring-1 ring-blue-500' // Today always highlighted
                            : `${cycleStyle} hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md`
                        }
                    `}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <span className={`
                                text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full
                                ${isToday ? 'bg-blue-500 text-white' : 'text-slate-500 dark:text-slate-400'}
                            `}>
                                {day}
                            </span>
                            {/* Cycle Label for start of next cycle */}
                            {day === 26 && (
                                <span className="text-[9px] font-bold text-amber-500 uppercase mt-1 leading-tight">
                                    Inicio {cycle.label}
                                </span>
                            )}
                        </div>
                        {hasData && (
                            <div className="flex gap-1">
                                {data.income > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                {data.expense > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                                {data.investment > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                            </div>
                        )}
                    </div>

                    {hasData ? (
                        <div className="space-y-0.5 mt-2">
                            {data.income > 0 && (
                                <div className="text-[10px] font-bold text-green-600 dark:text-green-400 truncate bg-green-50 dark:bg-green-900/20 px-1 rounded">
                                    +{Math.round(data.income).toLocaleString()}
                                </div>
                            )}
                            {data.expense > 0 && (
                                <div className="text-[10px] font-bold text-red-500 dark:text-red-400 truncate bg-red-50 dark:bg-red-900/20 px-1 rounded">
                                    -{Math.round(data.expense).toLocaleString()}
                                </div>
                            )}
                            {data.investment > 0 && (
                                <div className="text-[10px] font-bold text-blue-500 dark:text-blue-400 truncate bg-blue-50 dark:bg-blue-900/20 px-1 rounded">
                                    -{Math.round(data.investment).toLocaleString()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/50 dark:bg-black/20 rounded-xl">
                            <Plus className="text-slate-400" size={20} />
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="capitalize">{currentDate.toLocaleDateString('es-ES', { month: 'long' })}</span>
                    <span className="text-slate-400">{currentDate.getFullYear()}</span>
                </h3>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all text-slate-500 dark:text-slate-400">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all text-slate-500 dark:text-slate-400">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50">
                {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map(day => (
                    <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="p-4 grid grid-cols-7 gap-2 md:gap-3 bg-slate-50/30 dark:bg-black/20">
                {renderDays()}
            </div>
        </div>
    );
};
