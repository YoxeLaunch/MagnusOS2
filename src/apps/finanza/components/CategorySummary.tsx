import React, { useMemo } from 'react';
import { DailyTransaction } from '../types';
import { getExpenseIcon } from '../utils/categoryIcons';
import { PieChart } from 'lucide-react';

interface CategorySummaryProps {
    transactions: DailyTransaction[];
}

export const CategorySummary: React.FC<CategorySummaryProps> = ({ transactions }) => {
    const categoryStats = useMemo(() => {
        const stats: { [key: string]: number } = {};
        let totalExpense = 0;

        transactions.forEach(t => {
            if (t.type === 'expense') {
                const cat = t.category || 'Sin Categoría';
                stats[cat] = (stats[cat] || 0) + t.amount;
                totalExpense += t.amount;
            }
        });

        // Convert to array and sort
        return Object.entries(stats)
            .sort(([, a], [, b]) => b - a) // Sort by amount DESC
            .map(([name, amount]) => ({
                name,
                amount,
                percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
            }));
    }, [transactions]);

    const getIcon = getExpenseIcon;

    if (categoryStats.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-white/5 shadow-sm mb-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <PieChart size={20} className="text-blue-500" />
                Gastos del Ciclo
            </h3>

            <div className="space-y-4">
                {categoryStats.map((cat) => {
                    const Icon = getIcon(cat.name);
                    return (
                        <div key={cat.name} className="relative group">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{cat.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-slate-900 dark:text-white block text-sm">${cat.amount.toLocaleString()}</span>
                                    <span className="text-[10px] text-slate-400">{cat.percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${cat.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
