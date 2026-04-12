import React, { useState } from 'react';
import { CentroComandoHeader } from '../components/CentroComando/CentroComandoHeader';
import { KPIRowAnual, KPIRowMensual } from '../components/CentroComando/KPICards';
import { PatrimonioBarChart } from '../components/CentroComando/PatrimonioBarChart';
import { useCentroComandoData, CentroComandoMode } from '../hooks/useCentroComandoData';
import { DashboardSkeleton } from '../../../shared/components/Skeleton';
import { formatCurrency } from '../utils/calculations';

export const CentroComando: React.FC = () => {
    const [mode, setMode] = useState<CentroComandoMode>('anual');
    const [cicloActivo, setCicloActivo] = useState<string>('');

    const { ciclosDisponibles, anualData, mensualData, isLoading } = useCentroComandoData(mode, cicloActivo);

    // Default to the latest cycle if not set
    React.useEffect(() => {
        if (ciclosDisponibles && ciclosDisponibles.length > 0 && !cicloActivo) {
            setCicloActivo(ciclosDisponibles[0].id); // The first one is the most recent
        }
    }, [ciclosDisponibles, cicloActivo]);

    if (isLoading || (mode === 'anual' && !anualData) || (mode === 'mensual' && !mensualData)) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 bg-neutral-950 min-h-screen">
            <CentroComandoHeader
                mode={mode}
                onModeChange={setMode}
                cicloActivo={cicloActivo}
                onCicloChange={setCicloActivo}
                ciclosDisponibles={ciclosDisponibles || []}
            />

            {mode === 'anual' && anualData ? (
                <>
                    <KPIRowAnual data={anualData} />
                    <PatrimonioBarChart ciclos={anualData.ciclosPorMes} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        {/* Mock components for InversionPortfolio and TasaAhorroTrend since they were not strictly defined but assumed based on structure */}
                        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-white font-bold mb-4 font-serif">Inversión por Categoría</h3>
                            <div className="space-y-3">
                                {anualData.inversionPorCategoria.map((inv: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                        <span className="text-slate-300">{inv.name}</span>
                                        <span className="text-white font-mono font-bold">{formatCurrency(inv.value)}</span>
                                    </div>
                                ))}
                                {anualData.inversionPorCategoria.length === 0 && (
                                    <p className="text-slate-500 text-sm">No hay inversiones registradas este año.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-white font-bold mb-4 font-serif">Evolución: Tasa de Ahorro</h3>
                            <div className="space-y-3">
                                {anualData.tasaAhorroPorCiclo.map((ciclo: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                        <span className="text-slate-300">{ciclo.label}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(ciclo.tasaAhorro * 100, 100)}%` }} />
                                            </div>
                                            <span className="text-emerald-400 font-mono font-bold text-sm">{(ciclo.tasaAhorro * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                                {anualData.tasaAhorroPorCiclo.length === 0 && (
                                    <p className="text-slate-500 text-sm">Sin datos para la tasa de ahorro.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}

            {mode === 'mensual' && mensualData ? (
                <>
                    <KPIRowMensual data={mensualData} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-white font-bold mb-4 font-serif">Flujo del Ciclo</h3>
                            <div className="space-y-4 font-mono">
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span className="text-slate-400">Entradas</span>
                                    <span className="text-emerald-400">{formatCurrency(mensualData.entradas)}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span className="text-slate-400">Gastos</span>
                                    <span className="text-rose-400">{formatCurrency(mensualData.gastos)}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span className="text-slate-400">Invertido</span>
                                    <span className="text-indigo-400">{formatCurrency(mensualData.invertido)}</span>
                                </div>
                                <div className="flex justify-between font-bold pt-2">
                                    <span className="text-white">Ahorro Neto</span>
                                    <span className="text-emerald-500">{formatCurrency(mensualData.ahorroNeto)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-white font-bold mb-4 font-serif">Top 6 Gastos (Categorías)</h3>
                            <div className="space-y-3">
                                {mensualData.gastosPorCategoria.map((cat: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                        <span className="text-slate-300">{cat.category}</span>
                                        <span className="text-rose-400 font-mono font-bold">{formatCurrency(cat.total)}</span>
                                    </div>
                                ))}
                                {mensualData.gastosPorCategoria.length === 0 && (
                                    <p className="text-slate-500 text-sm">No hubo gastos en este ciclo.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
};
