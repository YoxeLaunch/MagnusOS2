import React, { useState, useEffect, useMemo } from 'react';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Percent,
    AlertCircle,
    Info,
    RefreshCw,
    Activity,
    Layers,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Minus
} from 'lucide-react';
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import {
    formatDOPCompact,
    formatDOPFull,
    formatPercent,
    formatBasisPoints,
    formatPeriodLabel
} from '../../../utils/bankingFormatters';

interface DollarizationPoint {
    periodo: string;
    totalDop: number;
    totalUsd: number;
    totalEur: number;
    totalSystem: number;
    dsiPct: number;
    dopYieldPct: number;
    usdYieldPct: number;
}

interface DollarizationData {
    methodology: string;
    explanation: string;
    timeSeries: DollarizationPoint[];
}

export const DolarizacionTab: React.FC = () => {
    const [data, setData] = useState<DollarizationData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch('/api/markets/banking/dollarization-trend');
            if (!res.ok) throw new Error('Error al consultar tendencia de dolarización');
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
            } else {
                throw new Error(json.message || 'No se recibieron datos de dolarización');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Cálculos estadísticos descriptivos
    const stats = useMemo(() => {
        if (!data || !data.timeSeries || data.timeSeries.length === 0) return null;
        const series = data.timeSeries;
        const current = series[series.length - 1];
        const previous = series.length > 1 ? series[series.length - 2] : null;

        const dsiValues = series.map(p => p.dsiPct);
        const maxDsi = Math.max(...dsiValues);
        const minDsi = Math.min(...dsiValues);

        const deltaMonthlyPp = previous ? Number((current.dsiPct - previous.dsiPct).toFixed(2)) : 0;
        const deltaUsdGrowthPct = previous && previous.totalUsd > 0
            ? Number((((current.totalUsd - previous.totalUsd) / previous.totalUsd) * 100).toFixed(2))
            : 0;

        return {
            current,
            previous,
            maxDsi,
            minDsi,
            deltaMonthlyPp,
            deltaUsdGrowthPct,
            currentPeriod: current.periodo
        };
    }, [data]);

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                        <Percent className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-slate-100 uppercase tracking-wider">
                                Índice de Dolarización del Ahorro Bancario (DSI)
                            </h2>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                                Metodología Oficial SB
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Proporción del balance de depósitos captados en moneda extranjera sobre el ahorro total del sistema financiero
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-300 flex items-center gap-1.5 transition-colors"
                        title="Recargar datos de tendencia"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={fetchData} className="px-2 py-1 bg-rose-900/40 hover:bg-rose-900/60 rounded text-[11px] font-mono">
                        Reintentar
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* DSI Actual */}
                    <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">DSI Actual</span>
                            <span className="text-[10px] font-mono text-slate-400">{formatPeriodLabel(stats.currentPeriod)}</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                            {formatPercent(stats.current.dsiPct)}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[11px] font-mono">
                            {stats.deltaMonthlyPp > 0 ? (
                                <span className="text-emerald-400 flex items-center gap-0.5">
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    +{stats.deltaMonthlyPp.toFixed(2)} pp
                                </span>
                            ) : stats.deltaMonthlyPp < 0 ? (
                                <span className="text-rose-400 flex items-center gap-0.5">
                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                    {stats.deltaMonthlyPp.toFixed(2)} pp
                                </span>
                            ) : (
                                <span className="text-slate-400 flex items-center gap-0.5">
                                    <Minus className="w-3.5 h-3.5" />
                                    0.00 pp
                                </span>
                            )}
                            <span className="text-slate-400">vs mes anterior</span>
                        </div>
                    </div>

                    {/* Depósitos USD Equivalentes */}
                    <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Depósitos USD (en DOP)</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-950/50 text-emerald-400 rounded">Equivalente</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-100 font-mono mt-1">
                            {formatDOPCompact(stats.current.totalUsd)}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[11px] font-mono">
                            <span className={stats.deltaUsdGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {stats.deltaUsdGrowthPct >= 0 ? `+${stats.deltaUsdGrowthPct}%` : `${stats.deltaUsdGrowthPct}%`}
                            </span>
                            <span className="text-slate-400">crecimiento mensual</span>
                        </div>
                    </div>

                    {/* Máximo Histórico DSI */}
                    <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Máximo Período</span>
                        <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                            {formatPercent(stats.maxDsi)}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block mt-1">
                            Pico observado en serie
                        </span>
                    </div>

                    {/* Mínimo Histórico DSI */}
                    <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Mínimo Período</span>
                        <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                            {formatPercent(stats.minDsi)}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block mt-1">
                            Suelo observado en serie
                        </span>
                    </div>
                </div>
            )}

            {/* Main Charts Section */}
            {data && data.timeSeries.length > 0 && (
                <div className="space-y-4">
                    {/* DSI Trend Line Chart */}
                    <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div>
                                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                    Trayectoria del Índice DSI (%)
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Evolución mensual de la proporción de captaciones en USD en el sistema bancario dominicano
                                </p>
                            </div>
                            <div className="text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                Rango: <strong className="text-cyan-400">{stats?.minDsi}%</strong> - <strong className="text-amber-400">{stats?.maxDsi}%</strong>
                            </div>
                        </div>

                        <div className="h-60 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis
                                        dataKey="periodo"
                                        stroke="#64748b"
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={(v) => formatPeriodLabel(v)}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        domain={['dataMin - 1', 'dataMax + 1']}
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={(v) => `${v.toFixed(1)}%`}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload || !payload.length) return null;
                                            return (
                                                <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-lg text-xs font-mono space-y-1">
                                                    <div className="text-slate-300 font-semibold border-b border-slate-800 pb-1">
                                                        {formatPeriodLabel(String(label))}
                                                    </div>
                                                    <div className="text-emerald-400 flex justify-between gap-4">
                                                        <span>DSI:</span>
                                                        <span className="font-bold">{formatPercent(payload[0]?.value as number)}</span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="dsiPct"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        dot={{ fill: '#10b981', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Currency Balances Stacked Bar Chart & Yields Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Currency Breakdown Volumes */}
                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                        Volumen de Depósitos por Moneda
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Valores en DOP oficial equivalente según norma SB
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                    <span className="flex items-center gap-1 text-cyan-400">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span> DOP
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> USD
                                    </span>
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span> EUR
                                    </span>
                                </div>
                            </div>

                            <div className="h-60 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis
                                            dataKey="periodo"
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            tickFormatter={(v) => formatPeriodLabel(v)}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            tickFormatter={(v) => formatDOPCompact(v)}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload || !payload.length) return null;
                                                return (
                                                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-lg text-xs font-mono space-y-1">
                                                        <div className="text-slate-300 font-semibold border-b border-slate-800 pb-1">
                                                            {formatPeriodLabel(String(label))}
                                                        </div>
                                                        <div className="text-cyan-400 flex justify-between gap-4">
                                                            <span>DOP:</span>
                                                            <span>{formatDOPCompact(payload[0]?.value as number)}</span>
                                                        </div>
                                                        <div className="text-emerald-400 flex justify-between gap-4">
                                                            <span>USD (eq):</span>
                                                            <span>{formatDOPCompact(payload[1]?.value as number)}</span>
                                                        </div>
                                                        <div className="text-amber-400 flex justify-between gap-4">
                                                            <span>EUR (eq):</span>
                                                            <span>{formatDOPCompact(payload[2]?.value as number)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar dataKey="totalDop" stackId="a" fill="#06b6d4" />
                                        <Bar dataKey="totalUsd" stackId="a" fill="#10b981" />
                                        <Bar dataKey="totalEur" stackId="a" fill="#f59e0b" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Passive Rates Context: DOP vs USD */}
                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                        Contexto de Tasas Pasivas Ponderadas
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Rendimiento ofrecido en depósitos DOP vs USD en el sistema
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-mono">
                                    <span className="flex items-center gap-1 text-cyan-400">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Tasa DOP
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Tasa USD
                                    </span>
                                </div>
                            </div>

                            <div className="h-60 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis
                                            dataKey="periodo"
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            tickFormatter={(v) => formatPeriodLabel(v)}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            tickFormatter={(v) => `${v.toFixed(1)}%`}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload || !payload.length) return null;
                                                return (
                                                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-lg text-xs font-mono space-y-1">
                                                        <div className="text-slate-300 font-semibold border-b border-slate-800 pb-1">
                                                            {formatPeriodLabel(String(label))}
                                                        </div>
                                                        <div className="text-cyan-400 flex justify-between gap-4">
                                                            <span>Tasa Pasiva DOP:</span>
                                                            <span className="font-bold">{formatPercent(payload[0]?.value as number)}</span>
                                                        </div>
                                                        <div className="text-emerald-400 flex justify-between gap-4">
                                                            <span>Tasa Pasiva USD:</span>
                                                            <span className="font-bold">{formatPercent(payload[1]?.value as number)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Line type="monotone" dataKey="dopYieldPct" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="usdYieldPct" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Rigorous Factual / Methodological Statement (Phase 4 / Phase 11 constraint) */}
                    <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-slate-200 font-semibold">Nota Metodológica Regulatoria: </span>
                            {stats?.deltaMonthlyPp !== undefined && (
                                <span>
                                    El ratio DSI se situó en {formatPercent(stats.current.dsiPct)}, registrando una variación de{' '}
                                    {stats.deltaMonthlyPp >= 0 ? `+${stats.deltaMonthlyPp.toFixed(2)}` : stats.deltaMonthlyPp.toFixed(2)}{' '}
                                    puntos porcentuales respecto al período anterior ({formatPeriodLabel(stats.previous?.periodo || '')}).
                                    Las cifras en divisas extranjeras corresponden a su equivalencia contable en pesos dominicanos (DOP) informada por la Superintendencia de Bancos.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
