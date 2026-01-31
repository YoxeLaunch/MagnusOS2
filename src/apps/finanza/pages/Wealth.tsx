
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { calculateNetWorth, formatCurrency } from '../utils/calculations';
import { Building2, TrendingUp, PiggyBank, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, X } from 'lucide-react';
import { AssetAllocation } from '../components/AssetAllocation';
import { PortfolioHistory } from '../components/PortfolioHistory';

export const Wealth: React.FC = () => {
    const { data, wealthHistory } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());

    // Currency State
    const [dolarRate, setDolarRate] = useState(60.50);
    const [euroRate, setEuroRate] = useState(65.20);
    const [isEditingRates, setIsEditingRates] = useState(false);

    // Snapshot Trigger Effect (Simulated Backend Call)
    useEffect(() => {
        // En una app real, esto llamaría a POST /api/wealth/snapshot
        // Para este prototipo, asumimos que el backend maneja el historial
        console.log('Wealth Dashboard Mounted - Triggering Snapshot Check');
    }, []);

    const netWorth = calculateNetWorth(data);

    // Safety check for data
    if (!data) return <div className="p-8 text-center text-slate-500">Cargando datos financieros...</div>;

    // Mock Cash Flow (In a real app, this comes from transactions in the current month)
    const monthlyTransactions = data.transactions || [];

    const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentDate.toISOString().slice(0, 7)))
        .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentDate.toISOString().slice(0, 7)))
        .reduce((sum, t) => sum + t.amount, 0);

    const cashFlow = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (cashFlow / monthlyIncome) * 100 : 0;

    const liquidAssets = data.accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;
    const investedAssets = data.investments?.reduce((sum, inv) => sum + (inv.currentValue || inv.amount), 0) || 0;
    const materialAssets = data.assets?.reduce((sum, asset) => sum + asset.value, 0) || 0;

    return (
        <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 pb-32">

            {/* HERDER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Building2 className="text-emerald-600" size={32} />
                        Patrimonio Neto
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl font-sans">
                        Visión consolidada de todos tus activos y pasivos.
                    </p>
                </div>

                {/* Currency Monitor */}
                <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 p-2 rounded-xl border border-gray-200 dark:border-white/10 backdrop-blur-sm">
                    <CurrencyRow flag="🇺🇸" code="USD" value={dolarRate} />
                    <div className="w-px h-8 bg-gray-300 dark:bg-white/10"></div>
                    <CurrencyRow flag="🇪🇺" code="EUR" value={euroRate} />
                    <button
                        onClick={() => setIsEditingRates(true)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* SECTION 1: HIGH LEVEL METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Net Worth Card (Hero) */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Building2 size={64} />
                    </div>
                    <p className="text-sm text-slate-400 font-medium mb-1">Patrimonio Neto Total</p>
                    <h2 className="text-4xl font-bold tracking-tight mb-4">
                        {formatCurrency(netWorth)}
                    </h2>
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                        <ArrowUpRight size={16} />
                        <span>+2.4% este mes</span>
                    </div>
                </div>

                <KPICard
                    title="Flujo de Caja (Mes)"
                    amount={cashFlow}
                    icon={DollarSign}
                    color="text-emerald-500"
                    trend={savingsRate}
                    trendLabel="Tasa de Ahorro"
                />

                <KPICard
                    title="Activos Líquidos"
                    amount={liquidAssets}
                    icon={Wallet}
                    color="text-blue-500"
                    subtext="Cuentas Bancarias"
                />

                <KPICard
                    title="Inversiones"
                    amount={investedAssets}
                    icon={TrendingUp}
                    color="text-purple-500"
                    subtext="Portafolio Activo"
                />
            </div>

            {/* SECTION 2: CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Evolution Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            Evolución del Patrimonio
                        </h3>
                        <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded text-slate-300">YTD</span>
                    </div>
                    <div className="h-[350px] w-full">
                        {/* PASSING REQUIRED PROP: history */}
                        <PortfolioHistory history={wealthHistory || []} />
                    </div>
                </div>

                {/* Asset Allocation (1/3 width) */}
                <div className="lg:col-span-1 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col">
                    <h3 className="text-lg font-bold mb-6">Distribución</h3>
                    <div className="flex-1 flex items-center justify-center">
                        <AssetAllocation investments={data.investments || []} />
                    </div>
                </div>
            </div>

            {/* SECTION 3: ASSET BREAKDOWN */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <PiggyBank className="text-emerald-600" />
                    Desglose de Activos
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Liquid Assets List */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex justify-between">
                            <span>Liquidez</span>
                            <span className="text-emerald-600">{formatCurrency(liquidAssets)}</span>
                        </h4>
                        <div className="space-y-3">
                            {(data.accounts || []).map(acc => (
                                <div key={acc.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Wallet size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700 dark:text-gray-300">{acc.name}</p>
                                            <p className="text-xs text-gray-400 capitalize">{acc.type}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(acc.balance)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Investments List */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex justify-between">
                            <span>Inversiones</span>
                            <span className="text-purple-600">{formatCurrency(investedAssets)}</span>
                        </h4>
                        <div className="space-y-3">
                            {(data.investments || []).slice(0, 5).map(inv => (
                                <div key={inv.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                            <TrendingUp size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700 dark:text-gray-300">{inv.name}</p>
                                            <p className="text-xs text-gray-400 capitalize">{inv.category}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(inv.currentValue || inv.amount)}</span>
                                </div>
                            ))}
                            {(data.investments || []).length > 5 && (
                                <p className="text-xs text-center text-gray-400 pt-2">
                                    + {(data.investments || []).length - 5} más...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Material Assets List */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex justify-between">
                            <span>Activos Físicos</span>
                            <span className="text-amber-600">{formatCurrency(materialAssets)}</span>
                        </h4>
                        <div className="space-y-3">
                            {(data.assets || []).slice(0, 5).map(asset => (
                                <div key={asset.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                            <Building2 size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700 dark:text-gray-300">{asset.name}</p>
                                            <p className="text-xs text-gray-400 capitalize">{asset.type}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(asset.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Currency Edit Modal */}
            {isEditingRates && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg dark:text-white">Tasas de Cambio</h3>
                            <button onClick={() => setIsEditingRates(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-1">USD (Dólar)</label>
                                <input
                                    type="number"
                                    value={dolarRate}
                                    onChange={(e) => setDolarRate(parseFloat(e.target.value))}
                                    className="w-full p-2 rounded-lg border dark:bg-black/20 dark:border-white/10 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-1">EUR (Euro)</label>
                                <input
                                    type="number"
                                    value={euroRate}
                                    onChange={(e) => setEuroRate(parseFloat(e.target.value))}
                                    className="w-full p-2 rounded-lg border dark:bg-black/20 dark:border-white/10 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={() => setIsEditingRates(false)}
                                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Local Components ---

const CurrencyRow = ({ flag, code, value }: any) => (
    <div className="flex items-center gap-2 px-2">
        <span className="text-lg">{flag}</span>
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400">{code}</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">RD${value}</span>
        </div>
    </div>
);

const KPICard = ({ title, amount, icon: Icon, color, subtext, trend, trendLabel }: any) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 hover:border-blue-500/30 transition-all duration-300 group">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(amount)}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-gray-50 dark:bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
        </div>
        {trend !== undefined ? (
            <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{trendLabel}</span>
                    <span className="font-bold text-emerald-500">{trend.toFixed(1)}%</span>
                </div>
                <ProgressBar value={trend} color="bg-emerald-500" />
            </div>
        ) : (
            <p className="text-xs text-slate-400 mt-2">{subtext}</p>
        )}
    </div>
);

const ProgressBar = ({ value, color }: { value: number, color: string }) => (
    <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
);
