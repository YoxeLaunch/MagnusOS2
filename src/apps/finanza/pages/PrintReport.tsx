import React, { useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { Crown, Shield, CheckCircle, PieChart, TrendingUp, Activity, DollarSign, Calendar, ArrowRight, Wallet, Target, AlertTriangle, BarChart2 } from 'lucide-react';
import { calculateAnnualAmountV2, formatCurrency } from '../utils/calculations';
import { Transaction } from '../../../shared/types';
import { getFinancialCycle, isDateInCycle } from '../utils/financialCycle';

export const PrintReport: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { data, dailyTransactions, currencies, isLoading } = useData();
    const { user } = useAuth();

    // --- OPTIONS ---
    const includeSummary = searchParams.get('summary') === 'true';
    const includeBudget = searchParams.get('budget') === 'true';
    const includeInvestments = searchParams.get('investments') === 'true';
    const includeForecast = searchParams.get('forecast') === 'true';
    const includeDaily = searchParams.get('daily') === 'true';
    const startDateParam = searchParams.get('start');
    const endDateParam = searchParams.get('end');

    // --- HELPERS ---
    const convertToDOP = useCallback((amount: number, currency?: string) => {
        if (currency === 'USD' && currencies?.usd) return amount * currencies.usd.rate;
        if (currency === 'EUR' && currencies?.eur) return amount * currencies.eur.rate;
        return amount;
    }, [currencies]);

    const calculateMonthlyAmount = (t: Transaction | any) => {
        return calculateAnnualAmountV2(t, currencies) / 12;
    };

    // --- DATA CALCULATIONS ---
    const currentCycle = getFinancialCycle(new Date());
    const reportDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 1. Budget & Cash Flow
    const totalIncome = data.incomes.reduce((acc, curr) => acc + calculateMonthlyAmount(curr), 0);
    const totalFixedExpense = data.expenses.reduce((acc, curr) => acc + calculateMonthlyAmount(curr), 0);

    // Real stats calculation (current cycle)
    const realStats = useMemo(() => {
        let income = 0;
        let expense = 0;
        let investment = 0;

        dailyTransactions.forEach(t => {
            const amountInDOP = convertToDOP(t.amount, (t as any).currency);
            if (isDateInCycle(t.date, currentCycle)) {
                if (t.type === 'income') income += amountInDOP;
                else if (t.type === 'investment') investment += amountInDOP;
                else expense += amountInDOP;
            }
        });
        return { income, expense, investment };
    }, [dailyTransactions, currentCycle, convertToDOP]);

    // All-time stats
    const allTimeStats = useMemo(() => {
        let income = 0; let expense = 0; let investment = 0;
        dailyTransactions.forEach(t => {
            const amt = convertToDOP(t.amount, (t as any).currency);
            if (t.type === 'income') income += amt;
            else if (t.type === 'investment') investment += amt;
            else expense += amt;
        });
        return { income, expense, investment, net: income - expense - investment };
    }, [dailyTransactions, convertToDOP]);

    // Accounts balance
    const accountsBalance = useMemo(() => {
        return ((data as any).accounts || []).reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
    }, [data]);

    // Wealth Calc
    const availableLiquidity = accountsBalance > 0 ? accountsBalance : (allTimeStats.net);
    const investedAssets = (data.investments?.reduce((sum: number, inv: any) => sum + (inv.currentValue || inv.amount || 0), 0) || 0);
    const totalInvested = investedAssets > 0 ? investedAssets : allTimeStats.investment;
    const netWorth = availableLiquidity + totalInvested;

    // Rates
    const savingsRate = realStats.income > 0 ? ((realStats.income - realStats.expense) / realStats.income) * 100 : 0;
    const burnRate = realStats.expense; // Monthly burn
    const daysOfRunway = burnRate > 0 ? Math.floor((availableLiquidity / burnRate) * 30) : 999;

    // Financial Health Score (0-100)
    const healthScore = useMemo(() => {
        let score = 0;
        if (savingsRate >= 20) score += 30;
        else if (savingsRate >= 10) score += 15;
        if (daysOfRunway >= 180) score += 30;
        else if (daysOfRunway >= 90) score += 15;
        if (totalInvested > 0) score += 20;
        if (totalIncome > totalFixedExpense * 1.3) score += 20;
        return Math.min(score, 100);
    }, [savingsRate, daysOfRunway, totalInvested, totalIncome, totalFixedExpense]);

    const healthLabel = healthScore >= 80 ? 'Excelente' : healthScore >= 60 ? 'Buena' : healthScore >= 40 ? 'Regular' : 'Mejorable';
    const healthColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#3b82f6' : healthScore >= 40 ? '#f59e0b' : '#ef4444';

    // 2. Investment Portfolio
    const portfolio = useMemo(() => {
        const invMap: Record<string, number> = {};

        // First try structured investments
        if (data.investments && data.investments.length > 0) {
            data.investments.forEach((inv: any) => {
                const cat = inv.type || inv.category || inv.name || 'General';
                invMap[cat] = (invMap[cat] || 0) + (inv.currentValue || inv.amount || 0);
            });
        }
        // Fallback: daily transactions tagged as investment
        if (Object.keys(invMap).length === 0) {
            dailyTransactions.filter(t => t.type === 'investment').forEach(t => {
                const amount = convertToDOP(t.amount, (t as any).currency);
                const cat = t.category || 'General';
                invMap[cat] = (invMap[cat] || 0) + amount;
            });
        }
        return Object.entries(invMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [data.investments, dailyTransactions, convertToDOP]);

    // 3. Statement Filter
    const filteredTransactions = useMemo(() => {
        if (startDateParam && endDateParam) {
            return dailyTransactions
                .filter(t => {
                    const tDate = t.date.split('T')[0];
                    return tDate >= startDateParam && tDate <= endDateParam;
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        const monthPrefix = new Date().toISOString().slice(0, 7);
        return dailyTransactions
            .filter(t => t.date.startsWith(monthPrefix))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [dailyTransactions, startDateParam, endDateParam]);

    // Statement subtotals
    const statementTotals = useMemo(() => {
        let income = 0; let expense = 0; let investment = 0;
        filteredTransactions.forEach(t => {
            const amt = convertToDOP(t.amount, (t as any).currency);
            if (t.type === 'income') income += amt;
            else if (t.type === 'investment') investment += amt;
            else expense += amt;
        });
        return { income, expense, investment };
    }, [filteredTransactions, convertToDOP]);

    // Auto-print
    const hasPrinted = React.useRef(false);
    useEffect(() => {
        if (isLoading || hasPrinted.current) return;
        const timer = setTimeout(() => {
            window.print();
            hasPrinted.current = true;
        }, 1400);
        return () => clearTimeout(timer);
    }, [isLoading]);

    // --- COMPONENTS ---
    const PageHeader = ({ title, subtitle, page }: { title: string, subtitle: string, page?: number }) => (
        <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white p-3 rounded-xl">
                    <Crown size={30} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900">Magnus Capital</h1>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Sistema de Gestión Financiera</p>
                </div>
            </div>
            <div className="text-right">
                <div className="text-xl font-bold text-slate-900">{title}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{subtitle}</div>
                {page && <div className="text-[10px] text-slate-400 mt-1">Pág. {page}</div>}
            </div>
        </header>
    );

    const SectionTitle = ({ icon: Icon, title, color = 'text-blue-600' }: { icon: any, title: string, color?: string }) => (
        <h3 className={`text-base font-bold uppercase border-b border-slate-200 pb-2 mb-4 text-slate-800 flex items-center gap-2 mt-8`}>
            <Icon size={18} className={color} /> {title}
        </h3>
    );

    const MetricBadge = ({ label, value, color }: { label: string, value: string, color: string }) => (
        <div className={`inline-flex flex-col items-center px-4 py-2 rounded-xl border-2`} style={{ borderColor: color, backgroundColor: color + '15' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
            <span className="text-base font-bold text-slate-900 mt-0.5">{value}</span>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold text-slate-900">Preparando Reporte...</h2>
                <p className="text-sm opacity-60">Sincronizando datos de Magnus Capital</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans print:p-0 p-8 pb-20 print:pb-0 max-w-[210mm] mx-auto text-sm leading-relaxed">
            <style>{`
                @media print {
                    @page { margin: 15mm 15mm; size: A4; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-break-before { break-before: page; }
                    .print-break-inside-avoid { break-inside: avoid; }
                    .no-print { display: none !important; }
                    .print-footer { position: relative !important; overflow: visible !important; }
                    table, td, th { overflow: visible !important; }
                }
                .bg-health-bar { background: linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #10b981 80%); }
            `}</style>

            {/* =================================================================================
                1. RESUMEN EJECUTIVO
               ================================================================================= */}
            {includeSummary && (
                <section className="print-break-inside-avoid">
                    <PageHeader
                        title="Resumen Ejecutivo"
                        subtitle={`Ciclo: ${currentCycle.label} · ${reportDate}`}
                        page={1}
                    />

                    {/* PATRIMONIO HERO */}
                    <div className="grid grid-cols-5 gap-4 mb-6">
                        <div className="col-span-3 p-6 bg-slate-900 text-white rounded-xl shadow-sm print:bg-slate-900 print:text-white">
                            <div className="text-xs opacity-60 uppercase font-bold mb-1 tracking-widest">Patrimonio Neto Total</div>
                            <div className="text-4xl font-bold mb-1">{formatCurrency(netWorth)}</div>
                            <div className="text-xs opacity-50 mb-4">{user?.username ? `Propietario: ${user.username}` : 'Magnus Capital'}</div>
                            <div className="grid grid-cols-2 gap-4 text-xs border-t border-white/10 pt-4">
                                <div>
                                    <span className="block opacity-50 mb-0.5">Liquidez Disponible</span>
                                    <span className="font-bold text-emerald-400">{formatCurrency(availableLiquidity)}</span>
                                </div>
                                <div>
                                    <span className="block opacity-50 mb-0.5">Activos Invertidos</span>
                                    <span className="font-bold text-blue-300">{formatCurrency(totalInvested)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 grid grid-rows-3 gap-3">
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-center">
                                <div className="text-[10px] text-emerald-600 uppercase font-bold mb-0.5">Tasa de Ahorro</div>
                                <div className="text-2xl font-bold text-emerald-700">{savingsRate.toFixed(1)}%</div>
                                <div className="text-[9px] text-emerald-500">Meta sugerida: ≥ 20%</div>
                            </div>
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex flex-col justify-center">
                                <div className="text-[10px] text-red-500 uppercase font-bold mb-0.5">Gasto Real (Ciclo)</div>
                                <div className="text-xl font-bold text-red-700">{formatCurrency(realStats.expense)}</div>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex flex-col justify-center">
                                <div className="text-[10px] text-blue-600 uppercase font-bold mb-0.5">Días de Reserva</div>
                                <div className="text-xl font-bold text-blue-700">{daysOfRunway >= 999 ? '∞' : `${daysOfRunway}d`}</div>
                                <div className="text-[9px] text-blue-400">Al ritmo de gasto actual</div>
                            </div>
                        </div>
                    </div>

                    {/* SALUD FINANCIERA */}
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 print-break-inside-avoid">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Índice de Salud Financiera</span>
                            <span className="text-sm font-bold" style={{ color: healthColor }}>{healthScore}/100 — {healthLabel}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all bg-health-bar" style={{ width: `${healthScore}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
                            <span>0</span><span>25 — Mejorable</span><span>50 — Regular</span><span>75 — Buena</span><span>100</span>
                        </div>
                    </div>

                    {/* FLUJO DEL CICLO + TOP MOVIMIENTOS */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <SectionTitle icon={Activity} title="Rendimiento del Ciclo" />
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="bg-emerald-50">
                                        <td className="py-2 px-3 text-slate-600 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Ingresos Reales
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatCurrency(realStats.income)}</td>
                                    </tr>
                                    <tr className="bg-red-50">
                                        <td className="py-2 px-3 text-slate-600 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Gastos Operativos
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-red-600">−{formatCurrency(realStats.expense)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-600 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>Inversiones
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-blue-600">−{formatCurrency(realStats.investment)}</td>
                                    </tr>
                                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                        <td className="py-2 px-3 text-slate-900">Flujo de Caja Neto</td>
                                        <td className={`py-2 px-3 text-right ${(realStats.income - realStats.expense - realStats.investment) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                            {formatCurrency(realStats.income - realStats.expense - realStats.investment)}
                                        </td>
                                    </tr>
                                    <tr className="border-t border-slate-200 text-xs opacity-70">
                                        <td className="py-1.5 px-3 text-slate-500">Ingresos Planificados (mes)</td>
                                        <td className="py-1.5 px-3 text-right text-slate-600">{formatCurrency(totalIncome)}</td>
                                    </tr>
                                    <tr className="text-xs opacity-70">
                                        <td className="py-1.5 px-3 text-slate-500">Gastos Fijos Planificados</td>
                                        <td className="py-1.5 px-3 text-right text-slate-600">−{formatCurrency(totalFixedExpense)}</td>
                                    </tr>
                                    <tr className="text-xs opacity-70">
                                        <td className="py-1.5 px-3 text-slate-500">Margen Teórico</td>
                                        <td className={`py-1.5 px-3 text-right font-bold ${(totalIncome - totalFixedExpense) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {formatCurrency(totalIncome - totalFixedExpense)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <SectionTitle icon={TrendingUp} title="Últimos Movimientos" />
                            <ul className="space-y-1.5">
                                {dailyTransactions.slice(0, 8).map(t => (
                                    <li key={t.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-2 truncate max-w-[140px]">
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500' : t.type === 'investment' ? 'bg-blue-500' : 'bg-red-400'}`}></span>
                                            <span className="truncate font-medium text-slate-700">{t.description || t.category}</span>
                                        </div>
                                        <span className={`font-mono font-bold flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600' : t.type === 'investment' ? 'text-blue-600' : 'text-slate-600'}`}>
                                            {t.type === 'expense' ? '−' : '+'}{formatCurrency(t.amount)}
                                        </span>
                                    </li>
                                ))}
                                {dailyTransactions.length === 0 && <li className="text-slate-400 text-xs italic p-2">Sin movimientos registrados.</li>}
                            </ul>
                        </div>
                    </div>

                    {/* KPI BADGES */}
                    <div className="mt-6 flex gap-4 flex-wrap print-break-inside-avoid">
                        <MetricBadge label="Burn Rate / Mes" value={formatCurrency(burnRate)} color="#ef4444" />
                        <MetricBadge label="Cobertura" value={daysOfRunway >= 999 ? 'Ilimitada' : `${daysOfRunway} días`} color="#3b82f6" />
                        <MetricBadge label="Ratio I/G" value={totalFixedExpense > 0 ? (totalIncome / totalFixedExpense).toFixed(2) + 'x' : 'N/A'} color="#8b5cf6" />
                        <MetricBadge label="Salud" value={`${healthScore}/100`} color={healthColor} />
                    </div>
                </section>
            )}

            {/* =================================================================================
                2. PORTAFOLIO DE INVERSIONES + PROYECCIONES
               ================================================================================= */}
            {(includeInvestments || includeForecast) && (
                <section className="print-break-before pt-8">
                    <PageHeader
                        title="Inversión y Futuro"
                        subtitle="Análisis de Crecimiento Patrimonial"
                        page={2}
                    />

                    {includeInvestments && (
                        <div className="mb-10 print-break-inside-avoid">
                            <SectionTitle icon={TrendingUp} title="Portafolio de Inversiones" />
                            <div className="grid grid-cols-2 gap-6 mb-4">
                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Distribución de Activos</h4>
                                    <div className="space-y-3">
                                        {portfolio.map((item, idx) => {
                                            const pct = totalInvested > 0 ? (item.value / totalInvested) * 100 : 0;
                                            const barColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
                                            return (
                                                <div key={item.name}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-bold text-slate-700">{item.name}</span>
                                                        <span className="text-slate-500 font-mono">{formatCurrency(item.value)} <span className="text-slate-400">({pct.toFixed(1)}%)</span></span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColors[idx % barColors.length] }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {portfolio.length === 0 && <p className="text-sm text-slate-400 italic">No hay inversiones registradas.</p>}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-xs font-bold">
                                        <span className="text-slate-600">Total Invertido</span>
                                        <span className="text-blue-600 font-mono">{formatCurrency(totalInvested)}</span>
                                    </div>
                                </div>
                                <div className="p-5 border border-slate-100 rounded-xl bg-white">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Análisis del Portafolio</h4>
                                    <div className="space-y-3 text-xs">
                                        <div className="flex justify-between py-2 border-b border-slate-100">
                                            <span className="text-slate-500">Capital Invertido</span>
                                            <span className="font-bold text-blue-600">{formatCurrency(totalInvested)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-100">
                                            <span className="text-slate-500">% del Patrimonio</span>
                                            <span className="font-bold">{netWorth > 0 ? ((totalInvested / netWorth) * 100).toFixed(1) : '0'}%</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-100">
                                            <span className="text-slate-500">Posiciones</span>
                                            <span className="font-bold">{portfolio.length}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-100">
                                            <span className="text-slate-500">Ret. Est. Anual (8%)</span>
                                            <span className="font-bold text-emerald-600">+{formatCurrency(totalInvested * 0.08)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="text-[10px] text-emerald-700 leading-relaxed">
                                            💡 Tasa de ahorro actual del {savingsRate.toFixed(1)}%. Mantener inversión constante acelera el efecto de interés compuesto. Diversificar entre renta fija y variable reduce la volatilidad.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {includeForecast && (
                        <div className="print-break-inside-avoid">
                            <SectionTitle icon={BarChart2} title="Proyección Financiera (Estimado)" color="text-purple-600" />
                            <p className="text-xs text-slate-500 mb-3">Proyección basada en el ritmo de ahorro e inversión del ciclo actual. Retorno de inversión estimado al 8% anual.</p>
                            <table className="w-full text-xs text-center border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="p-3 rounded-tl-lg text-left">Horizonte</th>
                                        <th className="p-3">Ahorro Acum.</th>
                                        <th className="p-3">Retorno Inv. (8%)</th>
                                        <th className="p-3">Liquidez Est.</th>
                                        <th className="p-3 rounded-tr-lg">Patrimonio Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {[1, 3, 6, 12, 24].map(month => {
                                        const futureDate = new Date();
                                        futureDate.setMonth(futureDate.getMonth() + month);
                                        const monthlySaving = realStats.income - realStats.expense;
                                        const projectedSavings = monthlySaving * month;
                                        const estimatedReturn = (totalInvested * 0.08 / 12) * month;
                                        const projectedLiquidity = availableLiquidity + projectedSavings;
                                        const projectedWealth = netWorth + projectedSavings + estimatedReturn;
                                        return (
                                            <tr key={month} className="even:bg-slate-50">
                                                <td className="p-2.5 text-left font-bold text-slate-700">
                                                    +{month} {month === 1 ? 'Mes' : 'Meses'} &nbsp;
                                                    <span className="text-slate-400 font-normal">({futureDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })})</span>
                                                </td>
                                                <td className="p-2.5 text-emerald-600 font-mono">{projectedSavings >= 0 ? '+' : ''}{formatCurrency(projectedSavings)}</td>
                                                <td className="p-2.5 text-blue-600 font-mono">+{formatCurrency(estimatedReturn)}</td>
                                                <td className="p-2.5 text-slate-700 font-mono">{formatCurrency(projectedLiquidity)}</td>
                                                <td className="p-2.5 font-bold text-slate-900 font-mono">{formatCurrency(projectedWealth)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <p className="text-[9px] text-slate-400 mt-2 italic">* Las proyecciones son estimados y no garantizan resultados futuros. Basadas en comportamiento del ciclo actual.</p>
                        </div>
                    )}
                </section>
            )}

            {/* =================================================================================
                3. PRESUPUESTO & ESTRUCTURA DE COSTOS
               ================================================================================= */}
            {includeBudget && (
                <section className="print-break-before pt-8">
                    <PageHeader
                        title="Estructura de Presupuesto"
                        subtitle="Ingresos, Costos Fijos y Análisis de Margen"
                        page={includeInvestments || includeForecast ? 3 : 2}
                    />

                    {/* INCOME SOURCES */}
                    <div className="mb-8 print-break-inside-avoid">
                        <SectionTitle icon={DollarSign} title="Fuentes de Ingreso" color="text-emerald-600" />
                        {data.incomes.some((inc: any) => inc.validFrom || inc.validTo) && (
                            <p className="text-[10px] text-slate-400 italic mb-2">
                                * Los montos reflejan períodos de vigencia (validFrom/validTo) cuando aplica, ej. un mismo ingreso que cambió de valor durante el año no se cuenta dos veces.
                            </p>
                        )}
                        <table className="w-full text-sm mb-2">
                            <thead className="bg-emerald-50 text-emerald-700 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-3 py-2 text-left">Fuente</th>
                                    <th className="px-3 py-2 text-center">Frecuencia</th>
                                    <th className="px-3 py-2 text-right">Monto Mensual</th>
                                    <th className="px-3 py-2 text-right">Impacto Anual</th>
                                    <th className="px-3 py-2 text-right">% del Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.incomes.map(inc => {
                                    const monthly = calculateMonthlyAmount(inc);
                                    const annual = calculateAnnualAmountV2(inc, currencies);
                                    const pct = totalIncome > 0 ? (monthly / totalIncome) * 100 : 0;
                                    return (
                                        <tr key={inc.id} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 font-medium text-slate-700">{inc.name}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{inc.frequency}</span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-emerald-700 font-mono">{formatCurrency(monthly)}</td>
                                            <td className="px-3 py-2 text-right text-slate-500 font-mono text-xs">{formatCurrency(annual)}</td>
                                            <td className="px-3 py-2 text-right text-slate-500">{pct.toFixed(1)}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-emerald-100 font-bold border-t-2 border-emerald-300 text-sm">
                                <tr>
                                    <td className="px-3 py-2 text-emerald-800" colSpan={2}>Total Ingresos Mensuales</td>
                                    <td className="px-3 py-2 text-right text-emerald-800 font-mono">{formatCurrency(totalIncome)}</td>
                                    <td className="px-3 py-2 text-right text-emerald-700 font-mono text-xs">{formatCurrency(totalIncome * 12)}</td>
                                    <td className="px-3 py-2 text-right text-emerald-600">100%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* FIXED COSTS */}
                    <div className="mb-8 print-break-inside-avoid">
                        <SectionTitle icon={Shield} title="Estructura de Costos Fijos" color="text-red-500" />
                        <table className="w-full text-sm">
                            <thead className="bg-red-50 text-red-700 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-3 py-2 text-left">Concepto</th>
                                    <th className="px-3 py-2 text-center">Frecuencia</th>
                                    <th className="px-3 py-2 text-right">Monto Mensual</th>
                                    <th className="px-3 py-2 text-right">Impacto Anual</th>
                                    <th className="px-3 py-2 text-right">% del Ingreso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.expenses.map(exp => {
                                    const amount = calculateMonthlyAmount(exp);
                                    const annual = calculateAnnualAmountV2(exp, currencies);
                                    const percent = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                                    const isCritical = percent > 20;
                                    return (
                                        <tr key={exp.id} className={isCritical ? 'bg-red-50/50' : ''}>
                                            <td className="px-3 py-2 text-slate-700 font-medium flex items-center gap-1.5">
                                                {isCritical && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                                                {exp.name}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{exp.frequency}</span>
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(amount)}</td>
                                            <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">{formatCurrency(annual)}</td>
                                            <td className={`px-3 py-2 text-right font-bold ${isCritical ? 'text-red-500' : 'text-slate-500'}`}>{percent.toFixed(1)}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="font-bold border-t-2 border-slate-300 text-sm">
                                <tr className="bg-slate-100">
                                    <td className="px-3 py-2" colSpan={2}>Total Costo Fijo Mensual</td>
                                    <td className="px-3 py-2 text-right font-mono text-red-600">{formatCurrency(totalFixedExpense)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">{formatCurrency(totalFixedExpense * 12)}</td>
                                    <td className="px-3 py-2 text-right text-red-500">{(totalFixedExpense / totalIncome * 100).toFixed(1)}%</td>
                                </tr>
                                <tr className="bg-emerald-50">
                                    <td className="px-3 py-2 text-emerald-800" colSpan={2}>Margen Disponible (Ing − Gastos Fijos)</td>
                                    <td className="px-3 py-2 text-right font-mono text-emerald-700">{formatCurrency(totalIncome - totalFixedExpense)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs text-emerald-600">{formatCurrency((totalIncome - totalFixedExpense) * 12)}</td>
                                    <td className="px-3 py-2 text-right text-emerald-600">{((totalIncome - totalFixedExpense) / totalIncome * 100).toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>
            )}

            {/* =================================================================================
                4. ESTADO DE CUENTA DETALLADO
               ================================================================================= */}
            {includeDaily && (
                <section className={`${includeBudget ? 'print-break-before' : ''} pt-8`}>
                    <PageHeader
                        title="Estado de Cuenta Detallado"
                        subtitle={startDateParam && endDateParam ? `${startDateParam} al ${endDateParam}` : `Periodo: ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`}
                    />

                    {/* Statement Summary Bar */}
                    <div className="grid grid-cols-4 gap-3 mb-6 print-break-inside-avoid">
                        <div className="p-3 bg-slate-900 text-white rounded-xl text-center">
                            <div className="text-[10px] opacity-60 uppercase mb-1">Transacciones</div>
                            <div className="text-xl font-bold">{filteredTransactions.length}</div>
                        </div>
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                            <div className="text-[10px] text-emerald-600 uppercase mb-1">Entradas</div>
                            <div className="text-lg font-bold text-emerald-700 font-mono">{formatCurrency(statementTotals.income)}</div>
                        </div>
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                            <div className="text-[10px] text-red-500 uppercase mb-1">Salidas</div>
                            <div className="text-lg font-bold text-red-600 font-mono">{formatCurrency(statementTotals.expense)}</div>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                            <div className="text-[10px] text-blue-600 uppercase mb-1">Invertido</div>
                            <div className="text-lg font-bold text-blue-600 font-mono">{formatCurrency(statementTotals.investment)}</div>
                        </div>
                    </div>

                    <SectionTitle icon={Calendar} title="Registro de Transacciones" />
                    <table className="w-full text-xs">
                        <thead className="bg-slate-900 text-white font-bold uppercase">
                            <tr>
                                <th className="px-3 py-2 text-left rounded-l text-[10px]">Fecha</th>
                                <th className="px-3 py-2 text-left text-[10px]">Descripción</th>
                                <th className="px-3 py-2 text-center text-[10px]">Categoría</th>
                                <th className="px-3 py-2 text-center text-[10px]">Tipo</th>
                                <th className="px-3 py-2 text-right rounded-r text-[10px]">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className="even:bg-slate-50/50">
                                    <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">
                                        {new Date(t.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-slate-700 max-w-none break-words">{t.description || '—'}</td>
                                    <td className="px-3 py-2 text-center text-slate-500">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-600">
                                            {t.category || '—'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            t.type === 'income' ? 'bg-emerald-100 text-emerald-700' :
                                            t.type === 'investment' ? 'bg-blue-100 text-blue-700' :
                                            'bg-red-100 text-red-600'
                                        }`}>
                                            {t.type === 'income' ? 'Ingreso' : t.type === 'investment' ? 'Inversión' : 'Gasto'}
                                        </span>
                                    </td>
                                    <td className={`px-3 py-2 text-right font-mono font-bold whitespace-nowrap ${
                                        t.type === 'income' ? 'text-emerald-600' :
                                        t.type === 'investment' ? 'text-blue-600' : 'text-slate-800'
                                    }`}>
                                        {t.type === 'expense' && '− '}{t.type === 'income' && '+ '}{t.type === 'investment' && '↗ '}
                                        {formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">Sin movimientos en este periodo</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                            <tr>
                                <td className="px-3 py-2 text-slate-700" colSpan={3}>Subtotales del Periodo</td>
                                <td className="px-3 py-2 text-right text-slate-600 font-mono text-xs">
                                    <div className="text-emerald-600">+{formatCurrency(statementTotals.income)}</div>
                                    <div className="text-red-500">−{formatCurrency(statementTotals.expense)}</div>
                                    <div className="text-blue-500">↗ {formatCurrency(statementTotals.investment)}</div>
                                </td>
                                <td className="px-3 py-2 text-right font-mono">
                                    <div className={`text-sm font-bold ${(statementTotals.income - statementTotals.expense - statementTotals.investment) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {formatCurrency(statementTotals.income - statementTotals.expense - statementTotals.investment)}
                                    </div>
                                    <div className="text-[9px] text-slate-400">Neto del Periodo</div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </section>
            )}

            {/* FOOTER */}
            <footer className="print-footer relative mt-8 text-center pb-6 pt-3 bg-white border-t border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Magnus System v3.0 &bull; Generado el {reportDate} &bull; Documento Confidencial &bull; Uso Interno
                </p>
            </footer>
        </div>
    );
};
