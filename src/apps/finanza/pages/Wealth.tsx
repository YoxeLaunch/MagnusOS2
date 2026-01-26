import React, { useState } from 'react';
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
    Wallet
} from 'lucide-react';

export const Wealth: React.FC = () => {
    // Hooks from Savings
    const { data, currencies, isSimulating, toggleSimulation, updateCurrencyRate } = useData();
    const { timeOffset } = useTime();

    // Savings Calculations
    const totalIncome = calculateTotalAnnual(data.incomes);
    const totalExpenses = calculateTotalAnnual(data.expenses);
    const availableSavings = totalIncome - totalExpenses;
    const netSavings = availableSavings - data.materialInvestment;
    const annualSavingsDOP = 145000; // Static legacy value/goal
    const investmentDOP = 71888; // Static legacy value/goal

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

            {/* --- SECTION 1: SAVINGS & INVESTMENT --- */}
            <section>
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold leading-7 sm:text-3xl sm:truncate text-gray-900 dark:text-white flex items-center gap-3">
                            <Wallet className="text-primary" /> Patrimonio Global
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visión unificada de Ahorro, Inversión y Divisas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                    <Card
                        label="Ingreso Neto Anual"
                        value={totalIncome}
                        icon={TrendingUp}
                        color="text-secondary"
                        borderColor="border-secondary"
                    />
                    <Card
                        label="Ahorro Disponible"
                        value={availableSavings}
                        icon={PiggyBank}
                        color="text-primary"
                        borderColor="border-primary"
                    />
                    <Card
                        label="Inversión Material"
                        value={data.materialInvestment}
                        icon={Hammer}
                        color="text-yellow-500"
                        borderColor="border-yellow-500"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Detail 1: Cash Flow */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl shadow-sm rounded-xl p-6 border border-gray-100 dark:border-white/10">
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 dark:border-white/5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-white text-xs mr-2">1</span>
                                Flujo de Caja
                            </h3>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ingresos Totales</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(totalIncome)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                                    <div className="bg-secondary h-2 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Gastos Totales</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(totalExpenses)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min((totalExpenses / totalIncome) * 100, 100)}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg mt-4 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Métricas Clave</h4>
                                <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">Tasa de Ahorro</span><span className="font-bold text-primary">{(availableSavings / totalIncome * 100).toFixed(1)}%</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">Margen Libre</span><span className="font-medium text-gray-900 dark:text-white">{formatCurrency(availableSavings / 12)} / mes</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Investment Details */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl shadow-sm rounded-xl p-6 border border-gray-100 dark:border-white/10">
                                <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-white/5 pb-2">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500 text-white text-xs mr-2">2</span>
                                        Inversión (Material)
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center"><ShoppingBag className="text-yellow-500 mr-3" size={20} /><span className="text-sm font-medium text-gray-700 dark:text-gray-200">Renovación Guardarropa</span></div>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white mr-2">$15,000</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center"><Laptop className="text-yellow-500 mr-3" size={20} /><span className="text-sm font-medium text-gray-700 dark:text-gray-200">Tech & Equipo</span></div>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white mr-2">$60,000</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-200 dark:border-white/10 flex justify-between mt-2">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Inversión</span>
                                        <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(data.materialInvestment)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-center">
                                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-white opacity-10 blur-xl"></div>
                                <h3 className="text-lg font-bold mb-4 relative z-10 flex items-center">
                                    <Briefcase className="mr-2" size={20} /> Distribución Final
                                </h3>
                                <div className="space-y-3 relative z-10 text-blue-100">
                                    <div className="flex justify-between text-sm border-b border-blue-400/30 pb-2"><span>Disponible</span><span className="font-medium text-white">{formatCurrency(availableSavings)}</span></div>
                                    <div className="flex justify-between text-sm text-yellow-200"><span>(-) Inversión Material</span><span>-{formatCurrency(data.materialInvestment)}</span></div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-blue-400 border-opacity-30 relative z-10">
                                    <p className="text-xs uppercase tracking-widest text-blue-200 mb-1">Ahorro Neto Real 2026</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold text-white tracking-tight">{formatCurrency(netSavings)}</span>
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

                            {/* Cross Rate Display */}
                            <div className="pt-3 border-t border-white/20 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm opacity-80 flex items-center gap-2">
                                        <Euro size={14} /> <span className="text-xs">➜</span> <DollarSign size={14} />
                                    </span>
                                    <span className="font-bold text-lg">
                                        1 € = {formatUSD(currencies.eur.rate / currencies.usd.rate)}
                                    </span>
                                </div>
                                <p className="text-right text-xs opacity-60 mt-1">Tasa cruzada implícita</p>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl p-6 shadow-sm border border-gray-100 dark:border-white/10">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Impacto en Presupuesto</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Ahorro Neto 2026</span>
                                <PiggyBank size={18} className="text-gray-400" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">RD$ {annualSavingsDOP.toLocaleString()}</div>
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
                                <span className="text-xs text-gray-500">Valor USD Hoy:</span>
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">{formatUSD(annualSavingsDOP / currencies.usd.rate)}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Inversión Material</span>
                                <ShoppingBag size={18} className="text-gray-400" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">RD$ {investmentDOP.toLocaleString()}</div>
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
                                <span className="text-xs text-gray-500">Valor USD Hoy:</span>
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">{formatUSD(investmentDOP / currencies.usd.rate)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const Card = ({ label, value, icon: Icon, color, borderColor }: any) => (
    <div className={`bg-white/80 dark:bg-black/40 backdrop-blur-xl overflow-hidden shadow-sm rounded-xl border-l-4 ${borderColor} p-6 border border-gray-100 dark:border-white/10`}>
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
