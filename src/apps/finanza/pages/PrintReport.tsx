import React, { useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { Crown, Shield, CheckCircle, PieChart, TrendingUp, Activity, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { calculateAnnualAmount, formatCurrency } from '../utils/calculations';
import { Transaction } from '../../../shared/types';
import { getFinancialCycle, isDateInCycle } from '../utils/financialCycle';

export const PrintReport: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { data, dailyTransactions, currencies } = useData();
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
        return calculateAnnualAmount(t, currencies) / 12;
    };

    // --- DATA CALCULATIONS ---
    const currentCycle = getFinancialCycle(new Date());

    // 1. Budget & Cash Flow
    const totalIncome = data.incomes.reduce((acc, curr) => acc + calculateMonthlyAmount(curr), 0);
    const totalFixedExpense = data.expenses.reduce((acc, curr) => acc + calculateMonthlyAmount(curr), 0);

    // Real stats calculation (similar to Dashboard)
    const realStats = useMemo(() => {
        let income = 0;
        let expense = 0;
        let investment = 0;

        dailyTransactions.forEach(t => {
            const amountInDOP = convertToDOP(t.amount);
            if (isDateInCycle(t.date, currentCycle)) {
                if (t.type === 'income') income += amountInDOP;
                else if (t.type === 'investment') investment += amountInDOP;
                else expense += amountInDOP;
            }
        });
        return { income, expense, investment };
    }, [dailyTransactions, currentCycle, convertToDOP]);

    // Wealth Calc
    // Mocking "Available Balance" for now as 250k + (Income - Expense - Inv)
    // In a real app this comes from accounts
    const availableLiquidity = 250000 + (realStats.income - realStats.expense - realStats.investment);
    const totalInvested = realStats.investment + 11500; // Adding a base simulated invested amount
    const netWorth = availableLiquidity + totalInvested;

    // Rates
    const savingsRate = realStats.income > 0 ? ((realStats.income - realStats.expense) / realStats.income) * 100 : 0;

    // 2. Investment Portfolio
    const portfolio = useMemo(() => {
        const items: Transaction[] = []; // In real app, separate investments list
        // Using daily transactions for now
        const invMap: Record<string, number> = {};
        dailyTransactions.filter(t => t.type === 'investment').forEach(t => {
            const amount = convertToDOP(t.amount);
            const cat = t.category || 'General';
            invMap[cat] = (invMap[cat] || 0) + amount;
        });
        return Object.entries(invMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [dailyTransactions, convertToDOP]);

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
        return dailyTransactions.filter(t => t.date.startsWith(monthPrefix));
    }, [dailyTransactions, startDateParam, endDateParam]);

    // Auto-print
    const hasPrinted = React.useRef(false);
    useEffect(() => {
        if (hasPrinted.current) return;
        const timer = setTimeout(() => {
            window.print();
            hasPrinted.current = true;
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    // --- COMPONENTS ---
    const PageHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
        <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white p-3 rounded-xl">
                    <Crown size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900">Magnus Capital</h1>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Reporte Financiero Oficial</p>
                </div>
            </div>
            <div className="text-right">
                <div className="text-xl font-bold text-slate-900">{title}</div>
                <div className="text-sm text-slate-500 uppercase tracking-wider">{subtitle}</div>
            </div>
        </header>
    );

    const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <h3 className="text-base font-bold uppercase border-b border-slate-200 pb-2 mb-4 text-slate-800 flex items-center gap-2 mt-8">
            <Icon size={18} className="text-blue-600" /> {title}
        </h3>
    );

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans print:p-0 p-8 max-w-[210mm] mx-auto text-sm leading-relaxed">
            <style>{`
                @media print {
                    @page { margin: 10mm; size: A4; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-break-before { break-before: page; }
                    .print-break-inside-avoid { break-inside: avoid; }
                }
            `}</style>

            {/* =================================================================================
                1. RESUMEN EJECUTIVO (Una Página)
               ================================================================================= */}
            {includeSummary && (
                <section className="print-break-inside-avoid relative h-full">
                    <PageHeader
                        title="Resumen Ejecutivo"
                        subtitle={`${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`}
                    />

                    {/* BIG NUMBERS */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="p-6 bg-slate-900 text-white rounded-xl shadow-sm print:bg-slate-900 print:text-white">
                            <div className="text-xs opacity-70 uppercase font-bold mb-2">Patrimonio Neto Total</div>
                            <div className="text-4xl font-bold mb-2 text-gold-400">{formatCurrency(netWorth)}</div>
                            <div className="flex gap-4 text-xs opacity-80 mt-4 pt-4 border-t border-white/10">
                                <div>
                                    <span className="block opacity-50">Liquidez</span>
                                    <span className="font-bold">{formatCurrency(availableLiquidity)}</span>
                                </div>
                                <div>
                                    <span className="block opacity-50">Inversiones</span>
                                    <span className="font-bold text-blue-300">{formatCurrency(totalInvested)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Tasa de Ahorro</div>
                                <div className="text-3xl font-bold text-green-600">{savingsRate.toFixed(1)}%</div>
                                <div className="text-[10px] text-slate-400 mt-1">Objetivo: 40%</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Gasto Real</div>
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(realStats.expense)}</div>
                            </div>
                            <div className="col-span-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-blue-600 uppercase font-bold">Salud Financiera</span>
                                    <span className="text-xs font-bold text-blue-700">Excelente</span>
                                </div>
                                <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-600 h-full w-[85%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <SectionTitle icon={Activity} title="Rendimiento del Ciclo" />
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="bg-slate-50">
                                        <td className="py-2 px-3 text-slate-600">Ingresos Totales</td>
                                        <td className="py-2 px-3 text-right font-bold">{formatCurrency(realStats.income)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-600">Gastos Operativos</td>
                                        <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(realStats.expense)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-600">Inversiones Realizadas</td>
                                        <td className="py-2 px-3 text-right text-blue-600">-{formatCurrency(realStats.investment)}</td>
                                    </tr>
                                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-200">
                                        <td className="py-2 px-3 text-slate-900">Flujo de Caja Neto</td>
                                        <td className="py-2 px-3 text-right text-slate-900">
                                            {formatCurrency(realStats.income - realStats.expense - realStats.investment)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <SectionTitle icon={TrendingUp} title="Top Movimientos" />
                            <ul className="space-y-2">
                                {dailyTransactions.slice(0, 5).map(t => (
                                    <li key={t.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-50">
                                        <span className="truncate max-w-[120px] font-medium text-slate-700">{t.category}</span>
                                        <span className={`font-mono ${t.type === 'income' ? 'text-green-600' : 'text-slate-600'}`}>
                                            {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            )}

            {/* =================================================================================
                2. INVERSIONES & PROYECCIONES (Segunda Página)
               ================================================================================= */}
            {(includeInvestments || includeForecast) && (
                <section className="print-break-before pt-8">
                    <PageHeader
                        title="Inversión y Futuro"
                        subtitle="Análisis de Crecimiento Patrimonial"
                    />

                    {includeInvestments && (
                        <div className="mb-12 print-break-inside-avoid">
                            <SectionTitle icon={TrendingUp} title="Portafolio de Inversiones" />
                            <div className="grid grid-cols-2 gap-8 mb-6">
                                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                                    <h4 className="text-sm font-bold text-slate-900 mb-4">Distribución de Activos</h4>
                                    <div className="space-y-4">
                                        {portfolio.map(item => (
                                            <div key={item.name}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-bold text-slate-700">{item.name}</span>
                                                    <span className="text-slate-500">{formatCurrency(item.value)}</span>
                                                </div>
                                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-600" style={{ width: `${(item.value / totalInvested) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                        {portfolio.length === 0 && <p className="text-sm text-slate-400 italic">No hay inversiones registradas este periodo.</p>}
                                    </div>
                                </div>
                                <div className="p-6 border border-slate-100 rounded-xl">
                                    <h4 className="text-sm font-bold text-slate-900 mb-4">Notas del Analista</h4>
                                    <p className="text-sm text-slate-500 mb-4">
                                        La separación entre gastos e inversiones ha revelado una capacidad de ahorro real del {savingsRate.toFixed(1)}%. Se recomienda mantener el ritmo de inversión en activos productivos para acelerar el efecto de interés compuesto.
                                    </p>
                                    <div className="p-3 bg-green-50 text-green-800 text-xs rounded-lg font-medium">
                                        💡 Tip: Diversificar más en instrumentos de renta variable.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {includeForecast && (
                        <div className="print-break-inside-avoid">
                            <SectionTitle icon={PieChart} title="Proyección 2026 (Estimado)" />
                            <table className="w-full text-xs text-center border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="p-3 rounded-tl-lg text-left">Periodo</th>
                                        <th className="p-3">Ahorro Mensual</th>
                                        <th className="p-3">Retorno Inv. (Est. 8%)</th>
                                        <th className="p-3 rounded-tr-lg">Patrimonio Proyectado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {[1, 3, 6, 12].map(month => {
                                        const futureDate = new Date();
                                        futureDate.setMonth(futureDate.getMonth() + month);
                                        const projectedSavings = (realStats.income - realStats.expense) * month;
                                        const estimatedReturn = (totalInvested * 0.08 / 12) * month;

                                        return (
                                            <tr key={month} className="even:bg-slate-50">
                                                <td className="p-3 text-left font-bold text-slate-700">
                                                    +{month} Meses ({futureDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })})
                                                </td>
                                                <td className="p-3 text-green-600">+{formatCurrency(projectedSavings)}</td>
                                                <td className="p-3 text-blue-600">+{formatCurrency(estimatedReturn)}</td>
                                                <td className="p-3 font-bold text-slate-900">{formatCurrency(netWorth + projectedSavings + estimatedReturn)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* =================================================================================
                3. PRESUPUESTO & ESTADO DE CUENTA (Tercera Página en adelante)
               ================================================================================= */}
            {(includeBudget || includeDaily) && (
                <section className="print-break-before pt-8">
                    <PageHeader
                        title="Detalle Operativo"
                        subtitle={startDateParam && endDateParam ? `${startDateParam} - ${endDateParam}` : "Periodo Actual"}
                    />

                    {includeBudget && (
                        <div className="mb-8 print-break-inside-avoid">
                            <SectionTitle icon={Shield} title="Estructura de Costos Fijos" />
                            <table className="w-full text-sm mb-8">
                                <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Concepto</th>
                                        <th className="px-3 py-2 text-right">Monto Mensual</th>
                                        <th className="px-3 py-2 text-right">% del Ingreso</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.expenses.map(exp => {
                                        const amount = calculateMonthlyAmount(exp);
                                        const percent = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                                        return (
                                            <tr key={exp.id}>
                                                <td className="px-3 py-2 text-slate-700 font-medium">{exp.name}</td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(amount)}</td>
                                                <td className="px-3 py-2 text-right text-slate-500">{percent.toFixed(1)}%</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-slate-50 font-bold border-t border-slate-300">
                                        <td className="px-3 py-2">Total Fijo</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(totalFixedExpense)}</td>
                                        <td className="px-3 py-2 text-right text-slate-500">{(totalFixedExpense / totalIncome * 100).toFixed(1)}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {includeDaily && (
                        <div className="print-break-inside-avoid">
                            <SectionTitle icon={Calendar} title="Registro de Transacciones" />
                            <table className="w-full text-xs">
                                <thead className="bg-slate-900 text-white font-bold uppercase">
                                    <tr>
                                        <th className="px-3 py-2 text-left rounded-l text-[10px]">Fecha</th>
                                        <th className="px-3 py-2 text-left text-[10px]">Concepto</th>
                                        <th className="px-3 py-2 text-left text-[10px]">Categoria</th>
                                        <th className="px-3 py-2 text-right rounded-r text-[10px]">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTransactions.map((t) => (
                                        <tr key={t.id} className="even:bg-slate-50/50">
                                            <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">
                                                {new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-slate-700 truncate max-w-[200px]">{t.description}</td>
                                            <td className="px-3 py-2 text-slate-500">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${t.type === 'investment' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100'}`}>
                                                    {t.category || t.type}
                                                </span>
                                            </td>
                                            <td className={`px-3 py-2 text-right font-mono font-bold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' :
                                                    t.type === 'investment' ? 'text-blue-600' : 'text-slate-900'
                                                }`}>
                                                {t.type === 'expense' && '- '}{formatCurrency(t.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-slate-400 italic">Sin movimientos en este periodo</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* FOOTER */}
            <div className="fixed bottom-0 left-0 right-0 text-center pb-8 pt-4 bg-white print:fixed print:bottom-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Generado por Magnus System v3.0 &bull; Documento Confidencial
                </p>
            </div>
        </div>
    );
};


