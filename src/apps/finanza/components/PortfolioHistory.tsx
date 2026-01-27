import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../utils/calculations';
import { WealthSnapshot } from '../types';

interface PortfolioHistoryProps {
    history: WealthSnapshot[];
}

export const PortfolioHistory: React.FC<PortfolioHistoryProps> = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white/50 dark:bg-black/20 rounded-xl border border-dashed border-gray-300 dark:border-white/10 p-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                    Aún no hay historial de patrimonio.
                    <br />
                    Tus datos se guardarán automáticamente con el tiempo.
                </p>
            </div>
        );
    }

    const data = history.map(item => ({
        date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        fullDate: item.date,
        amount: item.netWorth
    }));

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl p-6 shadow-sm border border-gray-100 dark:border-white/10 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Evolución del Patrimonio</h3>

            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 0,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            dy={10}
                        />
                        <YAxis
                            hide={true}
                            domain={['dataMin', 'dataMax']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(12px)',
                                color: 'white'
                            }}
                            itemStyle={{ color: '#10B981' }}
                            formatter={(value: number) => [formatCurrency(value), 'Patrimonio']}
                            labelFormatter={(label) => label} // Could enhance label if needed
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#10B981"
                            strokeWidth={2}
                            fill="url(#colorNetWorth)"
                            activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
