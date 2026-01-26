import React from 'react';
import { calculateSavingsRate, calculateBurnRate, calculateRunway } from '../../utils/financialMetrics';
import { Battery, Activity, Timer } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface HealthIndicatorsProps {
    income: number;
    expense: number;
    balance: number;
    daysElapsed: number;
    currentDate: Date;
}

export const HealthIndicators: React.FC<HealthIndicatorsProps> = ({ income, expense, balance, daysElapsed, currentDate }) => {
    const savingsRate = calculateSavingsRate(income, expense);
    const dailyBurnRate = calculateBurnRate(expense, daysElapsed);
    const runwayDays = calculateRunway(balance, dailyBurnRate);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Savings Rate - Green/Emerald Gradient */}
            <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 text-white p-6 rounded-2xl shadow-2xl border border-emerald-400/20 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10">
                    <Battery size={100} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Battery size={18} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-90">Tasa de Ahorro</span>
                    </div>
                    <div>
                        <span className="text-4xl font-bold">{savingsRate.toFixed(1)}%</span>
                        <p className="text-xs opacity-80 mt-1">Del ingreso total del mes</p>
                    </div>
                    <div className="w-full bg-white/20 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="h-full bg-white transition-all duration-1000" style={{ width: `${Math.min(savingsRate, 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Daily Burn Rate - Blue/Cyan Gradient */}
            <div className="bg-gradient-to-br from-blue-500 via-cyan-600 to-sky-600 text-white p-6 rounded-2xl shadow-2xl border border-blue-400/20 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10">
                    <Activity size={100} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Activity size={18} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-90">Burn Rate Diario</span>
                    </div>
                    <div>
                        <span className="text-4xl font-bold">{formatCurrency(dailyBurnRate)}</span>
                        <p className="text-xs opacity-80 mt-1">Gasto promedio por día</p>
                    </div>
                </div>
            </div>

            {/* Runway - Green/Yellow Gradient */}
            <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-lime-600 text-white p-6 rounded-2xl shadow-2xl border border-green-400/20 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10">
                    <Timer size={100} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Timer size={18} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-90">Runway Estimado</span>
                    </div>
                    <div>
                        {dailyBurnRate <= 0 ? (
                            <span className="text-4xl font-bold">∞</span>
                        ) : (
                            <span className="text-4xl font-bold">{runwayDays.toFixed(0)} Días</span>
                        )}
                        <p className="text-xs opacity-80 mt-1">Supervivencia con saldo actual</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
