import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin,
    Search,
    TrendingUp,
    Users,
    DollarSign,
    RefreshCw,
    Layers,
    Globe,
    ChevronDown,
    Building2,
    Compass
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import {
    formatDOPCompact,
    formatDOPFull,
    formatPercent,
    formatNumber,
    formatPeriodLabel
} from '../../../utils/bankingFormatters';

interface ProvinceItem {
    rank: number;
    provincia: string;
    region: string;
    totalBalance: number;
    totalInstruments: number;
    marketSharePct: number;
    balanceFisica: number;
    balanceJuridica: number;
    balanceDop: number;
    balanceUsd: number;
    balanceEur: number;
    predominantCurrency: 'DOP' | 'USD' | 'EUR';
}

export const GeografiaTab: React.FC = () => {
    const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
    const [periodo, setPeriodo] = useState<string>('2026-08');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<'balance' | 'instruments' | 'share'>('balance');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProvinces = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch('/api/markets/banking/provinces');
            if (!res.ok) throw new Error('Error al consultar datos geográficos provinciales');
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setProvinces(json.data);
                if (json.periodo) setPeriodo(json.periodo);
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProvinces();
    }, []);

    // Regiones únicas para el filtro
    const availableRegions = useMemo(() => {
        const set = new Set<string>();
        provinces.forEach(p => {
            if (p.region) set.add(p.region);
        });
        return Array.from(set).sort();
    }, [provinces]);

    // Filtrado y ordenamiento
    const filteredProvinces = useMemo(() => {
        let list = [...provinces];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(p =>
                p.provincia.toLowerCase().includes(term) ||
                p.region.toLowerCase().includes(term)
            );
        }

        if (selectedRegion !== 'ALL') {
            list = list.filter(p => p.region === selectedRegion);
        }

        if (sortBy === 'instruments') {
            list.sort((a, b) => b.totalInstruments - a.totalInstruments);
        } else if (sortBy === 'share') {
            list.sort((a, b) => b.marketSharePct - a.marketSharePct);
        } else {
            list.sort((a, b) => b.totalBalance - a.totalBalance);
        }

        return list;
    }, [provinces, searchTerm, selectedRegion, sortBy]);

    // Top 8 para gráfico de barras
    const topProvincesChart = useMemo(() => {
        return provinces.slice(0, 8).map(p => ({
            name: p.provincia.length > 14 ? p.provincia.slice(0, 12) + '...' : p.provincia,
            fullName: p.provincia,
            balance: p.totalBalance,
            marketShare: p.marketSharePct
        }));
    }, [provinces]);

    // Resumen de totales
    const aggregateTotals = useMemo(() => {
        const totalBal = provinces.reduce((sum, p) => sum + p.totalBalance, 0);
        const totalInst = provinces.reduce((sum, p) => sum + p.totalInstruments, 0);
        const top3Share = provinces.slice(0, 3).reduce((sum, p) => sum + p.marketSharePct, 0);
        return { totalBal, totalInst, top3Share };
    }, [provinces]);

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-950/70 border border-sky-800/50 flex items-center justify-center text-sky-400">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-slate-100 uppercase tracking-wider">
                                Distribución Geográfica Provincial
                            </h2>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">
                                32 Provincias Oficiales
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Concentración de captaciones, titularidad e instrumentos bancarios por demarcación geográfica
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Ready for Atlas GIS</span>
                    </div>
                    <button
                        onClick={fetchProvinces}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-300 flex items-center gap-1.5 transition-colors"
                        title="Recargar datos"
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
                    <button onClick={fetchProvinces} className="px-2 py-1 bg-rose-900/40 hover:bg-rose-900/60 rounded text-[11px] font-mono">
                        Reintentar
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Captaciones Provincias</span>
                    <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                        {formatDOPCompact(aggregateTotals.totalBal)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        Cierre {formatPeriodLabel(periodo)}
                    </span>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Concentración Top 3 Provincias</span>
                    <div className="text-xl font-bold text-amber-400 font-mono mt-1">
                        {formatPercent(aggregateTotals.top3Share)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        Distrito Nacional + Santiago + Santo Domingo
                    </span>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Instrumentos Distribuidos</span>
                    <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                        {formatNumber(aggregateTotals.totalInst)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        Cuentas y certificados a nivel nacional
                    </span>
                </div>
            </div>

            {/* Top 8 Provinces Horizontal Bar Chart */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                            Top 8 Provincias por Volumen de Captaciones
                        </h3>
                        <p className="text-[11px] text-slate-400">
                            Participación de los principales polos económicos en los depósitos bancarios de la República Dominicana
                        </p>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400">Valores en DOP</span>
                </div>

                <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={topProvincesChart}
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                            <XAxis
                                type="number"
                                stroke="#64748b"
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                tickFormatter={(v) => formatDOPCompact(v)}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#64748b"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                width={110}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-lg text-xs font-mono space-y-1">
                                            <div className="text-slate-300 font-semibold border-b border-slate-800 pb-1">
                                                {d.fullName}
                                            </div>
                                            <div className="text-cyan-400 flex justify-between gap-4">
                                                <span>Captaciones:</span>
                                                <span className="font-bold">{formatDOPCompact(d.balance)}</span>
                                            </div>
                                            <div className="text-amber-400 flex justify-between gap-4">
                                                <span>Cuota Sistema:</span>
                                                <span className="font-bold">{formatPercent(d.marketShare)}</span>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Bar dataKey="balance" fill="#0284c7" radius={[0, 4, 4, 0]}>
                                {topProvincesChart.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : index === 1 ? '#0ea5e9' : '#0284c7'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Filter and Table Section */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Filtrar por provincia..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                            />
                        </div>

                        <select
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-md text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        >
                            <option value="ALL">Todas las regiones ({provinces.length})</option>
                            {availableRegions.map(reg => (
                                <option key={reg} value={reg}>{reg}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span>Ordenar por:</span>
                        <div className="inline-flex rounded-md border border-slate-700/80 p-0.5 bg-slate-900">
                            <button
                                onClick={() => setSortBy('balance')}
                                className={`px-2 py-1 rounded text-[11px] ${sortBy === 'balance' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Balance
                            </button>
                            <button
                                onClick={() => setSortBy('instruments')}
                                className={`px-2 py-1 rounded text-[11px] ${sortBy === 'instruments' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Cuentas
                            </button>
                            <button
                                onClick={() => setSortBy('share')}
                                className={`px-2 py-1 rounded text-[11px] ${sortBy === 'share' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Cuota %
                            </button>
                        </div>
                    </div>
                </div>

                {/* Full Provincial Table */}
                <div className="overflow-x-auto max-h-96 border border-slate-800/80 rounded-md">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-900/90 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="py-2 px-3 w-12 text-center">#</th>
                                <th className="py-2 px-3">Provincia</th>
                                <th className="py-2 px-3">Región</th>
                                <th className="py-2 px-3 text-right">Captaciones Totales</th>
                                <th className="py-2 px-3 text-right">Cuota %</th>
                                <th className="py-2 px-3 text-right">Instrumentos</th>
                                <th className="py-2 px-3 text-center">Persona Fís / Jur</th>
                                <th className="py-2 px-3 text-center">Moneda Predominante</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                            {filteredProvinces.map((prov) => {
                                const totalBal = prov.totalBalance || 1;
                                const fisShare = ((prov.balanceFisica / totalBal) * 100).toFixed(0);
                                const jurShare = ((prov.balanceJuridica / totalBal) * 100).toFixed(0);

                                return (
                                    <tr key={prov.provincia} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                                            {prov.rank}
                                        </td>
                                        <td className="py-2 px-3 font-semibold text-slate-200">
                                            {prov.provincia}
                                        </td>
                                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                                            {prov.region}
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-cyan-400">
                                            {formatDOPCompact(prov.totalBalance)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-300 font-semibold">
                                            {formatPercent(prov.marketSharePct)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-400 text-[11px]">
                                            {formatNumber(prov.totalInstruments)}
                                        </td>
                                        <td className="py-2 px-3 text-center text-[10px]">
                                            <span className="text-indigo-400 font-semibold" title={`Persona Física: ${formatDOPCompact(prov.balanceFisica)}`}>
                                                {fisShare}% F
                                            </span>
                                            <span className="text-slate-400 mx-1">/</span>
                                            <span className="text-emerald-400 font-semibold" title={`Persona Jurídica: ${formatDOPCompact(prov.balanceJuridica)}`}>
                                                {jurShare}% J
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                prov.predominantCurrency === 'USD'
                                                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                                                    : prov.predominantCurrency === 'EUR'
                                                    ? 'bg-amber-950/70 text-amber-400 border border-amber-800/40'
                                                    : 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/40'
                                            }`}>
                                                {prov.predominantCurrency}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer disclaimer */}
                <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Mostrando {filteredProvinces.length} de {provinces.length} demarcaciones registradas en SB.</span>
                    <span>Cifras consolidadas del balance pasivo bancario en DOP oficial.</span>
                </div>
            </div>
        </div>
    );
};
