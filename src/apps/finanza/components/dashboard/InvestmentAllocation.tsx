import React, { useMemo } from 'react';
import { RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, PieChart } from 'lucide-react';
import { Transaction } from '../../../shared/types';
import { formatCurrency } from '../../utils/calculations';

interface InvestmentAllocationProps {
    investments: Transaction[];
    currencies: any;
}

export const InvestmentAllocation: React.FC<InvestmentAllocationProps> = ({ investments, currencies }) => {
    const convertToDOP = (amount: number, currency?: string) => {
        if (currency === 'USD') return amount * currencies.usd.rate;
        if (currency === 'EUR') return amount * currencies.eur.rate;
        return amount;
    };

    const allocationData = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        let total = 0;

        investments.forEach(inv => {
            const amountInDOP = convertToDOP(inv.amount, inv.currency);
            const category = inv.category || 'Otros';
            categoryTotals[category] = (categoryTotals[category] || 0) + amountInDOP;
            total += amountInDOP;
        });

        // Color palette - vibrant but premium
        const COLORS = [
            '#3b82f6', // Blue
            '#8b5cf6', // Purple
            '#ec4899', // Pink
            '#f59e0b', // Amber
            '#10b981', // Green
            '#6366f1', // Indigo
            '#ef4444'  // Red
        ];

        const chartData = Object.entries(categoryTotals)
            .map(([name, value], index) => ({
                name,
                value,
                fill: COLORS[index % COLORS.length],
                percentage: total > 0 ? (value / total) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value);

        return { total, chartData };
    }, [investments, currencies]);

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Background glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <TrendingUp size={18} className="text-blue-400" />
                            </div>
                            Distribución de Inversiones
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Portafolio por categoría</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold">Total</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {formatCurrency(allocationData.total)}
                        </p>
                    </div>
                </div>

                {/* Chart */}
                {allocationData.chartData.length > 0 ? (
                    <>
                        <div className="h-64 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="30%"
                                    outerRadius="90%"
                                    data={allocationData.chartData}
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    <PolarGrid
                                        gridType="circle"
                                        radialLines={false}
                                        stroke="rgba(255,255,255,0.1)"
                                        polarRadius={[30, 40, 50, 60, 70, 80, 90]}
                                    />
                                    <RadialBar
                                        background={{ fill: 'rgba(255,255,255,0.05)' }}
                                        dataKey="value"
                                        cornerRadius={10}
                                    />
                                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Legend */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="grid grid-cols-2 gap-3">
                                {allocationData.chartData.slice(0, 6).map((item) => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: item.fill }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-300 truncate">{item.name}</p>
                                            <p className="text-[10px] text-slate-500">
                                                {formatCurrency(item.value)} ({item.percentage.toFixed(0)}%)
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-64 flex items-center justify-center">
                        <div className="text-center text-slate-400">
                            <PieChart size={48} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No hay inversiones registradas</p>
                            <p className="text-xs mt-1 opacity-70">Comienza a invertir para ver tu distribución</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
