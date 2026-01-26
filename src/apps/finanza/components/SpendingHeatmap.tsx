/**
 * SpendingHeatmap Component
 * 
 * Visualizes daily spending intensity in a GitHub-like contribution graph.
 * Helps identifying high-spending days and patterns.
 */

import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { sanitizeTransactions } from '../utils/dataQuality';
import { Calendar } from 'lucide-react';
import { Tooltip } from 'recharts'; // Using recharts tooltip styles for consistency if customizable, or standard

// Helper to get week on year (1-53) and day of week (0-6)
const getDayInfo = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = ((date.getTime() - startOfYear.getTime()) + 86400000) / 86400000;
    const week = Math.ceil(dayOfYear / 7);
    const day = date.getDay(); // 0 = Sun, 6 = Sat
    return { week, day };
};

export const SpendingHeatmap: React.FC = () => {
    const { dailyTransactions } = useData();
    const year = new Date().getFullYear();

    const { days, maxSpend, totaldays } = useMemo(() => {
        // Sanitize
        const { clean: transactions } = sanitizeTransactions(dailyTransactions, {
            filterZeroAmounts: true,
            filterFutureDates: true
        });

        const expenses = transactions.filter(t => t.type === 'expense' && new Date(t.date).getFullYear() === year);

        const dayMap: Record<string, number> = {};
        let max = 0;

        expenses.forEach(t => {
            const dateKey = t.date.slice(0, 10);
            dayMap[dateKey] = (dayMap[dateKey] || 0) + t.amount;
            if (dayMap[dateKey] > max) max = dayMap[dateKey];
        });

        // Generate full year grid
        // We actually want a 53-week grid starting from roughly a year ago? 
        // Or just the current year. Let's do current year.
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        const daysArray = [];
        let currentDate = new Date(startDate);

        let count = 0;

        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().slice(0, 10);
            const value = dayMap[dateKey] || 0;

            daysArray.push({
                date: new Date(currentDate),
                dateKey,
                value,
                dayOfWeek: currentDate.getDay() // 0-6
            });

            currentDate.setDate(currentDate.getDate() + 1);
            if (value > 0) count++;
        }

        return { days: daysArray, maxSpend: max, totaldays: count };

    }, [dailyTransactions, year]);

    if (days.length === 0) return null;

    // Split into weeks for rendering columns
    const weeks: any[][] = [];
    let currentWeek: any[] = [];

    // Align first day padding
    const firstDay = days[0].dayOfWeek;
    for (let i = 0; i < firstDay; i++) {
        currentWeek.push(null);
    }

    days.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Color scale function
    const getColor = (value: number) => {
        if (value === 0) return 'bg-slate-100 dark:bg-white/5';

        const ratio = value / maxSpend;
        if (ratio < 0.25) return 'bg-emerald-200 dark:bg-emerald-900/40';
        if (ratio < 0.50) return 'bg-emerald-300 dark:bg-emerald-700/60';
        if (ratio < 0.75) return 'bg-emerald-400 dark:bg-emerald-600/80';
        return 'bg-emerald-500 dark:bg-emerald-500';
    };

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:border-emerald-500/30">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Calendar className="text-emerald-500" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        Mapa de Calor de Gastos ({year})
                    </h3>
                    <p className="text-sm text-slate-500">
                        {totaldays} días con actividad este año.
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto pb-2">
                <div className="flex gap-1 min-w-max">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1">
                            {week.map((day, dIndex) => (
                                day ? (
                                    <div
                                        key={day.dateKey}
                                        className={`w-3 h-3 rounded-sm ${getColor(day.value)} group relative`}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 min-w-[120px]">
                                            <div className="bg-slate-800 text-white text-xs rounded-lg py-1 px-2 shadow-lg text-center">
                                                <p className="font-bold">{day.dateKey}</p>
                                                <p className="text-emerald-400 font-bold">${day.value.toLocaleString()}</p>
                                            </div>
                                            {/* Arrow */}
                                            <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={`empty-${wIndex}-${dIndex}`} className="w-3 h-3 rounded-sm bg-transparent" />
                                )
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-400">
                <span>Menos</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-white/5"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/40"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-700/60"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600/80"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500"></div>
                </div>
                <span>Más</span>
            </div>
        </div>
    );
};
