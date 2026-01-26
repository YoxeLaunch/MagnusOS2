import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useTime } from '../../../context/TimeContext';
import { calculateTotalAnnual, formatCurrency, formatUSD } from '../utils/calculations';
import {
    TrendingUp,
    PiggyBank,
    Hammer,
    Briefcase,
    ShoppingBag,
    Laptop,
    TrendingDown,
    RefreshCw,
    Calculator,
    DollarSign,
    Euro,
    Edit2,
    Save,
    X,
    Wallet,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Wealth: React.FC = () => {
    // Hooks
    const { data, currencies, isSimulating, toggleSimulation, updateCurrencyRate } = useData();
    const { timeOffset } = useTime();

    // Calculations
    const totalIncome = calculateTotalAnnual(data.incomes);
    const totalExpenses = calculateTotalAnnual(data.expenses);
    const availableSavings = totalIncome - totalExpenses;

    // Investment Calculations
    const investmentMetrics = useMemo(() => {
        let invested = 0;
        let current = 0;
        data.investments.forEach(inv => {
            invested += inv.amount;
            current += (inv.currentValue ?? inv.amount);
        });
        return { invested, current };
    }, [data.investments]);

    // Net Worth = Cash (Available Savings) + Investments (Current Value) + Material Assets
    // Note: availableSavings is a "flow" (Annual), not a "balance". 
    // Ideally we should have a "Current Cash Balance". For now, we assume Annual Savings = Cash Accumulation for this year.
    const netWorth = availableSavings + investmentMetrics.current + data.materialInvestment;

    const projectedNetWorth = netWorth; // Placeholder for future projection logic

    // Currencies State
    const [calcAmount, setCalcAmount] = useState<number>(1000);
    const [editingCurrency, setEditingCurrency] = useState<'usd' | 'eur' | null>(null);
    const [tempRate, setTempRate] = useState<string>('');

    // Currencies Handlers
    const startEditing = (code: 'usd' | 'eur', currentRate: number) => {
        if (isSimulating) toggleSimulation();
        setEditingCurrency(code);
        setTempRate(currentRate.toString());
    };

    const saveRate = () => {
        if (editingCurrency && tempRate) {
            const val = parseFloat(tempRate);
            if (!isNaN(val) && val > 0) {
                updateCurrencyRate(editingCurrency, val);
            }
        }
        setEditingCurrency(null);
    };

    const cancelEditing = () => {
        setEditingCurrency(null);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-12">

            {/* --- SECTION 1: GLOBAL NET WORTH --- */}
            <section>
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold leading-7 sm:text-3xl sm:truncate text-gray-900 dark:text-white flex items-center gap-3">
                            <Wallet className="text-primary" /> Patrimonio Global (Net Worth)
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visión unificada de Ahorro, Inversión y Divisas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card
                        label="Patrimonio Neto"
                        value={netWorth}
                        icon={Wallet}
                        color="text-emerald-500"
                        borderColor="border-emerald-500"
                        highlight
                    />
                    <Card
                        label="Flujo de Caja Anual"
                        value={availableSavings}
                        icon={PiggyBank}
                        color="text-blue-500"
                        borderColor="border-blue-500"
                    />
                    <Card
                        label="Inversiones (Valor)"
                        value={investmentMetrics.current}
                        icon={TrendingUp}
                        color="text-purple-500"
                        borderColor="border-purple-500"
                    />
                    <Card
                        label="Activos Materiales"
                        value={data.materialInvestment}
                        icon={Hammer}
                        color="text-yellow-500"
                        borderColor="border-yellow-500"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Detail 1: Cash Flow Breakdown */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl shadow-sm rounded-xl p-6 border border-gray-100 dark:border-white/10">
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 dark:border-white/5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                Flujo de Caja
                            </h3>
                            <Link to="/projections" className="text-xs text-primary hover:underline flex items-center">
                                Ver Proyecciones <ArrowRight size={12} className="ml-1" />
                            </Link>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ingresos</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white text-green-600">{formatCurrency(totalIncome)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Gastos</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white text-red-500">{formatCurrency(totalExpenses)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min((totalExpenses / totalIncome) * 100, 100)}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg mt-4 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Salud Financiera</h4>
                                <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">Tasa de Ahorro</span><span className="font-bold text-primary">{(availableSavings / totalIncome * 100).toFixed(1)}%</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Investment Details */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-center h-full">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
                            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <h3 className="text-2xl font-bold mb-2 flex items-center">
                                        <Briefcase className="mr-3" size={24} /> Composición
                                    </h3>
                                    <p className="text-blue-100 mb-6">Tu patrimonio se distribuye principalmente en ahorros líquidos e inversiones.</p>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm border-b border-blue-400/30 pb-2">
                                            <span>Ahorros (Cash Flow)</span>
                                            <span className="font-medium">{formatCurrency(availableSavings)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-blue-400/30 pb-2">
                                            <span>Inversiones Activas</span>
                                            <span className="font-medium">{formatCurrency(investmentMetrics.current)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-blue-400/30 pb-2">
                                            <span>Activos Materiales</span>
                                            <span className="font-medium">{formatCurrency(data.materialInvestment)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm border border-white/20">
                                    <p className="text-xs uppercase tracking-widest text-blue-200 mb-2">Total Consolidado</p>
                                    <div className="text-4xl font-bold text-white tracking-tight mb-2">
                                        {formatCurrency(netWorth)}
                                    </div>
                                    <div className="text-sm text-blue-200">
                                        ≃ {formatUSD(netWorth / currencies.usd.rate)} USD
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SECTION 2: CURRENCIES --- */}
            <section className="border-t border-slate-200 dark:border-white/10 pt-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <RefreshCw className="text-emerald-500" /> Valoración de Divisas
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Monitor de tasas de cambio y conversión en tiempo real.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSimulating && (
                            <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20 flex items-center gap-2 animate-pulse">
                                Live Simulation Active
                            </span>
                        )}
                        {!isSimulating && (
                            <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold border border-yellow-500/20">
                                Modo Manual
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* USD Card */}
                    <div className={`bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl p-6 shadow-sm border ${editingCurrency === 'usd' ? 'border-primary ring-1 ring-primary' : 'border-gray-200 dark:border-white/10'} relative overflow-hidden transition-all duration-300`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Dólar Estadounidense</p>

                                {editingCurrency === 'usd' ? (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">RD$</span>
                                        <input
                                            type="number"
                                            autoFocus
                                            className="w-24 p-1 text-xl font-bold border-b-2 border-primary bg-transparent outline-none text-gray-900 dark:text-white"
                                            value={tempRate}
                                            onChange={(e) => setTempRate(e.target.value)}
                                        />
                                        <button onClick={saveRate} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={18} /></button>
                                        <button onClick={cancelEditing} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={18} /></button>
                                    </div>
                                ) : (
                                    <div className="group flex items-center gap-2 mt-2">
                                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white transition-all">RD$ {currencies.usd.rate.toFixed(2)}</h3>
                                        <button
                                            onClick={() => startEditing('usd', currencies.usd.rate)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className={`flex items-center text-sm font-bold px-2 py-1 rounded-md ${currencies.usd.trend === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                                    {currencies.usd.trend === 'up' ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                                    {currencies.usd.change > 0 ? '+' : ''}{currencies.usd.change}%
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <RefreshCw size={10} className={isSimulating ? "animate-spin-slow" : ""} />
                                {new Date(currencies.lastUpdated.getTime() + timeOffset).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    {/* EUR Card */}
                    <div className={`bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl p-6 shadow-sm border ${editingCurrency === 'eur' ? 'border-primary ring-1 ring-primary' : 'border-gray-200 dark:border-white/10'} relative overflow-hidden transition-all duration-300`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Euro</p>

                                {editingCurrency === 'eur' ? (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">RD$</span>
                                        <input
                                            type="number"
                                            autoFocus
                                            className="w-24 p-1 text-xl font-bold border-b-2 border-primary bg-transparent outline-none text-gray-900 dark:text-white"
                                            value={tempRate}
                                            onChange={(e) => setTempRate(e.target.value)}
                                        />
                                        <button onClick={saveRate} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={18} /></button>
                                        <button onClick={cancelEditing} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={18} /></button>
                                    </div>
                                ) : (
                                    <div className="group flex items-center gap-2 mt-2">
                                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white transition-all">RD$ {currencies.eur.rate.toFixed(2)}</h3>
                                        <button
                                            onClick={() => startEditing('eur', currencies.eur.rate)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Euro size={24} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className={`flex items-center text-sm font-bold px-2 py-1 rounded-md ${currencies.eur.trend === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                                    {currencies.eur.trend === 'up' ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                                    {currencies.eur.change > 0 ? '+' : ''}{currencies.eur.change}%
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <RefreshCw size={10} className={isSimulating ? "animate-spin-slow" : ""} />
                                {new Date(currencies.lastUpdated.getTime() + timeOffset).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    {/* Converter */}
                    <div className="bg-gradient-to-br from-primary to-primaryDark rounded-xl p-6 shadow-lg text-white">
                        <h3 className="font-bold mb-4 flex items-center text-lg">
                            <Calculator className="mr-2" size={20} />
                            Conversor Rápido
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-white/10 rounded-lg p-3 flex items-center border border-white/20">
                                <span className="text-sm font-bold w-12 text-center opacity-80">RD$</span>
                                <input
                                    className="bg-transparent border-none text-white placeholder-white/50 w-full text-right font-bold text-xl focus:ring-0 p-0 outline-none"
                                    placeholder="0"
                                    type="number"
                                    value={calcAmount}
                                    onChange={(e) => setCalcAmount(Number(e.target.value))}
                                />
                            </div>
                            <div className="bg-black/20 rounded-lg p-3 flex items-center border border-white/10">
                                <span className="text-sm font-bold w-12 text-center opacity-80">USD</span>
                                <div className="w-full text-right font-bold text-xl opacity-90">
                                    {formatUSD(calcAmount / currencies.usd.rate)}
                                </div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3 flex items-center border border-white/10">
                                <span className="text-sm font-bold w-12 text-center opacity-80">EUR</span>
                                <div className="w-full text-right font-bold text-xl opacity-90">
                                    € {(calcAmount / currencies.eur.rate).toFixed(2)}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const Card = ({ label, value, icon: Icon, color, borderColor, highlight }: any) => (
    <div className={`bg-white/80 dark:bg-black/40 backdrop-blur-xl overflow-hidden shadow-sm rounded-xl border-l-4 ${borderColor} p-6 border border-gray-100 dark:border-white/10 ${highlight ? 'ring-2 ring-emerald-500/20 shadow-emerald-500/10' : ''}`}>
        <div className="flex items-center">
            <div className="flex-shrink-0">
                <Icon className={`${color}`} size={32} />
            </div>
            <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</dt>
                <dd className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(value)}</dd>
            </div>
        </div>
    </div>
);
