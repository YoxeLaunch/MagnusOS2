import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { getPortfolioSnapshot, formatCurrency } from '../utils/calculations';
import { cashFlowApi, NetWorthResponse, CashFlowResponse } from '../api/finanzaApi';
import { minorToSafeNumber, parseDecimalToSafeNumber } from '../utils/moneySafety';
import { formatPeriodLong } from '../utils/bankingFormatters';
import { Building2, TrendingUp, PiggyBank, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, X, Scale, Info, ShieldCheck, AlertCircle } from 'lucide-react';

export const Wealth: React.FC = () => {
    const { data, dailyTransactions, currencies } = useData();
    const [currentDate] = useState(new Date());

    // Currency State
    const [dolarRate, setDolarRate] = useState(60.50);
    const [euroRate, setEuroRate] = useState(65.20);
    const [isEditingRates, setIsEditingRates] = useState(false);

    const [ledgerNetWorth, setLedgerNetWorth] = useState<NetWorthResponse | null>(null);
    const [ledgerCashFlow, setLedgerCashFlow] = useState<CashFlowResponse | null>(null);

    // Fetch canonical ledger net worth and cash flow
    useEffect(() => {
        let mounted = true;
        const now = currentDate.toISOString().slice(0, 10);
        const monthStart = `${now.slice(0, 7)}-01`;
        const [y, m] = now.slice(0, 7).split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const monthEnd = `${now.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;

        Promise.all([
            cashFlowApi.getNetWorth({ asOfDate: now }).catch(() => null),
            cashFlowApi.getCashFlow({ startDate: monthStart, endDate: monthEnd }).catch(() => null)
        ]).then(([nw, cf]) => {
            if (mounted) {
                if (nw) setLedgerNetWorth(nw);
                if (cf) setLedgerCashFlow(cf);
            }
        });

        return () => { mounted = false; };
    }, [currentDate]);

    // Safety check for data
    if (!data) return <div className="p-8 text-center text-slate-500">Cargando datos financieros...</div>;

    const { liquidAssets, investedAssets, materialAssets, netWorth, cashFlow, savingsRate } = (() => {
        const snap = getPortfolioSnapshot(data, dailyTransactions, currencies);
        const finalNetWorth = ledgerNetWorth
            ? (ledgerNetWorth.netWorthMinor ? minorToSafeNumber(ledgerNetWorth.netWorthMinor, 'netWorth') : parseDecimalToSafeNumber(ledgerNetWorth.netWorth, 'netWorth'))
            : snap.netWorth;
        const finalCashFlow = ledgerCashFlow
            ? (ledgerCashFlow.netCashFlowMinor ? minorToSafeNumber(ledgerCashFlow.netCashFlowMinor, 'netCashFlow') : parseDecimalToSafeNumber(ledgerCashFlow.netCashFlow, 'netCashFlow'))
            : (snap.dailyNet || 0);
        const finalIncome = ledgerCashFlow
            ? (ledgerCashFlow.totalIncomeMinor ? minorToSafeNumber(ledgerCashFlow.totalIncomeMinor, 'totalIncome') : parseDecimalToSafeNumber(ledgerCashFlow.totalIncome, 'totalIncome'))
            : 0;
        const finalSavingsRate = finalIncome > 0 ? (finalCashFlow / finalIncome) * 100 : 0;
        const ledgerInvested = ledgerNetWorth?.accounts
            .filter(account => account.type === 'investment')
            .reduce((sum, account) => sum + Math.max(0, account.balanceMinor ? minorToSafeNumber(account.balanceMinor, 'account.balance') : parseDecimalToSafeNumber(account.balance, 'account.balance')), 0);
        const finalInvested = ledgerNetWorth ? (ledgerInvested || 0) : snap.investedAssets;
        const ledgerAssets = ledgerNetWorth
            ? (ledgerNetWorth.assetsMinor ? minorToSafeNumber(ledgerNetWorth.assetsMinor, 'assets') : parseDecimalToSafeNumber(ledgerNetWorth.assets, 'assets'))
            : snap.liquidAssets;
        const finalLiquid = ledgerNetWorth ? Math.max(0, ledgerAssets - finalInvested) : snap.liquidAssets;

        return {
            liquidAssets: Math.max(0, finalLiquid),
            investedAssets: finalInvested,
            materialAssets: ledgerNetWorth ? 0 : snap.materialAssets,
            netWorth: finalNetWorth,
            cashFlow: finalCashFlow,
            savingsRate: finalSavingsRate
        };
    })();

    const realNetWorth = ledgerNetWorth?.realNetWorth;

    return (
        <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 pb-32">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Building2 className="text-emerald-600" size={32} />
                        Patrimonio Global
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl font-sans">
                        Posición financiera consolidada: activos registrados en el Ledger, obligaciones y poder adquisitivo real.
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
                        title="Ajustar tipos de cambio de referencia"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN 1: CUATRO INDICADORES PRINCIPALES (DISTRIBUCIÓN ADAPTABLE)        */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* KPI 1: Patrimonio Neto Total (Hero) */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group flex flex-col justify-between border border-slate-700/50">
                    <div>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <Building2 size={64} />
                        </div>
                        <p className="text-xs uppercase tracking-wider text-slate-400 font-mono mb-1">Patrimonio Neto Nominal</p>
                        <h2 className="text-3xl font-serif font-bold tracking-tight mb-2 text-white">
                            {formatCurrency(netWorth)}
                        </h2>
                        <p className="text-xs text-slate-400">
                            Cuentas contables: <span className="font-mono text-slate-200 font-bold">{ledgerNetWorth?.accountsCount || 0}</span>
                        </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                        <span className="text-slate-400 font-mono text-[11px]">Moneda base:</span>
                        <span className="font-mono text-emerald-400 font-bold">{ledgerNetWorth?.currency || 'DOP'}</span>
                    </div>
                </div>

                {/* KPI 2: Activos Líquidos */}
                <KPICard
                    title="Activos Líquidos"
                    amount={liquidAssets}
                    icon={Wallet}
                    color="text-blue-500"
                    subtext="Efectivo y cuentas bancarias"
                />

                {/* KPI 3: Inversiones */}
                <KPICard
                    title="Inversiones"
                    amount={investedAssets}
                    icon={TrendingUp}
                    color="text-purple-500"
                    subtext="Portafolio e instrumentos"
                />

                {/* KPI 4: Flujo de Caja (Mes) */}
                <KPICard
                    title="Flujo de Caja (Mes)"
                    amount={cashFlow}
                    icon={DollarSign}
                    color="text-emerald-500"
                    trend={savingsRate}
                    trendLabel="Tasa de Ahorro"
                />
            </div>

            {/* ========================================================================= */}
            {/* SECCIÓN 2: PATRIMONIO REAL — MECE (SECCIÓN DIFERENCIADA Y LEGIBLE)         */}
            {/* ========================================================================= */}
            <RealNetWorthExecutiveSection
                realData={realNetWorth}
                nominalNetWorth={netWorth}
            />

            {/* ========================================================================= */}
            {/* SECCIÓN 3: DESGLOSE DE ACTIVOS REGISTRADOS EN LEDGER                      */}
            {/* ========================================================================= */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PiggyBank className="text-emerald-600" />
                        Desglose de Activos Contables
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                        Fuente: Libro Mayor (Double-Entry Ledger)
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Liquid Assets List */}
                    <div className="bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex justify-between items-center">
                            <span>Liquidez</span>
                            <span className="text-emerald-600 font-mono">{formatCurrency(liquidAssets)}</span>
                        </h4>
                        <div className="space-y-3">
                            {(ledgerNetWorth?.accounts || []).filter(acc => ['cash', 'checking', 'savings'].includes(acc.type)).map(acc => (
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
                                    <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(acc.balance, acc.currency)}</span>
                                </div>
                            ))}
                            {(ledgerNetWorth?.accounts || []).filter(acc => ['cash', 'checking', 'savings'].includes(acc.type)).length === 0 && (
                                <p className="text-xs text-slate-400 py-3 text-center">No hay cuentas de liquidez activas.</p>
                            )}
                        </div>
                    </div>

                    {/* Investments List */}
                    <div className="bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex justify-between items-center">
                            <span>Inversiones</span>
                            <span className="text-purple-600 font-mono">{formatCurrency(investedAssets)}</span>
                        </h4>
                        <div className="space-y-3">
                            {(ledgerNetWorth?.accounts || []).filter(acc => acc.type === 'investment').map(inv => (
                                <div key={inv.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                            <TrendingUp size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700 dark:text-gray-300">{inv.name}</p>
                                            <p className="text-xs text-gray-400 capitalize">Cuenta ledger</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(inv.balance, inv.currency)}</span>
                                </div>
                            ))}
                            {(ledgerNetWorth?.accounts || []).filter(acc => acc.type === 'investment').length === 0 && (
                                <p className="text-xs text-slate-400 py-3 text-center">Sin posiciones de inversión registradas.</p>
                            )}
                        </div>
                    </div>

                    {/* Material Assets List */}
                    <div className="bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col justify-between">
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex justify-between items-center">
                                <span>Activos Físicos</span>
                                <span className="text-amber-600 font-mono">{formatCurrency(materialAssets)}</span>
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                No se atribuyen saldos estimados a activos físicos hasta que estén debidamente respaldados por una cuenta de balance en el Libro Mayor.
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400 font-mono">
                            Estado: Verificado contablemente
                        </div>
                    </div>
                </div>
            </div>

            {/* Currency Edit Modal */}
            {isEditingRates && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Tasas de Cambio de Referencia</h3>
                            <button onClick={() => setIsEditingRates(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono font-bold text-slate-500 mb-1">USD / DOP</label>
                                <input
                                    type="number"
                                    value={dolarRate}
                                    onChange={(e) => setDolarRate(parseFloat(e.target.value) || 0)}
                                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-950 dark:border-white/10 dark:text-white font-mono text-sm"
                                    step="0.05"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-mono font-bold text-slate-500 mb-1">EUR / DOP</label>
                                <input
                                    type="number"
                                    value={euroRate}
                                    onChange={(e) => setEuroRate(parseFloat(e.target.value) || 0)}
                                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-950 dark:border-white/10 dark:text-white font-mono text-sm"
                                    step="0.05"
                                />
                            </div>
                            <button
                                onClick={() => setIsEditingRates(false)}
                                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition font-mono text-sm mt-2"
                            >
                                Confirmar Tasas
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
            <span className="text-[10px] font-bold text-slate-400 font-mono">{code}</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">RD${value}</span>
        </div>
    </div>
);

const KPICard = ({ title, amount, icon: Icon, color, subtext, trend, trendLabel }: any) => (
    <div className="bg-white dark:bg-slate-900/80 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 group flex flex-col justify-between backdrop-blur-xl">
        <div className="flex justify-between items-start mb-3">
            <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">{title}</p>
                <h3 className="text-2xl font-bold font-serif text-slate-900 dark:text-white mt-1">{formatCurrency(amount)}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-gray-50 dark:bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={22} />
            </div>
        </div>
        {trend !== undefined ? (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{trendLabel}</span>
                    <span className="font-bold font-mono text-emerald-500">{trend.toFixed(1)}%</span>
                </div>
                <ProgressBar value={trend} color="bg-emerald-500" />
            </div>
        ) : (
            <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-white/5 font-sans">{subtext}</p>
        )}
    </div>
);

const ProgressBar = ({ value, color }: { value: number, color: string }) => (
    <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
);

/**
 * Sección Ejecutiva Diferenciada para Patrimonio Real (MECE)
 * Diseñada para máxima legibilidad, separando el impacto del valor real frente a la inflación
 */
interface RealNetWorthSectionProps {
    realData?: NetWorthResponse['realNetWorth'];
    nominalNetWorth: number;
}

const RealNetWorthExecutiveSection: React.FC<RealNetWorthSectionProps> = ({ realData, nominalNetWorth }) => {
    if (!realData || realData.status === 'UNAVAILABLE' || realData.status === 'CURRENCY_NOT_SUPPORTED') {
        return (
            <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">Patrimonio Real Deflactado (MECE)</h3>
                        <p className="text-xs text-slate-400 font-mono">{realData?.message || 'Ajuste de inflación BCRD no disponible para este período.'}</p>
                    </div>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400">
                    Dato no disponible
                </span>
            </div>
        );
    }

    const isProvisional = realData.status === 'PROVISIONAL_PENDING_CPI';
    const isOfficial = realData.status === 'OFFICIAL_VERIFIED' || realData.status === 'HISTORICAL_SERIES';
    const cpiMonthYear = realData.cpiPeriodUsed ? formatPeriodLong(realData.cpiPeriodUsed).toLowerCase() : 'no disponible';
    const balanceMonthYear = realData.referencePeriod ? formatPeriodLong(realData.referencePeriod) : 'no disponible';

    return (
        <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950 border border-emerald-500/20 rounded-2xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Columna Izquierda: Métricas de Valor (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className={`p-2.5 rounded-xl ${isProvisional ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            <Scale size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-serif font-bold text-lg md:text-xl text-white">
                                    {isProvisional ? 'Patrimonio Real Provisional' : 'Patrimonio Neto Real (Ajustado por Inflación)'}
                                </h3>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                    isOfficial
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : isProvisional
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                        : 'bg-slate-700 text-slate-300 border-slate-600'
                                }`}>
                                    {isOfficial ? 'Oficial BCRD' : isProvisional ? `Prov. (IPC ${cpiMonthYear})` : 'Pendiente BCRD'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono">
                                Motor de Convergencia Económica MECE — Deflactado a precios de {realData.basePeriod}
                            </p>
                        </div>
                    </div>

                    {/* Cifra Principal y Comparativa */}
                    <div className="flex flex-wrap items-baseline gap-4 pt-1">
                        <div>
                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block">Poder Real Adquisitivo</span>
                            <span className="text-3xl md:text-4xl font-serif font-bold text-emerald-400 tracking-tight">
                                {realData.realNetWorth !== null ? formatCurrency(realData.realNetWorth) : 'Dato no disponible'}
                            </span>
                        </div>
                        <div className="border-l border-slate-700/80 pl-4">
                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block">Saldo Nominal</span>
                            <span className="text-xl md:text-2xl font-serif font-semibold text-slate-300">
                                {formatCurrency(nominalNetWorth)}
                            </span>
                        </div>
                    </div>

                    {/* Erosión Inflacionaria */}
                    {realData.inflationErosion !== null && realData.inflationErosion !== undefined && (
                        <div className="flex items-center gap-3 pt-1">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs font-bold">
                                <ArrowDownRight size={14} />
                                -RD$ {realData.inflationErosion.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (-{realData.inflationErosionPct}%)
                            </div>
                            <span className="text-xs text-slate-400">
                                Pérdida de poder adquisitivo acumulada frente al período base ({realData.basePeriod})
                            </span>
                        </div>
                    )}
                </div>

                {/* Columna Derecha: Gobernanza Temporal y Trazabilidad (5 cols) */}
                <div className="lg:col-span-5 bg-slate-950/60 rounded-xl p-5 border border-white/5 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-400" /> Gobernanza Temporal
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase">Auditado</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Corte del Saldo:</span>
                            <span className="text-slate-200 font-bold capitalize">{balanceMonthYear}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">IPC Aplicado:</span>
                            <span className="text-amber-400 font-bold">
                                {realData.cpiUsed ?? 'N/D'} <span className="text-slate-400 font-normal">({cpiMonthYear})</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Período Base:</span>
                            <span className="text-slate-200">{realData.basePeriod} (IPC {realData.baseCpi})</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Fuente Oficial:</span>
                            <span className="text-slate-300">{realData.source}</span>
                        </div>
                    </div>

                    {isProvisional && (
                        <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-[11px] text-amber-400/90 font-sans leading-tight">
                            <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                            <span>
                                {realData.message || `El IPC oficial para ${balanceMonthYear} aún se encuentra pendiente de publicación por el BCRD.`}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
