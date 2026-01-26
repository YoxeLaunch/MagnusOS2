import React, { useMemo } from 'react';
import { DailyTransaction } from '../types';
import { getIncomeIcon, getExpenseIcon, getInvestmentIcon } from '../utils/categoryIcons';
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

    const getIcon = (category: string, type: 'income' | 'expense' | 'investment') => {
        if (type === 'income') return getIncomeIcon(category);
        if (type === 'investment') return getInvestmentIcon(category);
        return getExpenseIcon(category);
    };

    const getColors = (type: 'income' | 'expense' | 'investment') => {
        if (type === 'income') return {
            bg: 'bg-green-100 dark:bg-green-900/20',
            text: 'text-green-600 dark:text-green-400',
            amount: 'text-green-600 dark:text-green-400'
        };
        if (type === 'investment') return {
            bg: 'bg-blue-100 dark:bg-blue-900/20',
            text: 'text-blue-600 dark:text-blue-400',
            amount: 'text-blue-600 dark:text-blue-400'
        };
        return {
            bg: 'bg-slate-100 dark:bg-slate-700/50',
            text: 'text-slate-600 dark:text-slate-400',
            amount: 'text-slate-900 dark:text-white' // Expense amount usually neutral or red? In previous code it was neutral. Keeping neutral/slate for amount to match original "text-slate-900".
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

                        {/* Transactions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {grouped[dateStr].map(t => {
                                const Icon = getIcon(t.category || t.description, t.type);
                                const colors = getColors(t.type);

                                return (
                                    <div key={t.id} className="flex flex-col p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-500/30 transition-all shadow-sm group hover:-translate-y-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`
                                                w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                                ${colors.bg} ${colors.text}
                                            `}>
                                                <Icon size={20} />
                                            </div>
                                            <div className={`font-mono font-bold text-lg ${colors.amount}`}>
                                                {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1" title={t.description}>{t.description}</h4>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                {t.category}
                                            </p>
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
