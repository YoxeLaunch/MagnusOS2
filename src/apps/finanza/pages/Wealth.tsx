import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useTime } from '../../../context/TimeContext';
import { calculateTotalAnnual, formatCurrency, formatUSD } from '../utils/calculations';
import { PortfolioHistory } from '../components/PortfolioHistory';
import { AssetAllocation } from '../components/AssetAllocation';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';
import {
    TrendingUp,
    PiggyBank,
    Hammer,
    Briefcase,
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

const WealthContent: React.FC = () => {
    // Hooks
    const {
        data,
        currencies,
        isSimulating,
        toggleSimulation,
        updateCurrencyRate,
        wealthHistory = [], // Default to empty array to prevent crash
        saveWealthSnapshot
    } = useData();
    const { timeOffset } = useTime();

    if (!data) return <div className="p-8 text-center">Cargando datos financieros...</div>;

    // Calculations
    const totalIncome = calculateTotalAnnual(data.incomes || []);
    const totalExpenses = calculateTotalAnnual(data.expenses || []);
    const availableSavings = totalIncome - totalExpenses;

    // Investment Calculations
    const investmentMetrics = useMemo(() => {
        let invested = 0;
        let current = 0;
        (data.investments || []).forEach(inv => {
            invested += inv.amount;
            current += (inv.currentValue ?? inv.amount);
        });
        return { invested, current };
    }, [data.investments]);

    // Net Worth = Cash (Available Savings) + Investments (Current Value) + Material Assets
    const netWorth = availableSavings + investmentMetrics.current + (data.materialInvestment || 0);

    // Snapshot Logic (Auto-save on mount if today's snapshot doesn't exist)
    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const alreadyHasSnapshot = wealthHistory.some(s => s.date === todayStr);

        if (!alreadyHasSnapshot && netWorth > 0) {
            // Create breakdown
            const breakdown: Record<string, number> = {
                cash: availableSavings,
                investments: investmentMetrics.current,
                material: data.materialInvestment || 0,
                liabilities: 0
            };

            saveWealthSnapshot({
                date: todayStr,
                netWorth,
                assets: netWorth,
                liabilities: 0,
                breakdown,
                currency: 'DOP'
            });
        }
    }, [wealthHistory, netWorth, availableSavings, investmentMetrics.current, data.materialInvestment, saveWealthSnapshot]);

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
        <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 pb-32">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Wallet className="text-primary" size={32} />
                        Patrimonio Integral
                    </h2>
                    <p className="mt-1 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
                        Visión 360° de tus activos, pasivos y la evolución de tu capital neto en tiempo real.
                    </p>
                </div>
                <div className="text-right hidden md:block bg-white/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 backdrop-blur-sm">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Patrimonio Neto Total</p>
                    <p className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {formatCurrency(netWorth)}
                    </p>
                    <p className="text-sm text-gray-500">
                        ≃ {formatUSD(netWorth / currencies.usd.rate)} USD
                    </p>
                </div>
            </div>

            {/* KPI CARDS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Patrimonio Neto"
                    value={netWorth}
                    icon={Wallet}
                    color="text-emerald-500"
                    trend={+2.5}
                />
                <KPICard
                    label="Flujo de Caja Anual"
                    value={availableSavings}
                    icon={PiggyBank}
                    color="text-blue-500"
                />
                <KPICard
                    label="Portafolio Inversiones"
                    value={investmentMetrics.current}
                    icon={TrendingUp}
                    color="text-purple-500"
                />
                <KPICard
                    label="Activos Físicos"
                    value={data.materialInvestment}
                    icon={Hammer}
                    color="text-yellow-500"
                />
            </div>

            {/* MAIN DASHBOARD GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* LEFT COLUMN (MAIN HISTORY) - Span 8 */}
                <div className="xl:col-span-8 space-y-6">
                    {/* Portfolio History Chart */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm min-h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <TrendingUp size={20} className="text-primary" /> Evolución del Patrimonio
                            </h3>
                            <div className="flex gap-2">
                                {/* Time range toggles generally belong here, placeholder for now */}
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">YTD</span>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0">
                            <PortfolioHistory history={wealthHistory} />
                        </div>
                    </div>

                    {/* Breakdown / Composition (Moved below history for uniform reading) */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Briefcase size={20} /> Detalle de Composición
                        </h3>
                        <div className="space-y-6">
                            <ProgressBar
                                label="Caja y Ahorros"
                                amount={availableSavings}
                                total={netWorth}
                                color="bg-blue-500"
                            />
                            <ProgressBar
                                label="Inversiones Financieras"
                                amount={investmentMetrics.current}
                                total={netWorth}
                                color="bg-purple-500"
                            />
                            <ProgressBar
                                label="Activos Materiales"
                                amount={data.materialInvestment}
                                total={netWorth}
                                color="bg-yellow-500"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (SIDEBAR) - Span 4 */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Asset Allocation Pie */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm min-h-[400px] flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Distribución</h3>
                        <div className="flex-1 min-h-0">
                            <AssetAllocation investments={data.investments || []} />
                        </div>
                    </div>

                    {/* Currency Monitor (Compact) */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <RefreshCw size={18} /> Monitor de Divisas
                            </h3>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase">Live</span>
                        </div>

                        <div className="space-y-3">
                            <CurrencyRow
                                code="USD"
                                rate={currencies.usd.rate}
                                trend={currencies.usd.trend}
                                onClick={() => startEditing('usd', currencies.usd.rate)}
                            />
                            <CurrencyRow
                                code="EUR"
                                rate={currencies.eur.rate}
                                trend={currencies.eur.trend}
                                onClick={() => startEditing('eur', currencies.eur.rate)}
                            />
                        </div>

                        {/* Quick Converter */}
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10">
                            <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Conversor Rápido</h4>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-200 dark:border-white/10">
                                <span className="text-sm font-bold text-gray-500">RD$</span>
                                <input
                                    type="number"
                                    value={calcAmount}
                                    onChange={e => setCalcAmount(Number(e.target.value))}
                                    className="bg-transparent w-full font-bold outline-none text-right"
                                />
                            </div>
                            <div className="mt-2 flex justify-between text-sm">
                                <span className="text-gray-500">USD: <span className="font-bold text-gray-900 dark:text-white">{formatUSD(calcAmount / currencies.usd.rate)}</span></span>
                                <span className="text-gray-500">EUR: <span className="font-bold text-gray-900 dark:text-white">€{(calcAmount / currencies.eur.rate).toFixed(2)}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editing Logic */}
            {editingCurrency && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-2xl w-80">
                        <h3 className="font-bold text-lg mb-4">Editar Tasa {editingCurrency.toUpperCase()}</h3>
                        <input
                            type="number"
                            autoFocus
                            className="w-full p-2 text-xl font-bold border rounded mb-4 bg-transparent border-gray-300 dark:border-gray-700"
                            value={tempRate}
                            onChange={(e) => setTempRate(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={cancelEditing} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                            <button onClick={saveRate} className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primaryDark">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const Wealth: React.FC = () => (
    <ErrorBoundary>
        <WealthContent />
    </ErrorBoundary>
);

// Sub-components for cleaner file
const KPICard = ({ label, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between h-full hover:border-blue-500/20 transition-all">
        <div className="flex items-start justify-between mb-2">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                <Icon className={color} size={20} />
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(value)}</p>
        </div>
    </div>
);
const ProgressBar = ({ label, amount, total, color }: any) => (
    <div>
        <div className="flex justify-between items-center mb-1 text-sm">
            <span className="text-gray-600 dark:text-gray-300">{label}</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(amount)} <span className="text-xs text-gray-400 font-normal">({((amount / total) * 100).toFixed(1)}%)</span></span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className={`${color} h-2 rounded-full`} style={{ width: `${(amount / total) * 100}%` }}></div>
        </div>
    </div>
);

const CurrencyRow = ({ code, rate, trend, onClick }: any) => (
    <div
        onClick={onClick}
        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10 group"
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${code === 'USD' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {code === 'USD' ? '$' : '€'}
            </div>
            <span className="font-medium text-gray-900 dark:text-white">{code === 'USD' ? 'Dólar' : 'Euro'}</span>
        </div>
        <div className="text-right">
            <p className="font-bold text-gray-900 dark:text-white">RD$ {rate.toFixed(2)}</p>
            {/* <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click para editar</span> */}
        </div>
    </div>
);
