import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Building2,
    DollarSign,
    Users,
    MapPin,
    TrendingUp,
    ShieldAlert,
    ChevronDown,
    Layers,
    ArrowUpRight,
    RefreshCw,
    Wallet,
    Landmark
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    formatDOPCompact,
    formatDOPFull,
    formatPercent,
    formatNumber,
    formatPeriodLabel
} from '../../../utils/bankingFormatters';

interface InstitutionSummaryItem {
    rank: number;
    entidad: string;
    tipoEntidad: string;
    totalBalance: number;
    balanceDop: number;
    balanceUsd: number;
    balanceEur: number;
    totalInstruments: number;
    marketSharePct: number;
}

interface YieldByCurrency {
    currency: string;
    balance: number;
    weightedYieldPct: number;
}

interface PersonDist {
    persona: string;
    balance: number;
    instruments: number;
}

interface ProvinceDist {
    provincia: string;
    region: string;
    balance: number;
    instruments: number;
}

interface HistoryItem {
    periodo: string;
    totalBalance: number;
    balanceDop: number;
    balanceUsd: number;
    balanceEur: number;
    instruments: number;
    weightedYieldPct: number;
}

interface InstitutionDetail {
    entidad: string;
    periodo: string;
    currentBalance: number;
    currentInstruments: number;
    currentWeightedYieldPct: number;
    yieldsByCurrency: YieldByCurrency[];
    personDistribution: PersonDist[];
    provinceDistribution: ProvinceDist[];
    history: HistoryItem[];
}

const CURRENCY_COLORS: Record<string, string> = {
    DOP: '#06b6d4', // Cyan
    USD: '#10b981', // Emerald
    EUR: '#f59e0b'  // Amber
};

export const InstitucionesTab: React.FC<{ initialEntity?: string }> = ({ initialEntity = 'BANRESERVAS' }) => {
    const [institutionsList, setInstitutionsList] = useState<InstitutionSummaryItem[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<string>(initialEntity);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [entityData, setEntityData] = useState<InstitutionDetail | null>(null);
    const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar lista completa de entidades desde /deposits
    useEffect(() => {
        let isMounted = true;
        const fetchList = async () => {
            try {
                setIsLoadingList(true);
                const res = await fetch('/api/markets/banking/deposits');
                if (!res.ok) throw new Error('Error al consultar lista de entidades');
                const json = await res.json();
                if (isMounted && json.success && Array.isArray(json.data)) {
                    setInstitutionsList(json.data);
                    // Si no hay seleccionada o la inicial no existe, tomar el primer banco
                    if (!selectedEntity && json.data.length > 0) {
                        setSelectedEntity(json.data[0].entidad);
                    }
                }
            } catch (err: any) {
                if (isMounted) setError(err.message || 'Error de conexión');
            } finally {
                if (isMounted) setIsLoadingList(false);
            }
        };

        fetchList();
        return () => { isMounted = false; };
    }, []);

    // Cargar ficha detallada de la entidad seleccionada
    useEffect(() => {
        if (!selectedEntity) return;

        let isMounted = true;
        const fetchDetail = async () => {
            try {
                setIsLoadingDetail(true);
                setError(null);
                const res = await fetch(`/api/markets/banking/institution/${encodeURIComponent(selectedEntity)}`);
                if (!res.ok) throw new Error(`Error al consultar ficha de ${selectedEntity}`);
                const json = await res.json();
                if (isMounted && json.success) {
                    setEntityData(json);
                }
            } catch (err: any) {
                if (isMounted) setError(err.message || 'Error cargando datos de institución');
            } finally {
                if (isMounted) setIsLoadingDetail(false);
            }
        };

        fetchDetail();
        return () => { isMounted = false; };
    }, [selectedEntity]);

    // Filtrado de instituciones para buscador
    const filteredInstitutions = useMemo(() => {
        if (!searchTerm.trim()) return institutionsList;
        const term = searchTerm.toLowerCase();
        return institutionsList.filter(inst =>
            inst.entidad.toLowerCase().includes(term) ||
            inst.tipoEntidad.toLowerCase().includes(term)
        );
    }, [institutionsList, searchTerm]);

    // Datos resumidos del banco en la lista
    const currentSummary = useMemo(() => {
        return institutionsList.find(i => i.entidad.toUpperCase() === selectedEntity.toUpperCase()) || null;
    }, [institutionsList, selectedEntity]);

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header & Selector Bar */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-950/70 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
                        <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-slate-100 uppercase tracking-wider">
                                Explorador de Entidades Bancarias
                            </h2>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                                {institutionsList.length} Entidades Oficiales
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Ficha analítica institucional basada en estadísticas oficiales de la Superintendencia de Bancos
                        </p>
                    </div>
                </div>

                {/* Search & Dropdown Control */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar entidad o tipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        />
                    </div>

                    <div className="relative w-full sm:w-56">
                        <select
                            value={selectedEntity}
                            onChange={(e) => setSelectedEntity(e.target.value)}
                            className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-md text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        >
                            {filteredInstitutions.map(inst => (
                                <option key={inst.entidad} value={inst.entidad}>
                                    #{inst.rank} {inst.entidad} ({inst.marketSharePct}%)
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button
                        onClick={() => setSelectedEntity('BANRESERVAS')}
                        className="px-2 py-1 bg-rose-900/40 hover:bg-rose-900/60 rounded text-[11px] font-mono"
                    >
                        Restablecer a Banreservas
                    </button>
                </div>
            )}

            {/* Loading Indicator */}
            {isLoadingDetail && (
                <div className="p-8 text-center bg-[#0f172a] border border-slate-800 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-mono">Consultando ficha regulatoria de {selectedEntity}...</p>
                </div>
            )}

            {/* Main Content */}
            {!isLoadingDetail && entityData && (
                <div className="space-y-5">
                    {/* Top Entity Profile Header Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Entidad Oficial</span>
                            <div className="text-sm font-bold text-slate-100 font-mono truncate mt-0.5" title={entityData.entidad}>
                                {entityData.entidad}
                            </div>
                            <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                                {currentSummary?.tipoEntidad || 'Bancos Múltiples'}
                            </span>
                        </div>

                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Captaciones Totales</span>
                            <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                                {formatDOPCompact(entityData.currentBalance)}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5" title="Market share sobre sistema bancario">
                                Cuota: <strong className="text-slate-200">{currentSummary?.marketSharePct || '0'}%</strong> (Rank #{currentSummary?.rank || '-'})
                            </span>
                        </div>

                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Tasa Pasiva Ponderada</span>
                            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                                {formatPercent(entityData.currentWeightedYieldPct)}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                Promedio ponderado pasivo
                            </span>
                        </div>

                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Instrumentos</span>
                            <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
                                {formatNumber(entityData.currentInstruments)}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                Cuentas y depósitos SB
                            </span>
                        </div>

                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Período Reportado</span>
                            <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
                                {formatPeriodLabel(entityData.periodo)}
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                                ● Cierre SB Confirmado
                            </span>
                        </div>
                    </div>

                    {/* Historical Balance Chart & Currency Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* 2 Cols: Monthly Balance Trend */}
                        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                        Evolución de Captaciones en 2026
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Crecimiento mensual del balance consolidado y depósitos por moneda (en DOP equivalente)
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-mono">
                                    <span className="flex items-center gap-1 text-cyan-400">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> DOP
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> USD
                                    </span>
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> EUR
                                    </span>
                                </div>
                            </div>

                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={entityData.history} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradDop" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                                            </linearGradient>
                                            <linearGradient id="gradUsd" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis
                                            dataKey="periodo"
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            tickFormatter={(val) => formatPeriodLabel(val)}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            tickFormatter={(val) => formatDOPCompact(val)}
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
                                                            <span>Balance DOP:</span>
                                                            <span>{formatDOPCompact(payload[0]?.value as number)}</span>
                                                        </div>
                                                        <div className="text-emerald-400 flex justify-between gap-4">
                                                            <span>Balance USD (eq):</span>
                                                            <span>{formatDOPCompact(payload[1]?.value as number)}</span>
                                                        </div>
                                                        <div className="text-amber-400 flex justify-between gap-4">
                                                            <span>Balance EUR (eq):</span>
                                                            <span>{formatDOPCompact(payload[2]?.value as number)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Area type="monotone" dataKey="balanceDop" stackId="1" stroke="#06b6d4" fill="url(#gradDop)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="balanceUsd" stackId="1" stroke="#10b981" fill="url(#gradUsd)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="balanceEur" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={1.5} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 1 Col: Currency & Passive Yield Breakdown */}
                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                                    Desglose por Divisa
                                </h3>
                                <p className="text-[11px] text-slate-400 mb-3">
                                    Participación y tasa pasiva promedio por moneda
                                </p>

                                <div className="space-y-3">
                                    {entityData.yieldsByCurrency.map((yc) => {
                                        const share = entityData.currentBalance > 0
                                            ? ((yc.balance / entityData.currentBalance) * 100).toFixed(1)
                                            : '0';
                                        return (
                                            <div key={yc.currency} className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-md">
                                                <div className="flex items-center justify-between text-xs font-mono mb-1">
                                                    <span className="flex items-center gap-1.5 font-bold" style={{ color: CURRENCY_COLORS[yc.currency] || '#94a3b8' }}>
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CURRENCY_COLORS[yc.currency] || '#94a3b8' }}></span>
                                                        {yc.currency}
                                                    </span>
                                                    <span className="text-slate-200 font-bold">{share}%</span>
                                                </div>
                                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, parseFloat(share)))}%`,
                                                            backgroundColor: CURRENCY_COLORS[yc.currency] || '#94a3b8'
                                                        }}
                                                    ></div>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                                    <span>Balance: <strong className="text-slate-200">{formatDOPCompact(yc.balance)}</strong></span>
                                                    <span>Tasa: <strong className="text-amber-400">{formatPercent(yc.weightedYieldPct)}</strong></span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Informative Disclaimer */}
                            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-400">
                                ℹ️ Los balances en USD y EUR corresponden al valor equivalente en DOP al tipo de cambio oficial contable fijado por la SB.
                            </div>
                        </div>
                    </div>

                    {/* Bottom Split: Holder Distribution & Top Provinces */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Holder Mix (Persona física vs jurídica) */}
                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                        Distribución de Titularidad
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Participación de personas físicas vs. personas jurídicas
                                    </p>
                                </div>
                                <Users className="w-4 h-4 text-slate-400" />
                            </div>

                            <div className="space-y-3">
                                {entityData.personDistribution.map((item) => {
                                    const share = entityData.currentBalance > 0
                                        ? ((item.balance / entityData.currentBalance) * 100).toFixed(1)
                                        : '0';
                                    const isFisica = item.persona.toLowerCase().includes('física');
                                    return (
                                        <div key={item.persona} className="p-3 bg-slate-900/60 border border-slate-800 rounded-md">
                                            <div className="flex items-center justify-between text-xs font-mono mb-1">
                                                <span className={`font-semibold ${isFisica ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                    {item.persona}
                                                </span>
                                                <span className="text-slate-200 font-bold">{share}%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                                                <div
                                                    className={`h-full rounded-full ${isFisica ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${share}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                                <span>Balance: <strong className="text-slate-200">{formatDOPCompact(item.balance)}</strong></span>
                                                <span>Instrumentos: <strong className="text-slate-300">{formatNumber(item.instruments)}</strong></span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Provinces Table */}
                        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                        Principales Provincias de Captación
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Concentración geográfica de depósitos e instrumentos
                                    </p>
                                </div>
                                <MapPin className="w-4 h-4 text-slate-400" />
                            </div>

                            <div className="overflow-x-auto max-h-56">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0">
                                        <tr>
                                            <th className="py-1.5 px-2">Provincia</th>
                                            <th className="py-1.5 px-2">Región</th>
                                            <th className="py-1.5 px-2 text-right">Balance</th>
                                            <th className="py-1.5 px-2 text-right">Instrumentos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {entityData.provinceDistribution.map((prov, idx) => (
                                            <tr key={prov.provincia} className="hover:bg-slate-800/40 transition-colors">
                                                <td className="py-1.5 px-2 font-medium text-slate-200 truncate max-w-[130px]" title={prov.provincia}>
                                                    {prov.provincia}
                                                </td>
                                                <td className="py-1.5 px-2 text-slate-400 text-[10px] truncate max-w-[110px]">
                                                    {prov.region}
                                                </td>
                                                <td className="py-1.5 px-2 text-right text-cyan-400 font-semibold">
                                                    {formatDOPCompact(prov.balance)}
                                                </td>
                                                <td className="py-1.5 px-2 text-right text-slate-300 text-[10px]">
                                                    {formatNumber(prov.instruments)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
