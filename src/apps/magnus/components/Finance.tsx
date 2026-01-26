import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Coins, TrendingUp, ShieldCheck, Wallet } from 'lucide-react';

export const Finance: React.FC = () => {
    const [income, setIncome] = useState<number>(0);

    const needs = income * 0.5;
    const wants = income * 0.3;
    const savings = income * 0.2;

    const data = [
        { name: 'Necesidades (50%)', value: needs, color: '#3B82F6' },
        { name: 'Deseos (30%)', value: wants, color: '#A855F7' },
        { name: 'Ahorro (20%)', value: savings, color: '#10B981' },
    ];

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    return (
        <div className="p-6 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <header>
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-widest uppercase">Tesorería</h2>
                <p className="text-emerald-500 dark:text-emerald-400 font-mono text-xs mt-1 uppercase">Protocolo 50/30/20</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-8">
                    <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-8 rounded-xl shadow-sm dark:shadow-none">
                        <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                            Ingreso Mensual Neto
                        </label>
                        <div className="relative">
                            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-6 h-6" />
                            <input
                                type="number"
                                value={income || ''}
                                onChange={(e) => setIncome(Number(e.target.value))}
                                placeholder="0.00"
                                className="w-full bg-slate-50 dark:bg-theme-dark border border-slate-200 dark:border-white/10 rounded-lg py-4 pl-14 pr-4 text-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-theme-gold focus:outline-none transition-colors font-mono"
                            />
                        </div>
                    </div>

                    {/* Breakdown Cards */}
                    <div className="grid gap-4">
                        <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-transparent border-l-4 !border-l-blue-500 p-6 rounded-r-xl rounded-l-md flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500 dark:text-blue-400">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-blue-500 dark:text-blue-400 font-bold uppercase text-xs tracking-wider">Necesidades (50%)</h4>
                                    <p className="text-slate-500 text-xs mt-1">Vivienda, comida, servicios</p>
                                </div>
                            </div>
                            <span className="text-xl font-mono text-slate-900 dark:text-white font-bold">{formatMoney(needs)}</span>
                        </div>

                        <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-transparent border-l-4 !border-l-purple-500 p-6 rounded-r-xl rounded-l-md flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500 dark:text-purple-400">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-purple-500 dark:text-purple-400 font-bold uppercase text-xs tracking-wider">Deseos (30%)</h4>
                                    <p className="text-slate-500 text-xs mt-1">Imagen, networking, ocio</p>
                                </div>
                            </div>
                            <span className="text-xl font-mono text-slate-900 dark:text-white font-bold">{formatMoney(wants)}</span>
                        </div>

                        <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-transparent border-l-4 !border-l-emerald-500 p-6 rounded-r-xl rounded-l-md flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500 dark:text-emerald-400">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-emerald-500 dark:text-emerald-400 font-bold uppercase text-xs tracking-wider">Fondo de Guerra (20%)</h4>
                                    <p className="text-slate-500 text-xs mt-1">Ahorro, inversiones, deuda</p>
                                </div>
                            </div>
                            <span className="text-xl font-mono text-slate-900 dark:text-white font-bold">{formatMoney(savings)}</span>
                        </div>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-8 rounded-xl flex flex-col items-center justify-center relative overflow-hidden shadow-sm dark:shadow-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-theme-gold/5 via-transparent to-transparent opacity-30 pointer-events-none"></div>

                    <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white mb-8 z-10">Distribución de Capital</h3>

                    <div className="w-full h-[300px] z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--widget-bg)', borderColor: 'var(--map-border)', color: 'var(--text-primary)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    formatter={(value: number) => formatMoney(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-8 text-center max-w-md z-10">
                        <p className="text-slate-500 dark:text-slate-400 text-sm italic">
                            "El dinero es un subproducto del valor que aportas al mercado. No persigas el dinero, persigue la competencia."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};