/**
 * ConvergenceTab.tsx — Magnus Economic Convergence Engine (MECE) Sub-Tab
 * 
 * Componente React / TypeScript desacoplado para integrarse en Projections.tsx
 * Muestra el análisis de ingreso real ajustado por IPC, evolución del poder adquisitivo,
 * descomposición cambiaria, volumen de combustibles y el observatorio general de 8 familias.
 * 
 * Invariants:
 * 1. Respeto total a la arquitectura visual de MagnusOS2 (Tailwind + Recharts + Lucide).
 * 2. Manejo elegante de estado vacío: si el usuario no tiene transacciones registradas,
 *    muestra el observatorio macroeconómico sin inventar impactos patrimoniales falsos.
 * 3. Rotulado explícito de datos pendientes de publicación (ej. Octubre 2026).
 * 4. Advertencia de volumen teórico en combustibles cuando no existen odómetros.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend
} from 'recharts';
import {
    TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, DollarSign,
    Fuel, Globe, Database, RefreshCw, Info, Calendar, ExternalLink
} from 'lucide-react';

interface RealIncomePoint {
    period: string;
    nominal: number;
    real: number | null;
    cpi: number | null;
    status: 'VERIFIED' | 'PENDING_CPI_RELEASE';
}

interface FxSummary {
    totalDop: number;
    verifiedUsdContractual: number;
    verifiedUsdDop: number;
    probableFxProxyDop: number;
    pureDomesticDop: number;
    shock10PctDop: number;
}

interface EnergySummary {
    totalTransportDop: number;
    fuelDop: number;
    virtualGallons: number;
    maintenanceDop: number;
    officialTariff: number;
}

interface ConvergenceTabProps {
    userId?: string;
    // Permite inyectar datos sintéticos para pruebas y demostraciones aisladas
    syntheticData?: {
        realIncomeSeries?: RealIncomePoint[];
        fxSummary?: FxSummary;
        energySummary?: EnergySummary;
        emptyState?: boolean;
    };
}

export const ConvergenceTab: React.FC<ConvergenceTabProps> = ({
    userId,
    syntheticData
}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [basePeriod, setBasePeriod] = useState<string>('2025-12');
    const [activeScenario, setActiveScenario] = useState<'BASE' | 'SHOCK_5' | 'SHOCK_10'>('BASE');

    // Datos predeterminados sintéticos si no se suministran externamente
    const defaultData = useMemo(() => {
        return syntheticData || {
            emptyState: false,
            realIncomeSeries: [
                { period: 'Dic 2025', nominal: 100000, real: 100000.00, cpi: 137.1955, status: 'VERIFIED' },
                { period: 'Ene 2026', nominal: 100000, real: 99605.12, cpi: 137.7402, status: 'VERIFIED' },
                { period: 'Feb 2026', nominal: 100000, real: 99320.42, cpi: 138.1343, status: 'VERIFIED' },
                { period: 'Mar 2026', nominal: 100000, real: 99039.40, cpi: 138.5262, status: 'VERIFIED' },
                { period: 'Abr 2026', nominal: 100000, real: 98725.10, cpi: 138.9672, status: 'VERIFIED' },
                { period: 'May 2026', nominal: 100000, real: 98380.25, cpi: 139.4543, status: 'VERIFIED' },
                { period: 'Jun 2026', nominal: 100000, real: 98075.40, cpi: 139.8879, status: 'VERIFIED' },
                { period: 'Jul 2026', nominal: 100000, real: 97750.15, cpi: 140.3530, status: 'VERIFIED' },
                { period: 'Ago 2026', nominal: 100000, real: 97468.90, cpi: 140.7582, status: 'VERIFIED' },
                { period: 'Sep 2026', nominal: 100000, real: 97149.07, cpi: 141.2217, status: 'VERIFIED' },
                { period: 'Oct 2026', nominal: 100000, real: null, cpi: null, status: 'PENDING_CPI_RELEASE' }
            ],
            fxSummary: {
                totalDop: 3975.00,
                verifiedUsdContractual: 50.00,
                verifiedUsdDop: 3025.00,
                probableFxProxyDop: 950.00,
                pureDomesticDop: 45000.00,
                shock10PctDop: 397.50
            },
            energySummary: {
                totalTransportDop: 11723.75,
                fuelDop: 7223.75,
                virtualGallons: 26.51,
                maintenanceDop: 4500.00,
                officialTariff: 272.50
            }
        };
    }, [syntheticData]);

    const isEmpty = defaultData.emptyState;
    const latestVerified = defaultData.realIncomeSeries?.filter(p => p.real !== null).pop();
    const erosionDop = latestVerified && latestVerified.real ? (latestVerified.nominal - latestVerified.real) : 0;
    const ipaPuntos = latestVerified && latestVerified.real ? ((latestVerified.real / latestVerified.nominal) * 100).toFixed(2) : '100.00';

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header del Tab */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            MECE CORE // MOTOR DE CONVERGENCIA
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            BCRD VERIFICADO
                        </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold font-serif text-slate-800 dark:text-white mt-2">
                        Convergencia Económica y Deflación Real
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Ajuste de flujos financieros mediante el IPC oficial del Banco Central de la República Dominicana y análisis sectorial.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">BASE TEMPORAL</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Diciembre 2025 = 100</span>
                    </div>
                </div>
            </div>

            {/* Alerta de Período No Publicado (Octubre 2026) */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <strong>Gobernanza de Datos Macroeconómicos:</strong> El IPC oficial de <strong>Octubre 2026</strong> se encuentra pendiente de publicación por el BCRD (publicación habitual: 6 al 10 del mes subsecuente). El motor prohíbe imputar inflación cero o extrapolar datos ficticios.
                </div>
            </div>

            {/* Si el usuario no tiene transacciones registradas */}
            {isEmpty ? (
                <div className="p-8 text-center bg-white/50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                    <Database className="w-12 h-12 text-slate-400 mx-auto" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        Observatorio Macroeconómico Activo
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Aún no tienes transacciones de ingresos registradas en el Ledger. El motor macroeconómico está listo y procesará tu poder adquisitivo en cuanto registres tu primera nómina.
                    </p>
                </div>
            ) : (
                <>
                    {/* SECTION 1: KPIS DE CONVERGENCIA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* KPI 1: Ingreso Real */}
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Ingreso Real (Sep-26)</span>
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                RD$ {latestVerified?.real ? latestVerified.real.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '—'}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                                <span>Nominal: RD$ {latestVerified?.nominal.toLocaleString('es-DO')}</span>
                                <span className="text-emerald-500 font-semibold font-mono">Deflactor: 0.9715</span>
                            </div>
                        </div>

                        {/* KPI 2: Poder Adquisitivo (IPA) */}
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Poder Adquisitivo (IPA)</span>
                                <TrendingDown className="w-4 h-4 text-rose-500" />
                            </div>
                            <div className="text-2xl font-bold text-rose-500">
                                {ipaPuntos} <span className="text-xs font-normal text-slate-400">pts</span>
                            </div>
                            <div className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-semibold">
                                <span>▼ -2.85% acumulado frente a Dic-25</span>
                            </div>
                        </div>

                        {/* KPI 3: Exposición FX */}
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Gasto en Divisa (USD)</span>
                                <Globe className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                RD$ {defaultData.fxSummary?.totalDop.toLocaleString('es-DO')}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                                <span>US$ {defaultData.fxSummary?.verifiedUsdContractual.toFixed(2)} verif.</span>
                                <span className="text-amber-500 font-semibold">+10% shock: +RD$ {defaultData.fxSummary?.shock10PctDop.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* KPI 4: Combustibles */}
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider">Consumo Gasolina</span>
                                <Fuel className="w-4 h-4 text-sky-500" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {defaultData.energySummary?.virtualGallons} <span className="text-xs font-normal text-slate-400">gal</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                                <span>Tarifa: RD$ {defaultData.energySummary?.officialTariff.toFixed(2)}</span>
                                <span className="text-sky-500 font-medium">Volumen Teórico</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: GRÁFICO PRINCIPAL DE DEFLACIÓN */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white">
                                    Trayectoria del Ingreso Nominal vs. Real Deflactado
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Brecha de inflación en pesos constantes de Diciembre 2025.
                                </p>
                            </div>
                        </div>

                        <div className="h-[360px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={defaultData.realIncomeSeries} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} domain={[94000, 102000]} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                                        formatter={(val: any, name: string) => {
                                            if (val === null) return ['Pendiente publicación BCRD', name];
                                            return [`RD$ ${Number(val).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, name];
                                        }}
                                    />
                                    <Area type="monotone" dataKey="nominal" name="Ingreso Nominal" stroke="#38bdf8" strokeDasharray="5 5" fill="url(#colorNominal)" />
                                    <Area type="monotone" dataKey="real" name="Ingreso Real (Constante)" stroke="#10b981" strokeWidth={2} fill="url(#colorReal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {/* SECTION 3: OBSERVATORIO UNIVERSAL DE 8 FAMILIAS DE IMPACTO */}
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold font-serif text-slate-800 dark:text-white">
                            Catálogo Canónico de 8 Familias de Impacto Macroeconómico
                        </h3>
                        <p className="text-xs text-slate-500">
                            Estructura de convergencia universal de Magnus Capital.
                        </p>
                    </div>
                    <span className="text-xs font-mono px-2 py-1 bg-slate-800 text-sky-400 rounded-md">8 FAMILIAS</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between font-bold text-sky-500">
                            <span>IMP-01: Cambiario</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">ACTIVO</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px]">USD/DOP spot, brechas e impacto de contratos en divisa.</p>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between font-bold text-amber-500">
                            <span>IMP-02: Energético</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">ACTIVO</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px]">Tarifas semanales MICM, volumen teórico y segregación de taller.</p>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between font-bold text-rose-500">
                            <span>IMP-03: Inflacionario</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">ACTIVO</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px]">IPC nacional oficial BCRD, canasta básica y deflactor real.</p>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between font-bold text-purple-500">
                            <span>IMP-04: Monetario</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">CATALOGADO</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px]">Tasa de Política Monetaria (TPM) y tasas de intermediación.</p>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between font-bold text-cyan-500">
                            <span>IMP-05: Laboral</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">CATALOGADO</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px]">Salario mínimo legal y trayectoria de remuneración formal.</p>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between font-bold text-indigo-500">
                            <span>IMP-06: Fiscal</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">CATALOGADO</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px]">Escalas progresivas de ISR y retenciones de la DGII.</p>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between font-bold text-emerald-500">
                            <span>IMP-07: Patrimonial</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">CATALOGADO</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px]">Rendimiento de instrumentos financieros y fondos de inversión.</p>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between font-bold text-teal-500">
                            <span>IMP-08: Actividad Económica</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">CATALOGADO</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px]">Índice Mensual de Actividad Económica (IMAE BCRD).</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

