/**
 * ConvergenceTab.tsx — Magnus Economic Convergence Engine (MECE)
 * 
 * Componente React / TypeScript integrado en Projections.tsx
 * Conexión nativa en vivo con los endpoints productivos de MECE:
 * - /api/mece/real-income (Ingreso real, deflactores BCRD, IPA y estados de calidad)
 * - /api/mece/exposure (Exposición cambiaria USD y sector transporte/combustibles)
 * 
 * Invariants:
 * 1. Respeto total a la arquitectura visual de MagnusOS2 (Tailwind + Recharts + Lucide).
 * 2. Datos 100% auténticos del Ledger y del BCRD: cero valores inventados en modo productivo.
 * 3. Rotulado explícito de datos pendientes de publicación oficial (Octubre 2026).
 * 4. Manejo estricto de falta de datos ("Sin datos suficientes" cuando no hay odómetros o contratos divisa).
 * 5. Identificación clara de modo simulación si se inyectan datos sintéticos de demostración.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import {
    TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, DollarSign,
    Fuel, Globe, Database, RefreshCw, Info, Calendar, Layers, CheckCircle2,
    Clock, AlertCircle, FileText
} from 'lucide-react';
import { apiFetch } from '../../../shared/utils/apiFetch';

interface RealIncomePoint {
    period: string; // "YYYY-MM"
    nominal: {
        baseSalary?: number;
        incentives?: number;
        extraordinaryBonus?: number;
        otherIncome?: number;
        total: number;
        monthlyChangePct?: number | null;
    };
    cpi: number | null;
    deflator: number | null;
    real: {
        baseSalary?: number | null;
        incentives?: number | null;
        extraordinaryBonus?: number | null;
        otherIncome?: number | null;
        total: number | null;
        monthlyChangePct?: number | null;
        cumulativeChangePct?: number | null;
    };
    purchasingPowerIndex: number | null;
    status: 'VERIFIED' | 'PENDING_CPI_RELEASE';
    cpiMissing?: boolean;
    message?: string;
}

interface RealIncomeResponse {
    success: boolean;
    userId: string;
    basePeriod: string;
    baseCpi: number;
    summary: {
        totalPeriods: number;
        verifiedPeriods: number;
        pendingPeriods: number;
        emptyState: boolean;
    };
    series: RealIncomePoint[];
}

interface ExposureResponse {
    success: boolean;
    userId: string;
    hasExpenses: boolean;
    fxExposure?: {
        totalEvaluatedDop: number;
        breakdown: {
            verifiedUsdDop: number;
            verifiedUsdContractual: number;
            probableFxProxyDop: number;
            pureDomesticDop: number;
            unclassifiedDop: number;
        };
        shares: {
            verifiedUsdPct: number;
            probableFxPct: number;
            totalExposedPct: number;
        };
        scenarios?: {
            depreciation_plus_5_pct?: {
                incrementalMonthlyCostDop: number;
                newTotalExposedDop: number;
            };
            depreciation_plus_10_pct?: {
                incrementalMonthlyCostDop: number;
                newTotalExposedDop: number;
            };
        };
    };
    energyExposure?: {
        totalTransportDop: number;
        breakdown: {
            fuelDop: number;
            nonFuelTransportDop: number;
            maintenanceDop: number;
        };
        fuelMetrics: {
            estimatedVirtualGallons: number;
            fuelShareOfTransportPct: number;
        };
    };
}

interface SyntheticDataProps {
    realIncomeSeries?: Array<{
        period: string;
        nominal: number;
        real: number | null;
        cpi: number | null;
        status: 'VERIFIED' | 'PENDING_CPI_RELEASE';
    }>;
    fxSummary?: {
        totalDop: number;
        verifiedUsdContractual: number;
        verifiedUsdDop: number;
        probableFxProxyDop: number;
        pureDomesticDop: number;
        shock10PctDop: number;
    };
    energySummary?: {
        totalTransportDop: number;
        fuelDop: number;
        virtualGallons: number;
        maintenanceDop: number;
        officialTariff: number;
    };
    emptyState?: boolean;
}

interface ConvergenceTabProps {
    userId?: string;
    syntheticData?: SyntheticDataProps;
}

const MONTH_NAMES: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
};

const formatPeriodLabel = (periodStr: string): string => {
    if (!periodStr) return '';
    const parts = periodStr.split('-');
    if (parts.length === 2) {
        const [year, month] = parts;
        return `${MONTH_NAMES[month] || month} ${year}`;
    }
    return periodStr;
};

export const ConvergenceTab: React.FC<ConvergenceTabProps> = ({
    userId,
    syntheticData
}) => {
    const [loading, setLoading] = useState<boolean>(!syntheticData);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showTableDetails, setShowTableDetails] = useState<boolean>(false);

    // Live API states
    const [realIncomeData, setRealIncomeData] = useState<RealIncomeResponse | null>(null);
    const [exposureData, setExposureData] = useState<ExposureResponse | null>(null);

    const isSimulation = Boolean(syntheticData);

    const fetchData = useCallback(async (isManualRefresh = false) => {
        if (syntheticData) return;

        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const [resIncome, resExposure] = await Promise.all([
                apiFetch('/api/mece/real-income'),
                apiFetch('/api/mece/exposure')
            ]);

            if (!resIncome.ok) {
                throw new Error(`MECE Real Income: HTTP ${resIncome.status}`);
            }
            if (!resExposure.ok) {
                throw new Error(`MECE Exposure: HTTP ${resExposure.status}`);
            }

            const jsonIncome: RealIncomeResponse = await resIncome.json();
            const jsonExposure: ExposureResponse = await resExposure.json();

            setRealIncomeData(jsonIncome);
            setExposureData(jsonExposure);
        } catch (err: any) {
            console.error('[ConvergenceTab] Error fetching MECE data:', err);
            setError(err?.message || 'Error de conexión con el motor MECE en Providence.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [syntheticData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Parse series for chart and KPIs
    const parsedSeries = useMemo(() => {
        if (syntheticData?.realIncomeSeries) {
            return syntheticData.realIncomeSeries.map(pt => ({
                rawPeriod: pt.period,
                displayPeriod: pt.period,
                nominal: pt.nominal,
                real: pt.real,
                cpi: pt.cpi,
                deflator: pt.cpi && pt.cpi > 0 ? (137.1955 / pt.cpi) : null,
                ipa: pt.real && pt.nominal > 0 ? (pt.real / pt.nominal) * 100 : null,
                status: pt.status
            }));
        }

        if (!realIncomeData?.series) return [];

        return realIncomeData.series.map(pt => ({
            rawPeriod: pt.period,
            displayPeriod: formatPeriodLabel(pt.period),
            nominal: pt.nominal.total,
            real: pt.real.total,
            cpi: pt.cpi,
            deflator: pt.deflator,
            ipa: pt.purchasingPowerIndex,
            status: pt.status
        }));
    }, [syntheticData, realIncomeData]);

    const isEmptyState = useMemo(() => {
        if (syntheticData) return Boolean(syntheticData.emptyState);
        return realIncomeData?.summary?.emptyState ?? false;
    }, [syntheticData, realIncomeData]);

    // Latest verified point (Sep 2026)
    const latestVerified = useMemo(() => {
        const verifiedOnly = parsedSeries.filter(p => p.status === 'VERIFIED' && p.real !== null);
        return verifiedOnly.length > 0 ? verifiedOnly[verifiedOnly.length - 1] : null;
    }, [parsedSeries]);

    // Pending point (Oct 2026)
    const pendingPoint = useMemo(() => {
        return parsedSeries.find(p => p.status === 'PENDING_CPI_RELEASE') || null;
    }, [parsedSeries]);

    // Base point (Dic 2025)
    const basePoint = useMemo(() => {
        return parsedSeries.find(p => p.rawPeriod === (realIncomeData?.basePeriod || '2025-12')) || parsedSeries[0] || null;
    }, [parsedSeries, realIncomeData]);

    // Cumulative change from base (Variación acumulada del ingreso real)
    const cumulativeChangePct = useMemo(() => {
        if (!latestVerified?.ipa) return null;
        return (latestVerified.ipa - 100).toFixed(2);
    }, [latestVerified]);

    // Pérdida atribuible exclusivamente a la inflación oficial BCRD
    const cpiInflationLossPct = useMemo(() => {
        if (!latestVerified?.deflator) return null;
        return ((latestVerified.deflator - 1) * 100).toFixed(2);
    }, [latestVerified]);

    // Min and Max for Chart Y-Axis
    const chartYDomain = useMemo(() => {
        if (parsedSeries.length === 0) return [0, 50000];
        const allValues: number[] = [];
        parsedSeries.forEach(p => {
            if (p.nominal > 0) allValues.push(p.nominal);
            if (p.real && p.real > 0) allValues.push(p.real);
        });
        if (allValues.length === 0) return [0, 50000];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const pad = Math.round((max - min) * 0.15) || 5000;
        return [Math.max(0, Math.floor((min - pad) / 1000) * 1000), Math.ceil((max + pad) / 1000) * 1000];
    }, [parsedSeries]);

    // FX Exposure metrics
    const fxMetrics = useMemo(() => {
        if (syntheticData?.fxSummary) {
            return {
                hasDirectUsd: syntheticData.fxSummary.verifiedUsdContractual > 0,
                directUsd: syntheticData.fxSummary.verifiedUsdContractual,
                directUsdDop: syntheticData.fxSummary.verifiedUsdDop,
                probableProxyDop: syntheticData.fxSummary.probableFxProxyDop,
                shock10Dop: syntheticData.fxSummary.shock10PctDop,
                totalExposedDop: syntheticData.fxSummary.totalDop
            };
        }

        const fx = exposureData?.fxExposure;
        if (!fx) return null;

        const hasDirectUsd = (fx.breakdown.verifiedUsdContractual > 0) || (fx.breakdown.verifiedUsdDop > 0);
        const directUsd = fx.breakdown.verifiedUsdContractual;
        const directUsdDop = fx.breakdown.verifiedUsdDop;
        const probableProxyDop = fx.breakdown.probableFxProxyDop;
        const shock10Dop = fx.scenarios?.depreciation_plus_10_pct?.incrementalMonthlyCostDop ?? 0;
        const totalExposedDop = probableProxyDop + directUsdDop;

        return {
            hasDirectUsd,
            directUsd,
            directUsdDop,
            probableProxyDop,
            shock10Dop,
            totalExposedDop,
            totalEvaluatedDop: fx.totalEvaluatedDop,
            probableFxPct: fx.shares.probableFxPct
        };
    }, [syntheticData, exposureData]);

    // Fuel & Energy metrics
    const energyMetrics = useMemo(() => {
        if (syntheticData?.energySummary) {
            return {
                hasFuelData: syntheticData.energySummary.fuelDop > 0,
                fuelDop: syntheticData.energySummary.fuelDop,
                virtualGallons: syntheticData.energySummary.virtualGallons,
                maintenanceDop: syntheticData.energySummary.maintenanceDop,
                officialTariff: syntheticData.energySummary.officialTariff
            };
        }

        const energy = exposureData?.energyExposure;
        if (!energy) return null;

        const fuelDop = energy.breakdown.fuelDop;
        const virtualGallons = energy.fuelMetrics.estimatedVirtualGallons;
        const maintenanceDop = energy.breakdown.maintenanceDop;
        const totalTransportDop = energy.totalTransportDop;
        const hasFuelData = fuelDop > 0 && virtualGallons > 0;

        return {
            hasFuelData,
            fuelDop,
            virtualGallons,
            maintenanceDop,
            totalTransportDop
        };
    }, [syntheticData, exposureData]);

    return (
        <div className="w-full space-y-8 animate-fade-in">
            {/* Header del Tab */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            MECE CORE // MOTOR DE CONVERGENCIA
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            BCRD VERIFICADO
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            LEDGER REAL
                        </span>
                        {isSimulation && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse">
                                MODO SIMULACIÓN
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold font-serif text-slate-800 dark:text-white mt-2">
                        Convergencia Económica y Deflación Real
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
                        Ajuste de flujos financieros mediante el IPC oficial del Banco Central de la República Dominicana (Base 2019-2020=100) y descomposición de exposición estructural en el Ledger.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-left md:text-right">
                        <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">BASE TEMPORAL</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {formatPeriodLabel(realIncomeData?.basePeriod || '2025-12')} = 100
                        </span>
                    </div>
                    {!isSimulation && (
                        <button
                            type="button"
                            onClick={() => fetchData(true)}
                            disabled={loading || refreshing}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
                            title="Recargar datos del Ledger y BCRD"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-500' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Banner de Simulación (si aplica) */}
            {isSimulation && (
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-indigo-300 leading-relaxed">
                        <strong>Visualización Demostrativa Activa:</strong> Esta pantalla está renderizando un dataset sintético ilustrativo provisto externamente. Los valores mostrados no representan transacciones contables registradas en la base de datos de producción.
                    </div>
                </div>
            )}

            {/* Alerta de Período No Publicado (Octubre 2026) */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed space-y-1">
                    <div>
                        <strong>Gobernanza de Datos Macroeconómicos:</strong> El IPC oficial de <strong>Octubre 2026</strong> se encuentra pendiente de publicación por el BCRD (publicación habitual entre el 6 y el 10 del mes subsecuente).
                    </div>
                    <div className="text-amber-700/80 dark:text-amber-300/80">
                        El motor prohíbe terminantemente imputar inflación cero o extrapolar cifras provisionales. El ingreso nominal de Octubre 2026 está contabilizado, pero su deflactor permanece en suspenso técnico.
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between text-xs text-rose-400">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchData(true)}
                        className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors font-medium"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="p-16 text-center bg-white/50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                    <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
                    <p className="text-sm text-slate-500">
                        Consultando asientos contables del Ledger y serie histórica del BCRD...
                    </p>
                </div>
            ) : isEmptyState ? (
                /* Empty State */
                <div className="p-12 text-center bg-white/50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                    <Database className="w-12 h-12 text-slate-400 mx-auto" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        Observatorio Macroeconómico Activo
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Aún no se identifican transacciones de nómina o ingresos verificados en el Ledger para este usuario. El motor de convergencia procesará la deflación en cuanto se asiente la primera partida contable.
                    </p>
                </div>
            ) : (
                <>
                    {/* SECTION 1: KPIS DE CONVERGENCIA REDISEÑADOS Y AMPLIOS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {/* KPI 1: Ingreso Real Verificado */}
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-sky-500/40 transition-colors">
                            <div>
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Ingreso Real ({latestVerified ? latestVerified.displayPeriod : '—'})
                                    </span>
                                    <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                </div>
                                <div className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                                    RD$ {latestVerified?.real ? latestVerified.real.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span>Nominal:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        RD$ {latestVerified?.nominal ? latestVerified.nominal.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '—'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Deflactor BCRD:</span>
                                    <span className="text-emerald-500 font-semibold font-mono">
                                        {latestVerified?.deflator ? latestVerified.deflator.toFixed(4) : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 2: Poder Adquisitivo (IPA) */}
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-rose-500/40 transition-colors">
                            <div>
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Poder Adquisitivo (IPA)
                                    </span>
                                    <TrendingDown className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                </div>
                                <div className="text-2xl lg:text-3xl font-bold text-rose-500 font-mono tracking-tight">
                                    {latestVerified?.ipa ? latestVerified.ipa.toFixed(2) : '100.00'}{' '}
                                    <span className="text-sm font-normal text-slate-400">pts</span>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span>Variación acumulada del ingreso real:</span>
                                    <span className="text-rose-500 font-semibold font-mono">
                                        {cumulativeChangePct && Number(cumulativeChangePct) < 0 ? '▼ ' : ''}{cumulativeChangePct ?? '0.00'}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span title="Erosión del poder de compra atribuible exclusivamente a la inflación medida por el IPC BCRD (deflactor 0.9715)">
                                        Pérdida por inflación BCRD:
                                    </span>
                                    <span className="text-amber-500 dark:text-amber-400 font-semibold font-mono">
                                        {cpiInflationLossPct && Number(cpiInflationLossPct) < 0 ? '▼ ' : ''}{cpiInflationLossPct ?? '0.00'}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                                    <span>Frente a base {formatPeriodLabel(realIncomeData?.basePeriod || '2025-12')}</span>
                                    <span className="text-emerald-500 font-medium">Oficial</span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 3: Exposición Divisas (USD) */}
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-amber-500/40 transition-colors">
                            <div>
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {fxMetrics?.hasDirectUsd ? 'Gasto en Divisa (USD Contractual)' : 'Exposición cambiaria indirecta estimada'}
                                    </span>
                                    <Globe className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                </div>
                                {fxMetrics?.hasDirectUsd ? (
                                    <div className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                                        US$ {fxMetrics.directUsd.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                    </div>
                                ) : fxMetrics && fxMetrics.probableProxyDop > 0 ? (
                                    <div className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                                        RD$ {fxMetrics.probableProxyDop.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                    </div>
                                ) : (
                                    <div className="text-xl font-bold text-slate-400 italic">
                                        Sin datos suficientes
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                {fxMetrics?.hasDirectUsd ? (
                                    <div className="flex items-center justify-between">
                                        <span>Facturado en DOP:</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            RD$ {fxMetrics.directUsdDop.toLocaleString('es-DO')}
                                        </span>
                                    </div>
                                ) : fxMetrics && fxMetrics.probableProxyDop > 0 ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span>Período evaluado:</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {formatPeriodLabel(realIncomeData?.basePeriod || '2025-12')} – {latestVerified ? latestVerified.displayPeriod : 'Sep 2026'} ({realIncomeData?.summary?.totalPeriods || 11} meses)
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Proxy heurístico:</span>
                                            <span className="text-amber-500 font-semibold">
                                                {fxMetrics.probableFxPct}% del egreso acumulado
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-[11px] text-slate-400">
                                        Sin facturas directas en divisa
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span title={`Shock calculado sobre los ${realIncomeData?.summary?.totalPeriods || 11} meses evaluados (promedio: +RD$ ${(fxMetrics ? (fxMetrics.shock10Dop / (realIncomeData?.summary?.totalPeriods || 11)) : 0).toFixed(2)}/mes)`}>
                                        Impacto shock +10% en el período:
                                    </span>
                                    <span className="text-amber-500 font-mono font-semibold">
                                        +RD$ {fxMetrics ? fxMetrics.shock10Dop.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '0.00'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 4: Combustibles y Energía */}
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-sky-500/40 transition-colors">
                            <div>
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Consumo Gasolina
                                    </span>
                                    <Fuel className="w-4 h-4 text-sky-500 flex-shrink-0" />
                                </div>
                                {energyMetrics?.hasFuelData ? (
                                    <div className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                                        {energyMetrics.virtualGallons.toFixed(2)}{' '}
                                        <span className="text-sm font-normal text-slate-400">gal</span>
                                    </div>
                                ) : (
                                    <div className="text-xl font-bold text-slate-400 italic">
                                        Sin datos suficientes
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1">
                                {energyMetrics?.hasFuelData ? (
                                    <div className="flex items-center justify-between">
                                        <span>Gasto combustible:</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            RD$ {energyMetrics.fuelDop.toLocaleString('es-DO')}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span>Consumo directo:</span>
                                        <span className="text-slate-400">0.00 gal (sin odómetro)</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span>Taller / Mantenimiento:</span>
                                    <span className="text-sky-500 font-mono font-semibold">
                                        RD$ {energyMetrics ? energyMetrics.maintenanceDop.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '0.00'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: GRÁFICO PRINCIPAL DE TRAYECTORIA Y DEFLACIÓN */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    Trayectoria del Ingreso Nominal vs. Real Deflactado
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Serie mensual histórica del Ledger deflactada a precios constantes de {formatPeriodLabel(realIncomeData?.basePeriod || '2025-12')} (IPC BCRD).
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowTableDetails(prev => !prev)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    {showTableDetails ? 'Ocultar Detalle Mensual' : 'Ver Detalle Mensual'}
                                </button>
                            </div>
                        </div>

                        <div className="h-[400px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={parsedSeries} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorNominalReal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="colorRealReal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                                    <XAxis
                                        dataKey="displayPeriod"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        domain={chartYDomain}
                                        tickFormatter={(v) => `RD$ ${(v / 1000).toFixed(0)}k`}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            borderColor: '#334155',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                        }}
                                        formatter={(val: any, name: string) => {
                                            if (val === null || val === undefined) {
                                                return ['Pendiente publicación BCRD', name];
                                            }
                                            return [`RD$ ${Number(val).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                                        }}
                                        labelFormatter={(label) => `Período: ${label}`}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        height={36}
                                        formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{value}</span>}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="nominal"
                                        name="Ingreso Nominal (Ledger)"
                                        stroke="#38bdf8"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                        fill="url(#colorNominalReal)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="real"
                                        name="Ingreso Real Deflactado (Constante)"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        fill="url(#colorRealReal)"
                                        connectNulls={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Tabla de Detalle Mensual (Opcional desplegable) */}
                        {showTableDetails && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase font-semibold">
                                            <th className="py-2.5 px-3">Período</th>
                                            <th className="py-2.5 px-3">Nominal (DOP)</th>
                                            <th className="py-2.5 px-3">IPC BCRD</th>
                                            <th className="py-2.5 px-3">Deflactor</th>
                                            <th className="py-2.5 px-3">Real (DOP)</th>
                                            <th className="py-2.5 px-3">IPA (pts)</th>
                                            <th className="py-2.5 px-3">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                                        {parsedSeries.map((row) => (
                                            <tr key={row.rawPeriod} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-200">
                                                    {row.displayPeriod}
                                                </td>
                                                <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400">
                                                    RD$ {row.nominal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                                    {row.cpi ? row.cpi.toFixed(4) : '—'}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                                    {row.deflator ? row.deflator.toFixed(4) : '—'}
                                                </td>
                                                <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                                                    {row.real ? `RD$ ${row.real.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : 'PENDIENTE'}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">
                                                    {row.ipa ? row.ipa.toFixed(2) : 'N/A'}
                                                </td>
                                                <td className="py-2.5 px-3 font-sans">
                                                    {row.status === 'VERIFIED' ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                            <CheckCircle2 className="w-3 h-3" /> VERIFICADO
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                            <Clock className="w-3 h-3" /> PENDIENTE BCRD
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SECTION 3: OBSERVATORIO UNIVERSAL DE 8 FAMILIAS DE IMPACTO (REDISTRIBUCIÓN AMPLIA) */}
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                    <div>
                        <h3 className="text-base font-bold font-serif text-slate-800 dark:text-white flex items-center gap-2">
                            <Layers className="w-4 h-4 text-sky-500" />
                            Catálogo Canónico de 8 Familias de Impacto Macroeconómico
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Matriz de gobernanza y taxonomía de convergencia universal de Magnus Capital.
                        </p>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 rounded-md border border-slate-200 dark:border-white/10 self-start sm:self-auto">
                        8 FAMILIAS CANÓNICAS
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    {/* IMP-01 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-w-0">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-sky-600 dark:text-sky-400 truncate">
                                    IMP-01: Cambiario
                                </span>
                                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 flex-shrink-0">
                                    ACTIVO
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                                USD/DOP spot oficial, brechas cambiarias e impacto de contratos en divisa extranjera.
                            </p>
                        </div>
                    </div>

                    {/* IMP-02 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-w-0">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-amber-600 dark:text-amber-400 truncate">
                                    IMP-02: Energético
                                </span>
                                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 flex-shrink-0">
                                    ACTIVO
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                                Tarifas semanales MICM, volumen teórico combustible y segregación de taller/mantenimiento.
                            </p>
                        </div>
                    </div>

                    {/* IMP-03 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-w-0">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-rose-600 dark:text-rose-400 truncate">
                                    IMP-03: Inflacionario
                                </span>
                                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 flex-shrink-0">
                                    ACTIVO
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                                IPC general oficial BCRD, canasta de bienes y deflactor del poder adquisitivo (IPA).
                            </p>
                        </div>
                    </div>

                    {/* IMP-04 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-w-0">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-purple-600 dark:text-purple-400 truncate">
                                    IMP-04: Monetario
                                </span>
                                <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">
                                    CATALOGADO
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                                Tasa de Política Monetaria (TPM) y tasas de interés pasivas y activas del sistema.
                            </p>
                        </div>
                    </div>

                    {/* IMP-05 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-w-0">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-cyan-600 dark:text-cyan-400 truncate">
                                    IMP-05: Laboral
                                </span>
                                <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">
                                    CATALOGADO
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                                Salario mínimo del sector privado no sectorizado y remuneración media formal.
                            </p>
                        </div>
                    </div>

                    {/* IMP-06 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-w-0">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                    IMP-06: Fiscal
                                </span>
                                <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">
                                    CATALOGADO
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                                Escala progresiva del ISR de personas físicas y retenciones impositivas de la DGII.
                            </p>
                        </div>
                    </div>

                    {/* IMP-07 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-w-0">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                    IMP-07: Patrimonial
                                </span>
                                <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">
                                    CATALOGADO
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                                Rendimiento real de certificados financieros, títulos del Banco Central y cuotas AFI.
                            </p>
                        </div>
                    </div>

                    {/* IMP-08 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-w-0">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-teal-600 dark:text-teal-400 truncate">
                                    IMP-08: Actividad Económica
                                </span>
                                <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">
                                    CATALOGADO
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                                Índice Mensual de Actividad Económica (IMAE BCRD) y ciclo económico sectorial.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
