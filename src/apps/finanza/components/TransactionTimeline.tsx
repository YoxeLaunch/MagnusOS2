import React, { useMemo } from 'react';
import { DailyTransaction } from '../types';
import { getCategoryIcon } from '../utils/categoryIcons';
import { Calendar } from 'lucide-react';

interface TransactionTimelineProps {
    transactions: DailyTransaction[];
    currentMonth: Date;
}

export const TransactionTimeline: React.FC<TransactionTimelineProps> = ({ transactions, currentMonth }) => {

    // Sort transactions by date DESC
    const sortedTransactions = useMemo(() => {
        return [...transactions]
            .filter(t => t.date.startsWith(currentMonth.toISOString().slice(0, 7)))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
    }, [transactions, currentMonth]);

    // Group by Date for visualization
    const grouped = useMemo(() => {
        const groups: { [date: string]: DailyTransaction[] } = {};
        sortedTransactions.forEach(t => {
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });
        return groups;
    }, [sortedTransactions]);

    const getColors = (type: 'income' | 'expense' | 'investment') => {
        if (type === 'income') return {
            text: 'text-green-600 dark:text-green-400',
            amount: 'text-green-600 dark:text-green-400'
        };
        if (type === 'investment') return {
            text: 'text-blue-600 dark:text-blue-400',
            amount: 'text-blue-600 dark:text-blue-400'
        };
        return {
            text: 'text-slate-500 dark:text-slate-400',
            amount: 'text-slate-900 dark:text-white'
        };
    };

    if (sortedTransactions.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No hay movimientos en este mes.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {Object.keys(grouped).map(dateStr => {
                const date = new Date(dateStr + 'T12:00:00'); // Fix TZ issues by setting noon
                const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
                const fullDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
                const dayNum = date.getDate();

                return (
                    <div key={dateStr} className="relative">
                        {/* Day Header */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-md">
                                {fullDate}
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-white/10 flex-1"></div>
                            <div className="text-xs text-slate-400 uppercase font-bold">{dayName}</div>
                        </div>

                        {/* Transactions List */}
                        <div className="flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                            {grouped[dateStr].map(t => {
                                const Icon = getCategoryIcon(t.category, t.type);
                                const colors = getColors(t.type);

                                return (
                                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <Icon size={18} className={`shrink-0 ${colors.text}`} />
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate" title={t.description}>{t.description}</h4>
                                        </div>
                                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{t.category}</span>
                                        <div className={`shrink-0 font-mono font-bold text-sm text-right w-24 ${colors.amount}`}>
                                            {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
