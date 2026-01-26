import React from 'react';
import { TrendingUp, Coins } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface WealthWidgetProps {
    totalWealth: number;
    invested: number;
    available: number;
    monthlyGrowth?: number;
}

export const WealthWidget: React.FC<WealthWidgetProps> = ({
    totalWealth,
    invested,
    available,
    monthlyGrowth = 0
}) => {
    const investedPercentage = totalWealth > 0 ? (invested / totalWealth) * 100 : 0;
    const availablePercentage = totalWealth > 0 ? (available / totalWealth) * 100 : 0;

    return (
        <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 text-white p-6 rounded-2xl relative overflow-hidden shadow-2xl border border-yellow-600/20">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400 rounded-full blur-2xl"></div>
            </div>

            {/* Icon */}
            <div className="absolute top-4 right-4 opacity-20">
                <Coins size={64} />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-yellow-400/20 rounded-lg">
                        <TrendingUp size={18} className="text-yellow-300" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-yellow-200">
                        Patrimonio Neto
                    </span>
                </div>

                {/* Main Value */}
                <h2 className="text-4xl font-bold mb-2 text-yellow-50">
                    {formatCurrency(totalWealth)}
                </h2>

                {/* Growth Indicator */}
                {monthlyGrowth !== 0 && (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${monthlyGrowth > 0
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                        <TrendingUp size={12} className={monthlyGrowth < 0 ? 'rotate-180' : ''} />
                        {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}% este mes
                    </div>
                )}

                {/* Breakdown */}
                <div className="mt-4 pt-4 border-t border-yellow-600/30">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-yellow-300/70 mb-1">Capital Invertido</p>
                            <p className="font-bold text-yellow-100">{formatCurrency(invested)}</p>
                            <p className="text-yellow-400/60 text-[10px] mt-0.5">{investedPercentage.toFixed(1)}%</p>
                        </div>
                        <div>
                            <p className="text-yellow-300/70 mb-1">Liquidez</p>
                            <p className="font-bold text-yellow-100">{formatCurrency(available)}</p>
                            <p className="text-yellow-400/60 text-[10px] mt-0.5">{availablePercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
