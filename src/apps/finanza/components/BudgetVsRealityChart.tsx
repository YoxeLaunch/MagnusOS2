import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, AlertTriangle, CheckCircle } from 'lucide-react';

interface BudgetVsRealityProps {
    budget: number;
    reality: number;
    currency?: string;
}

export const BudgetVsRealityChart: React.FC<BudgetVsRealityProps> = ({
    budget,
    reality,
    currency = '$'
}) => {

    // Calculate percentage used
    const percentage = Math.round((reality / budget) * 100);
    const isOverBudget = reality > budget;
    const remaining = budget - reality;

    const data = [
        {
            name: 'Presupuesto',
            amount: budget,
            color: '#3B82F6' // Blue
        },
        {
            name: 'Realidad',
            amount: reality,
            color: isOverBudget ? '#EF4444' : '#10B981' // Red if over, Green if under
        }
    ];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="text-blue-500" size={20} />
                        Presupuesto vs Realidad
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Comparativa de gasto acumulado este mes.
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${isOverBudget
                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
                        : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900'
                    }`}>
                    {isOverBudget ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                    {isOverBudget ? 'Excedido' : 'En Rango'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Chart */}
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.5} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                                width={80}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={32}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-black/20">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Presupuesto (Est.)</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                            {currency}{budget.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-black/20">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Gasto Real</span>
                        <span className={`text-lg font-bold font-mono ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                            {currency}{reality.toLocaleString()}
                        </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Estado del Presupuesto</span>
                            <span className={`font-bold ${isOverBudget ? 'text-red-500' : 'text-blue-500'}`}>{percentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-center mt-2 text-slate-400">
                            {isOverBudget
                                ? `Te has excedido por ${currency}${Math.abs(remaining).toLocaleString()}`
                                : `Te quedan ${currency}${remaining.toLocaleString()} disponibles`
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
