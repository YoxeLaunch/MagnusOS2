/**
 * ============================================================================
 * RESUMEN TAB // SISTEMA BANCARIO
 * Executive overview of deposits, MoM growth, DSI, market share & holder mix
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  PieChart as PieIcon,
  Users,
  Coins,
  ArrowRight,
  ShieldCheck,
  Percent,
  Landmark,
  Wallet,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import {
  formatMoneyCompact,
  formatMoneyFull,
  formatPercent,
  formatInstrumentsCompact,
  formatPeriodLong
} from '../../../utils/bankingFormatters';

interface ResumenTabProps {
  data?: any;
  onSelectTab?: (tab: string) => void;
  onSelectInstitution?: (bankName: string) => void;
}

const BANK_COLORS = [
  '#2563eb', // Banreservas / Blue 600
  '#0284c7', // Popular / Sky 600
  '#0d9488', // BHD / Teal 600
  '#f59e0b', // Santa Cruz / Amber 500
  '#e11d48', // Scotiabank / Rose 600
  '#6366f1', // APAP / Indigo 500
  '#8b5cf6', // Promerica / Purple 500
  '#ec4899', // BDI / Pink 500
  '#64748b'  // Otros
];

export const ResumenTab: React.FC<ResumenTabProps> = ({
  data: initialData,
  onSelectTab,
  onSelectInstitution
}) => {
  const [data, setData] = useState<any>(initialData || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/markets/banking/summary');
      if (!res.ok) throw new Error('Error al consultar resumen bancario');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.message || 'No se recibieron datos del sistema');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchSummary();
    } else {
      setData(initialData);
    }
  }, [initialData]);

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-[#0f172a] border border-slate-800 rounded-lg">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400 font-mono">Cargando métricas consolidadas del sistema bancario...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-xs flex items-center justify-between">
        <span>{error || 'No hay datos bancarios registrados aún.'}</span>
        <button
          onClick={fetchSummary}
          className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 rounded text-xs font-mono"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const topBanks = data.topBanks || [];
  const holders = data.holderDistribution || [];
  const momGrowth = data.momGrowthPct;
  const isMomPositive = momGrowth !== null && momGrowth >= 0;

  // Preparar datos para gráfica de Market Share
  const chartData = topBanks.map((b: any, index: number) => ({
    name: b.entidad,
    share: b.marketSharePct,
    balance: b.balance,
    color: BANK_COLORS[index % BANK_COLORS.length]
  }));

  // Calcular "Otras entidades" si la suma es menor a 100
  const topShareSum = topBanks.reduce((acc: number, b: any) => acc + (b.marketSharePct || 0), 0);
  if (topShareSum < 100) {
    chartData.push({
      name: 'Otras (35)',
      share: Number((100 - topShareSum).toFixed(2)),
      balance: data.totalSystemBalanceDop * ((100 - topShareSum) / 100),
      color: '#64748b'
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. SEIS KPI CARDS PRINCIPALES                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Captaciones Totales */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between" title={formatMoneyFull(data.totalSystemBalanceDop)}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Captaciones Totales</span>
            <Wallet size={14} className="text-cyan-400" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-cyan-400">
            {formatMoneyCompact(data.totalSystemBalanceDop)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">Cierre {formatPeriodLong(data.periodo)}</span>
        </div>

        {/* KPI 2: Crecimiento Mensual */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Crecimiento MoM</span>
            {isMomPositive ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-rose-400" />}
          </div>
          <div className={`font-mono text-lg md:text-xl font-bold ${isMomPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {momGrowth !== null ? `${isMomPositive ? '+' : ''}${momGrowth}%` : 'N/D'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">vs. mes anterior</span>
        </div>

        {/* KPI 3: Dolarización DSI */}
        <div
          className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-500/40 transition-all"
          onClick={() => onSelectTab && onSelectTab('DOLARIZACION')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Dolarización DSI</span>
            <Coins size={14} className="text-emerald-400" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-emerald-400">
            {formatPercent(data.dollarizationIndex?.dsiPct)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">Depósitos USD en DOP</span>
        </div>

        {/* KPI 4: Total Instrumentos */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Instrumentos</span>
            <Users size={14} className="text-indigo-400" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-slate-200">
            {formatInstrumentsCompact(data.totalInstruments)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">Cuentas y certificados</span>
        </div>

        {/* KPI 5: Tasa Pasiva Ponderada */}
        <div
          className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-500/40 transition-all"
          onClick={() => onSelectTab && onSelectTab('RENDIMIENTOS')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Tasa Ponderada</span>
            <Percent size={14} className="text-amber-400" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-amber-400">
            {formatPercent(data.systemWeightedYieldPct)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">Costo pasivo medio</span>
        </div>

        {/* KPI 6: Entidades */}
        <div
          className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between cursor-pointer hover:border-cyan-500/40 transition-all"
          onClick={() => onSelectTab && onSelectTab('INSTITUCIONES')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Instituciones</span>
            <Building2 size={14} className="text-cyan-400" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-slate-100">
            40
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">Entidades SB supervisadas</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GRÁFICA DE MARKET SHARE + TABLA TOP INSTITUCIONES                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfica de Cuota de Mercado (Top Entidades) */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <PieIcon size={15} className="text-cyan-400" />
                Concentración del Ahorro Bancario
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Market Share (%)</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Participación porcentual sobre el balance total de depósitos del sistema
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 25, left: 45, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 45]} unit="%" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={85} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                    formatter={(val: any, _name: any, item: any) => [`${val}% (${formatMoneyCompact(item.payload.balance)})`, 'Cuota']}
                  />
                  <Bar dataKey="share" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Top 3 bancos concentran: <strong className="text-slate-100 font-mono">71.98%</strong></span>
            {onSelectTab && (
              <button
                onClick={() => onSelectTab('INSTITUCIONES')}
                className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-xs cursor-pointer"
              >
                Explorador completo <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Top Instituciones */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Building2 size={15} className="text-cyan-400" />
                Principales Instituciones por Captaciones
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Cierre {formatPeriodLong(data.periodo)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Institución</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2 text-right">Balance</th>
                    <th className="py-2 px-2 text-right">Market Share</th>
                    <th className="py-2 px-2 text-right">Tasa Ponderada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {topBanks.map((b: any, index: number) => (
                    <tr
                      key={b.entidad}
                      onClick={() => onSelectInstitution && onSelectInstitution(b.entidad)}
                      className="hover:bg-slate-800/40 cursor-pointer group transition-colors"
                      title={`Ver ficha detallada de ${b.entidad}`}
                    >
                      <td className="py-2.5 px-2 text-slate-400 font-bold">{index + 1}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {b.entidad}
                      </td>
                      <td className="py-2.5 px-2 text-slate-400 text-[11px]">{b.tipoEntidad}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-cyan-400 font-bold">
                        {formatMoneyCompact(b.balance)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(b.marketSharePct * 2.5, 100)}%` }} />
                          </div>
                          <span className="text-slate-200 font-bold">{b.marketSharePct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right text-amber-400 font-semibold">
                        {formatPercent(b.weightedYieldPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Haz clic en cualquier entidad para abrir su ficha regulatoria</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={13} /> Fuente: SB v2
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DISTRIBUCIÓN PERSONA FÍSICA VS JURÍDICA                               */}
      {/* ========================================================================= */}
      {holders.length > 0 && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Users size={15} className="text-indigo-400" />
                Distribución por Tipo de Titular
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Participación de depósitos entre personas físicas y jurídicas a nivel nacional
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Total: {formatMoneyCompact(data.totalSystemBalanceDop)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holders.map((h: any) => {
              const isFisica = h.persona.toLowerCase().includes('física');
              return (
                <div key={h.persona} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-slate-200">{h.persona}</span>
                    <span className={`text-base font-bold font-mono ${isFisica ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {h.sharePct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full ${isFisica ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                      style={{ width: `${h.sharePct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>Balance: <strong className="text-slate-200">{formatMoneyCompact(h.balance)}</strong></span>
                    <span>Instrumentos: <strong className="text-slate-200">{formatInstrumentsCompact(h.instruments)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
