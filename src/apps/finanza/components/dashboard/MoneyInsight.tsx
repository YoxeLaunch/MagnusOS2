import React, { useMemo } from 'react';
import { DailyTransaction } from '../../types';
import { calculateProjectedTotal } from '../../utils/financialMetrics';
import { formatCurrency } from '../../utils/calculations';
import { TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { getExpenseIcon } from '../../utils/categoryIcons';

interface MoneyInsightProps {
    transactions: DailyTransaction[];
    daysElapsed: number;
    totalDays: number;
}

export const MoneyInsight: React.FC<MoneyInsightProps> = ({ transactions, daysElapsed, totalDays }) => {

    const insights = useMemo(() => {
        let totalExpense = 0;
        const catMap: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.type === 'expense') {
                totalExpense += t.amount;
                const cat = t.category || 'Varios';
                catMap[cat] = (catMap[cat] || 0) + t.amount;
            }
        });

        // Find Top Category
        const sortedCats = Object.entries(catMap).sort(([, a], [, b]) => b - a);
        const topCategoryEntry = sortedCats[0];

        // Properly handle the case when there are no expenses
        const topCategory = topCategoryEntry
            ? { name: topCategoryEntry[0], value: topCategoryEntry[1] }
            : { name: 'Ninguna', value: 0 };

        // Projection
        const projectedTotal = calculateProjectedTotal(totalExpense, daysElapsed, totalDays);
        const projectedIncrease = projectedTotal - totalExpense;

        return {
            totalExpense,
            topCategory,
            projectedTotal,
            projectedIncrease
        };
    }, [transactions, daysElapsed, totalDays]);

    const TopIcon = getExpenseIcon(insights.topCategory.name || 'General');

    return (
        <div className="grid grid-cols-1 gap-4 h-full">{/* Changed from md:grid-cols-2 to grid-cols-1 for vertical stacking */}
            {/* Top Spender Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-lg">
                <div className="absolute right-0 top-0 p-4 opacity-10">
                    <TopIcon size={80} />
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={18} className="text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Mayor Fuga de Dinero</span>
                </div>

                <div>
                    <h3 className="text-2xl font-bold mb-1" title={insights.topCategory.name}>{insights.topCategory.name}</h3>
                    <p className="text-3xl font-mono text-yellow-400 font-bold">
                        {formatCurrency(insights.topCategory.value)}
                    </p>
                    <p className="text-xs opacity-60 mt-2">
                        {insights.totalExpense > 0
                            ? `${((insights.topCategory.value / insights.totalExpense) * 100).toFixed(1)}% del gasto total`
                            : 'Sin gastos aún'}
                    </p>
                </div>
            </div>

            {/* Projection Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-5">
                    <TrendingUp size={80} />
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={18} className="text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Proyección Fin de Mes</span>
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        {formatCurrency(insights.projectedTotal)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                        Si continúas a este ritmo, gastarás unos <span className="font-bold text-red-500">+{formatCurrency(insights.projectedIncrease)}</span> adicionales.
                    </p>
                </div>

                <div className="mt-3 bg-slate-100 dark:bg-white/5 rounded-lg p-2 text-[10px] text-center text-slate-400">
                    Basado en {daysElapsed} días transcurridos
                </div>
            </div>
        </div>
    );
};
