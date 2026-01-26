import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Transaction } from '../../../shared/types';
import { formatCurrency } from '../utils/calculations';
import { PiggyBank, TrendingUp, Building2, Coins, Landmark, Target } from 'lucide-react';

interface AssetAllocationProps {
    investments: Transaction[];
}

const COLORS = {
    ahorro: '#10B981',        // Emerald-500
    acciones: '#3B82F6',      // Blue-500
    bienes_raices: '#F59E0B', // Amber-500
    crypto: '#8B5CF6',        // Violet-500
    banco: '#6366F1',         // Indigo-500
    otro: '#EC4899',          // Pink-500
};

const CATEGORY_LABELS: Record<string, string> = {
    ahorro: 'Ahorro',
    acciones: 'Acciones',
    bienes_raices: 'Bienes Raíces',
    crypto: 'Cripto',
    banco: 'Depósitos',
    otro: 'Otros',
};

export const AssetAllocation: React.FC<AssetAllocationProps> = ({ investments }) => {
    // Calculate allocation
    const chartData = useMemo(() => {
        const totals: Record<string, number> = {};

        investments.forEach(inv => {
            const val = inv.currentValue ?? inv.amount;
            const cat = inv.category || 'otro';
            totals[cat] = (totals[cat] || 0) + val;
        });

        // Filter out zero categories and sort by value descending
        return Object.entries(totals)
            .map(([key, value]) => ({
                name: CATEGORY_LABELS[key] || key,
                value,
                key
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [investments]);

    const totalValue = chartData.reduce((acc, curr) => acc + curr.value, 0);

    if (totalValue === 0) return null;

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl p-6 shadow-sm border border-gray-100 dark:border-white/10 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Distribución de Activos</h3>

            <div className="flex-1 min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => {
                                const colorKey = entry.key as keyof typeof COLORS;
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[colorKey] || '#9CA3AF'}
                                        stroke="rgba(255,255,255,0.1)"
                                    />
                                );
                            })}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(12px)'
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ fontSize: '12px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(totalValue).split('.')[0]}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
