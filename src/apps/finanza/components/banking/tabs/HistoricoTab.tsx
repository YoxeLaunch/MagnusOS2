import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    TrendingUp,
    BarChart3,
    Clock,
    RefreshCw,
    Activity,
    Layers,
    FileSpreadsheet,
    Percent,
    Wallet
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
    formatNumber,
    formatPeriodLabel
} from '../../../utils/bankingFormatters';

interface HistoryPoint {
    periodo: string;
    totalEntities: number;
    totalBalance: number;
    totalInstruments: number;
    systemWeightedYieldPct: number;
    dopYieldPct: number;
    usdYieldPct: number;
}

type RangeOption = '6M' | '1A' | '3A' | '5A' | 'MAX';

export const HistoricoTab: React.FC = () => {
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [selectedRange, setSelectedRange] = useState<RangeOption>('MAX');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch('/api/markets/banking/history');
            if (!res.ok) throw new Error('Error al consultar serie histórica');
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setHistory(json.data);
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // Filtrar serie según rango seleccionado
    const filteredHistory = useMemo(() => {
        if (!history || history.length === 0) return [];
        const total = history.length;

        let limit = total;
        if (selectedRange === '6M') limit = Math.min(6, total);
        else if (selectedRange === '1A') limit = Math.min(12, total);
        else if (selectedRange === '3A') limit = Math.min(36, total);
        else if (selectedRange === '5A') limit = Math.min(60, total);

        return history.slice(total - limit);
    }, [history, selectedRange]);

    // Resumen de crecimiento de la serie observada
    const seriesStats = useMemo(() => {
        if (filteredHistory.length < 2) return null;
        const first = filteredHistory[0];
        const last = filteredHistory[filteredHistory.length - 1];

        const balanceGrowthPct = Number((((last.totalBalance - first.totalBalance) / first.totalBalance) * 100).toFixed(2));
        const instrumentGrowthPct = Number((((last.totalInstruments - first.totalInstruments) / first.totalInstruments) * 100).toFixed(2));
        const yieldDeltaPp = Number((last.systemWeightedYieldPct - first.systemWeightedYieldPct).toFixed(2));

        return {
            firstPeriod: first.periodo,
            lastPeriod: last.periodo,
            balanceGrowthPct,
            instrumentGrowthPct,
            yieldDeltaPp,
            periodsCount: filteredHistory.length
        };
    }, [filteredHistory]);

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-slate-100 uppercase tracking-wider">
                                Serie Histórica del Sistema Bancario
                            </h2>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                                {history.length} Períodos Auditados
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Evolución longitudinal de captaciones, instrumentos y tasas pasivas del sistema financiero dominicano
                        </p>
                    </div>
                </div>

                {/* Range Selector & Refresh */}
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md border border-slate-700/80 p-0.5 bg-slate-900">
                        {(['6M', '1A', '3A', '5A', 'MAX'] as RangeOption[]).map((rng) => {
                            const isAvailable = rng === 'MAX' ||
                                (rng === '6M' && history.length >= 6) ||
                                (rng === '1A' && history.length >= 12) ||
                                (rng === '3A' && history.length >= 36) ||
                                (rng === '5A' && history.length >= 60);

                            return (
                                <button
                                    key={rng}
                                    onClick={() => setSelectedRange(rng)}
                                    disabled={!isAvailable && rng !== 'MAX'}
                                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                                        selectedRange === rng
                                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/50 font-bold'
                                            : isAvailable || rng === 'MAX'
                                            ? 'text-slate-400 hover:text-slate-200'
                                            : 'text-slate-400 cursor-not-allowed'
                                    }`}
                                    title={!isAvailable && rng !== 'MAX' ? `Requiere más de ${rng} de datos cargados` : `Ver últimos ${rng}`}
                                >
                                    {rng}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={fetchHistory}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-300 flex items-center gap-1.5 transition-colors"
                        title="Recargar histórico"
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
                    <button onClick={fetchHistory} className="px-2 py-1 bg-rose-900/40 hover:bg-rose-900/60 rounded text-[11px] font-mono">
                        Reintentar
                    </button>
                </div>
            )}

            {/* Trajectory Highlights */}
            {seriesStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Crecimiento Captaciones</span>
                        <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                            {seriesStats.balanceGrowthPct >= 0 ? `+${seriesStats.balanceGrowthPct}%` : `${seriesStats.balanceGrowthPct}%`}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            {formatPeriodLabel(seriesStats.firstPeriod)} → {formatPeriodLabel(seriesStats.lastPeriod)}
                        </span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Expansión de Instrumentos</span>
                        <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                            {seriesStats.instrumentGrowthPct >= 0 ? `+${seriesStats.instrumentGrowthPct}%` : `${seriesStats.instrumentGrowthPct}%`}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            Nuevas cuentas y certificados registrados
                        </span>
                    </div>

                    <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Variación Tasa Ponderada</span>
                        <div className="text-xl font-bold text-amber-400 font-mono mt-1">
                            {seriesStats.yieldDeltaPp >= 0 ? `+${seriesStats.yieldDeltaPp.toFixed(2)} pp` : `${seriesStats.yieldDeltaPp.toFixed(2)} pp`}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            Evolución del costo de fondeo pasivo
                        </span>
                    </div>
                </div>
            )}

            {/* Charts: Balance Trend & Weighted Yields */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Total Balance Trend */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                Captaciones Totales del Sistema
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Balance total acumulado en instituciones supervisadas (en DOP)
                            </p>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400">Valores en Pesos</span>
                    </div>

                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="histBalGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
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
                                                    <span>Balance Total:</span>
                                                    <span className="font-bold">{formatDOPCompact(payload[0]?.value as number)}</span>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                                <Area type="monotone" dataKey="totalBalance" stroke="#06b6d4" strokeWidth={2.5} fill="url(#histBalGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Passive Rates: System vs DOP vs USD */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                Curva de Tasas Pasivas Históricas
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Rendimiento promedio ponderado del sistema y desglose DOP vs USD
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="flex items-center gap-1 text-cyan-400">
                                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> DOP
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> USD
                            </span>
                        </div>
                    </div>

                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={filteredHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                                                    <span>Tasa DOP:</span>
                                                    <span className="font-bold">{formatPercent(payload[0]?.value as number)}</span>
                                                </div>
                                                <div className="text-emerald-400 flex justify-between gap-4">
                                                    <span>Tasa USD:</span>
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

            {/* Historical Tabular Audit Table */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                            Tabla Longitudinal de Cierres Mensuales
                        </h3>
                        <p className="text-[11px] text-slate-400">
                            Registro de datos regulatorios publicados por la Superintendencia de Bancos
                        </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                        {filteredHistory.length} meses auditados
                    </span>
                </div>

                <div className="overflow-x-auto border border-slate-800/80 rounded-md">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-900/90 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0">
                            <tr>
                                <th className="py-2 px-3">Período</th>
                                <th className="py-2 px-3 text-center">Entidades</th>
                                <th className="py-2 px-3 text-right">Captaciones Totales</th>
                                <th className="py-2 px-3 text-right">Total Instrumentos</th>
                                <th className="py-2 px-3 text-right">Tasa Sistema</th>
                                <th className="py-2 px-3 text-right">Tasa DOP</th>
                                <th className="py-2 px-3 text-right">Tasa USD</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                            {[...filteredHistory].reverse().map((row) => (
                                <tr key={row.periodo} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="py-2 px-3 font-semibold text-slate-200">
                                        {formatPeriodLabel(row.periodo)} ({row.periodo})
                                    </td>
                                    <td className="py-2 px-3 text-center text-slate-300">
                                        {row.totalEntities}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-cyan-400">
                                        {formatDOPCompact(row.totalBalance)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-300">
                                        {formatNumber(row.totalInstruments)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-semibold text-indigo-300">
                                        {formatPercent(row.systemWeightedYieldPct)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-cyan-400">
                                        {formatPercent(row.dopYieldPct)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-emerald-400">
                                        {formatPercent(row.usdYieldPct)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
