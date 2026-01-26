/**
 * CategoryCohort Component
 * 
 * Visualizes spending breakdown by category over time using a stacked bar chart.
 * Allows identifying trends in specific categories (e.g. increasing food costs).
 */

import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useData } from '../context/DataContext';
import { getCycleId } from '../utils/financialCycle';
import { Filter, PieChart } from 'lucide-react';
import { sanitizeTransactions } from '../utils/dataQuality';

// Defined color palette for categories
const CATEGORY_COLORS = [
    '#8B5CF6', // Violet
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#64748B', // Slate (Others)
];

const DEFAULT_CATEGORY = 'Sin Categoría';

export const CategoryCohort: React.FC = () => {
    const { dailyTransactions } = useData();
    const [viewMode, setViewMode] = useState<'absolute' | 'percent'>('absolute');

    const { chartData, categories } = useMemo(() => {
        // 1. Sanitize Data
        const { clean: transactions } = sanitizeTransactions(dailyTransactions, {
            filterZeroAmounts: true,
            filterFutureDates: true
        });

        // 2. Filter for expenses only
        const expenses = transactions.filter(t => t.type === 'expense');

        if (expenses.length === 0) return { chartData: [], categories: [] };

        // 3. Identify all unique categories and Sort by total volume
        const categoryTotals: Record<string, number> = {};
        expenses.forEach(t => {
            const cat = t.category || DEFAULT_CATEGORY;
            categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
        });

        // Sort categories by total spend (descending)
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([cat]) => cat);

        // Limit to top 9 + Others
        const topCategories = sortedCategories.slice(0, 9);
        const hasOthers = sortedCategories.length > 9;

        const displayCategories = hasOthers ? [...topCategories, 'Otros'] : topCategories;

        // 4. Group by Cycle
        // We only want the last 12 cycles for readability
        const cycleData: Record<string, Record<string, number>> = {};
        const cycleOrder: string[] = [];

        transactions.forEach(t => {
            // Note: We use ALL transactions to determine cycle timeline, 
            // but only sum expenses in the loop below
            const cycleId = getCycleId(t.date);
            if (!cycleData[cycleId]) {
                cycleData[cycleId] = {};
                cycleOrder.push(cycleId);
            }
        });

        // Sort cycles chronologically
        cycleOrder.sort();
        const recentCycles = cycleOrder.slice(-12);

        // Initialize objects for recent cycles
        const finalData = recentCycles.map(cycleId => {
            const dataPoint: any = { name: cycleId };
            displayCategories.forEach(cat => {
                dataPoint[cat] = 0;
            });
            return dataPoint;
        });

        // Sum up expenses
        expenses.forEach(t => {
            const cycleId = getCycleId(t.date);
            if (!recentCycles.includes(cycleId)) return;

            let cat = t.category || DEFAULT_CATEGORY;
            if (!topCategories.includes(cat)) {
                cat = 'Otros';
            }

            const dataIndex = recentCycles.indexOf(cycleId);
            if (dataIndex >= 0) {
                finalData[dataIndex][cat] = (finalData[dataIndex][cat] || 0) + t.amount;
            }
        });

        return { chartData: finalData, categories: displayCategories };

    }, [dailyTransactions]);

    if (chartData.length === 0) return null;

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:border-violet-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                        <PieChart className="text-violet-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            Cohorte de Categorías
                        </h3>
                        <p className="text-sm text-slate-500">
                            Evolución de gastos por categoría en los últimos 12 ciclos.
                        </p>
                    </div>
                </div>

                <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-lg">
                    <button
                        onClick={() => setViewMode('absolute')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'absolute'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        $ Absoluto
                    </button>
                    <button
                        onClick={() => setViewMode('percent')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'percent'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        % Relativo
                    </button>
                </div>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        stackOffset={viewMode === 'percent' ? 'expand' : 'none'}
                    >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                        <XAxis
                            dataKey="name"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                        />
                        <YAxis
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tickFormatter={(val) => viewMode === 'percent' ? `${(val * 100).toFixed(0)}%` : `$${val}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '12px', padding: '2px 0' }}
                            formatter={(value: number) => {
                                return viewMode === 'percent'
                                    ? `${(value * 100).toFixed(1)}%` // This won't work perfectly for stackOffset="expand" as value is absolute
                                    : `$${value.toLocaleString()}`;
                            }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        {categories.map((cat, index) => (
                            <Bar
                                key={cat}
                                dataKey={cat}
                                stackId="a"
                                fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                radius={index === categories.length - 1 && viewMode === 'absolute' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
