import React, { useState } from 'react';
import { CentroComandoHeader } from '../components/CentroComando/CentroComandoHeader';
import { KPIRowAnual, KPIRowMensual } from '../components/CentroComando/KPICards';
import { PatrimonioBarChart } from '../components/CentroComando/PatrimonioBarChart';
import { MarketPulseBar } from '../components/CentroComando/MarketPulseBar';
import { useCentroComandoData, CentroComandoMode } from '../hooks/useCentroComandoData';
import { DashboardSkeleton } from '../../../shared/components/Skeleton';
import { formatCurrency } from '../utils/calculations';
import { PrintOptionsModal, PrintOptions } from '../components/PrintOptionsModal';
import { PieChart as PieChartIcon, PiggyBank, ArrowDownRight, Wallet, Target } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  CartesianGrid,
  PieChart,
  Pie
} from 'recharts';

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const formatMonthShort = (label: string) => {
  const clean = label.trim().toLowerCase();
  const map: Record<string, string> = {
    enero: 'Ene', febrero: 'Feb', marzo: 'Mar', abril: 'Abr', mayo: 'May', junio: 'Jun',
    julio: 'Jul', agosto: 'Ago', septiembre: 'Sep', octubre: 'Oct', noviembre: 'Nov', diciembre: 'Dic'
  };
  return map[clean] || (label.charAt(0).toUpperCase() + label.slice(1, 3));
};

export const CentroComando: React.FC = () => {
    const [mode, setMode] = useState<CentroComandoMode>('anual');
    const [cicloActivo, setCicloActivo] = useState<string>('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const { ciclosDisponibles, anualData, mensualData, isLoading } = useCentroComandoData(mode, cicloActivo);

    // Default to the latest cycle if not set
    React.useEffect(() => {
        if (ciclosDisponibles && ciclosDisponibles.length > 0 && !cicloActivo) {
            setCicloActivo(ciclosDisponibles[0].id); // The first one is the most recent
        }
    }, [ciclosDisponibles, cicloActivo]);

    const handlePrint = (options: PrintOptions) => {
        setIsPrintModalOpen(false);
        const params = new URLSearchParams();
        if (options.includeSummary) params.append('summary', 'true');
        if (options.includeBudget) params.append('budget', 'true');
        if (options.includeInvestments) params.append('investments', 'true');
        if (options.includeForecast) params.append('forecast', 'true');
        if (options.includeAccountStatement) {
            params.append('daily', 'true');
            if (options.startDate) params.append('start', options.startDate);
            if (options.endDate) params.append('end', options.endDate);
        }
        window.open(`/finanza/print?${params.toString()}`, '_blank');
    };

    if (isLoading || (mode === 'anual' && !anualData) || (mode === 'mensual' && !mensualData)) {
        return <DashboardSkeleton />;
    }

    // Calcular total de inversiones para porcentajes en anual
    const totalInversionAnual = anualData?.inversionPorCategoria?.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) || 0;

    // Formatear datos de la tasa de ahorro para el gráfico de barras interactivo
    const ahorroChartData = anualData?.tasaAhorroPorCiclo?.map((item) => ({
        mes: formatMonthShort(item.label),
        nombreCompleto: item.label,
        tasa: parseFloat((item.tasaAhorro * 100).toFixed(1))
    })) || [];

    // Formatear datos de categoría para el mini Donut
    const pieData = anualData?.inversionPorCategoria?.map((item) => ({
        name: item.name,
        value: item.value
    })) || [];

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 bg-slate-50 dark:bg-neutral-950 min-h-screen">
            {/* Cabecera Ejecutiva & Opciones de Informe */}
            <CentroComandoHeader
                mode={mode}
                onModeChange={setMode}
                cicloActivo={cicloActivo}
                onCicloChange={setCicloActivo}
                ciclosDisponibles={ciclosDisponibles || []}
                onPrint={() => setIsPrintModalOpen(true)}
            />

            {/* Modal de Impresión / Exportación */}
            <PrintOptionsModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onPrint={handlePrint}
            />

            {/* ========================================================================= */}
            {/* VISTA ANUAL // ESTADO GLOBAL DEL IMPERIO                                  */}
            {/* ========================================================================= */}
            {mode === 'anual' && anualData ? (
                <>
                    {/* Fila 1: KPIs Ejecutivos Principales */}
                    <KPIRowAnual data={anualData} />

                    {/* Fila 2: Evolución de Flujo y Ahorro en el Año */}
                    <PatrimonioBarChart ciclos={anualData.ciclosPorMes} />
                    
                    {/* Fila 3: SÍNTESIS EJECUTIVA DE MERCADO & MACRO RD (TICKER HORIZONTAL) */}
                    <div className="mt-8">
                        <MarketPulseBar />
                    </div>

                    {/* Fila 4: SECCIÓN ACOPLADA Y EQUILIBRADA (INVERSIÓN + EVOLUCIÓN TASA DE AHORRO) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-stretch">
                        
                        {/* WIDGET 1: Inversión por Categoría (Mini Donut + Desglose) */}
                        <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80 dark:border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                        <PieChartIcon size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-900 dark:text-white font-serif font-bold text-base">Inversión por Categoría</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Composición del portafolio patrimonial</p>
                                    </div>
                                </div>
                                {totalInversionAnual > 0 && (
                                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                                        Total: {formatCurrency(totalInversionAnual)}
                                    </span>
                                )}
                            </div>

                            {totalInversionAnual > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-auto">
                                    {/* Mini Donut Chart */}
                                    <div className="sm:col-span-5 h-44 w-full relative flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={65}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {pieData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(val: number) => [formatCurrency(val), 'Monto']}
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(10, 15, 29, 0.95)',
                                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '0.75rem',
                                                        color: '#fff',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[10px] uppercase font-mono text-slate-400">Activos</span>
                                            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                                                {pieData.length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Lista Compacta de Categorías */}
                                    <div className="sm:col-span-7 space-y-2.5">
                                        {anualData.inversionPorCategoria.map((inv: any, idx: number) => {
                                            const percent = totalInversionAnual > 0 ? ((inv.value / totalInversionAnual) * 100).toFixed(1) : '0.0';
                                            const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between items-center bg-slate-50 dark:bg-neutral-950/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 hover:border-blue-500/30 transition-all"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{inv.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 font-mono">
                                                        <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                                            {percent}%
                                                        </span>
                                                        <span className="text-slate-900 dark:text-white font-bold text-xs">
                                                            {formatCurrency(inv.value)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm font-mono py-8 text-center my-auto">No hay inversiones registradas este año.</p>
                            )}
                        </div>

                        {/* WIDGET 2: Evolución: Tasa de Ahorro (Gráfico Interactivo con Meta) */}
                        <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/80 dark:border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <PiggyBank size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-900 dark:text-white font-serif font-bold text-base">Evolución: Tasa de Ahorro</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Trayectoria mensual vs meta anual</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-white/5">
                                        Promedio: {(anualData.tasaAhorroPromedio * 100).toFixed(1)}%
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                        <Target size={11} /> Meta 20%
                                    </span>
                                </div>
                            </div>

                            {/* Gráfico de Barras Mensuales */}
                            <div className="h-44 w-full my-auto">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ahorroChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.07} vertical={false} />
                                        <XAxis
                                            dataKey="mes"
                                            stroke="#64748b"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `${val}%`}
                                            domain={[-40, 60]}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [`${value}%`, 'Tasa de Ahorro']}
                                            labelFormatter={(label: string) => {
                                                const found = ahorroChartData.find(d => d.mes === label);
                                                return found?.nombreCompleto || label;
                                            }}
                                            contentStyle={{
                                                backgroundColor: 'rgba(10, 15, 29, 0.95)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                                borderRadius: '0.75rem',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                        <ReferenceLine y={20} stroke="#10b981" strokeDasharray="3 3" opacity={0.6} />
                                        <Bar dataKey="tasa" radius={[4, 4, 0, 0]}>
                                            {ahorroChartData.map((entry, index) => (
                                                <Cell
                                                    key={`bar-${index}`}
                                                    fill={entry.tasa >= 20 ? '#10b981' : entry.tasa >= 0 ? '#06b6d4' : '#f43f5e'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Pie de gráfica con leyenda explicativa */}
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-200/60 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> &ge; 20% Meta</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> 0 - 20%</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Déficit</span>
                                </div>
                                <span className="text-slate-500">10 Ciclos YTD</span>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}

            {/* ========================================================================= */}
            {/* VISTA MENSUAL // DETALLE DEL CICLO FINANCIERO                              */}
            {/* ========================================================================= */}
            {mode === 'mensual' && mensualData ? (
                <>
                    <KPIRowMensual data={mensualData} />
                    
                    {/* SÍNTESIS EJECUTIVA DE MERCADO & MACRO RD */}
                    <div className="mt-8">
                        <MarketPulseBar />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        {/* Flujo del Ciclo */}
                        <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl transition-all">
                            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-200/80 dark:border-white/5">
                                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                                    <Wallet size={18} />
                                </div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-serif font-bold text-base">Flujo del Ciclo</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Balance y ejecución del mes seleccionado</p>
                                </div>
                            </div>

                            <div className="space-y-3 font-mono">
                                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200/70 dark:border-white/5">
                                    <span className="text-slate-500 dark:text-slate-400 text-sm">Entradas de Capital</span>
                                    <span className="text-emerald-500 dark:text-emerald-400 font-bold">{formatCurrency(mensualData.entradas)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200/70 dark:border-white/5">
                                    <span className="text-slate-500 dark:text-slate-400 text-sm">Gastos Operativos</span>
                                    <span className="text-rose-500 dark:text-rose-400 font-bold">{formatCurrency(mensualData.gastos)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200/70 dark:border-white/5">
                                    <span className="text-slate-500 dark:text-slate-400 text-sm">Capital Invertido</span>
                                    <span className="text-indigo-400 font-bold">{formatCurrency(mensualData.invertido)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-bold text-sm">
                                    <span className="text-slate-900 dark:text-white">Ahorro Neto Acumulado</span>
                                    <span className="text-emerald-400 text-base">{formatCurrency(mensualData.ahorroNeto)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Top 6 Gastos */}
                        <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl transition-all">
                            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-200/80 dark:border-white/5">
                                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                    <ArrowDownRight size={18} />
                                </div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-serif font-bold text-base">Top 6 Gastos (Categorías)</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Focos principales de consumo en el ciclo</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {mensualData.gastosPorCategoria.map((cat: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-neutral-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-white/5 hover:border-rose-500/20 transition-all">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat.category}</span>
                                        <span className="text-rose-500 dark:text-rose-400 font-mono font-bold text-sm">{formatCurrency(cat.total)}</span>
                                    </div>
                                ))}
                                {mensualData.gastosPorCategoria.length === 0 && (
                                    <p className="text-slate-500 text-sm font-mono py-4 text-center">No hubo gastos en este ciclo.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
};
export default CentroComando;
