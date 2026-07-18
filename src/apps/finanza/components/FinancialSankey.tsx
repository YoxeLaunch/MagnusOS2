import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Network, PiggyBank, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { calculateFlowData } from '../utils/flowAnalysis';
import { formatCurrency } from '../utils/calculations';

// Vibrant but premium palette for expense categories (reused/cycled as needed)
const CATEGORY_COLORS = [
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#6366F1', // Indigo
    '#06B6D4', // Cyan
    '#EF4444', // Red
    '#F97316', // Orange
];

const SAVINGS_COLOR = '#10B981';  // Emerald — positive
const DEFICIT_COLOR = '#F43F5E';  // Rose — negative

export const FinancialSankey: React.FC = () => {
    const { dailyTransactions } = useData();
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const data = useMemo(() => calculateFlowData(dailyTransactions), [dailyTransactions]);

    const chartData = useMemo(() => {
        if (!data) return [];

        let categoryColorIdx = 0;
        return data.nodes
            .filter(n => n.type !== 'source')
            .map(n => {
                let color = CATEGORY_COLORS[categoryColorIdx % CATEGORY_COLORS.length];
                if (n.type === 'surplus') color = SAVINGS_COLOR;
                else if (n.type === 'deficit') color = DEFICIT_COLOR;
                else categoryColorIdx++;

                return {
                    name: n.name,
                    value: n.value,
                    type: n.type,
                    color
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [data]);

    if (!data || chartData.length === 0) return null;

    const total = data.totalIncome;

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:border-emerald-500/30">
            <div className="mb-6">
                <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Network className="text-emerald-500" size={22} />
                    Distribución de tu Dinero
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                    Hacia dónde va cada peso de tus ingresos, según los últimos ciclos cerrados.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* Donut Chart */}
                <div className="relative h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={3}
                                dataKey="value"
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${entry.name}`}
                                        fill={entry.color}
                                        stroke="rgba(255,255,255,0.08)"
                                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                                        style={{ transition: 'opacity 0.2s ease-out' }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px'
                                }}
                                itemStyle={{ color: '#f8fafc' }}
                                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Total */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Ingresos</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(total)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Legend / Breakdown List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {chartData.map((entry, index) => {
                        const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                        const Icon = entry.type === 'surplus' ? PiggyBank : entry.type === 'deficit' ? AlertTriangle : null;

                        return (
                            <div
                                key={entry.name}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors ${
                                    activeIndex === index ? 'bg-slate-100 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    {Icon && <Icon size={14} style={{ color: entry.color }} className="flex-shrink-0" />}
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                        {entry.name}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2 flex-shrink-0">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(entry.value)}
                                    </span>
                                    <span className="text-xs text-slate-400 w-9 text-right">{pct}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FinancialSankey;
