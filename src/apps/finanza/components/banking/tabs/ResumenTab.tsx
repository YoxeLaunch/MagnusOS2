/**
 * ============================================================================
 * RESUMEN TAB // SISTEMA BANCARIO
 * Executive overview of deposits, MoM growth, DSI, market share & holder mix
 * ============================================================================
 */

import React from 'react';
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
  Wallet
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
  data: any;
  onSelectTab: (tab: string) => void;
  onSelectBank?: (bankName: string) => void;
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

export const ResumenTab: React.FC<ResumenTabProps> = ({ data, onSelectTab, onSelectBank }) => {
  if (!data) return null;

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

  // Calcular "Otros bancos" si la suma es menor a 100
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
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SEIS KPI CARDS PRINCIPALES                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Captaciones Totales */}
        <div className="bg-white/90 dark:bg-neutral-800/60 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 shadow-xs flex flex-col justify-between" title={formatMoneyFull(data.totalSystemBalanceDop)}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Captaciones Totales</span>
            <Wallet size={14} className="text-blue-500" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-slate-900 dark:text-white">
            {formatMoneyCompact(data.totalSystemBalanceDop)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Total depósitos sistema</span>
        </div>

        {/* KPI 2: Crecimiento Mensual */}
        <div className="bg-white/90 dark:bg-neutral-800/60 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Crecimiento MoM</span>
            {isMomPositive ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
          </div>
          <div className={`font-mono text-lg md:text-xl font-bold ${isMomPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {momGrowth !== null ? `${isMomPositive ? '+' : ''}${momGrowth}%` : 'N/D'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">vs. mes anterior</span>
        </div>

        {/* KPI 3: Dolarización DSI */}
        <div className="bg-white/90 dark:bg-neutral-800/60 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => onSelectTab('dolarizacion')}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Dolarización DSI</span>
            <Coins size={14} className="text-amber-500" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-slate-900 dark:text-white">
            {formatPercent(data.dollarizationIndex?.dsiPct)}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">Depósitos en USD/EUR</span>
        </div>

        {/* KPI 4: Total Instrumentos */}
        <div className="bg-white/90 dark:bg-neutral-800/60 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Instrumentos</span>
            <Users size={14} className="text-indigo-500" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-slate-900 dark:text-white">
            {formatInstrumentsCompact(data.totalInstruments)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Cuentas y certificados</span>
        </div>

        {/* KPI 5: Tasa Pasiva Ponderada */}
        <div className="bg-white/90 dark:bg-neutral-800/60 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-cyan-500/30 transition-all" onClick={() => onSelectTab('rendimientos')}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Tasa Ponderada</span>
            <Percent size={14} className="text-cyan-500" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-slate-900 dark:text-white">
            {formatPercent(data.systemWeightedYieldPct)}
          </div>
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-1 font-medium">Rendimiento anual med</span>
        </div>

        {/* KPI 6: Entidades */}
        <div className="bg-white/90 dark:bg-neutral-800/60 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-500/30 transition-all" onClick={() => onSelectTab('instituciones')}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Instituciones</span>
            <Building2 size={14} className="text-blue-500" />
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-slate-900 dark:text-white">
            40
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Bancos y Asociaciones</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GRÁFICA DE MARKET SHARE + TABLA TOP INSTITUCIONES                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfica de Cuota de Mercado (Top Entidades) */}
        <div className="lg:col-span-5 bg-white/80 dark:bg-neutral-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <PieIcon size={16} className="text-blue-500" />
                Concentración del Ahorro Bancario
              </h3>
              <span className="text-[11px] font-mono text-slate-400">Market Share (%)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Participación porcentual sobre el balance total de depósitos
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 25, left: 45, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 45]} unit="%" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#888' }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
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

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
            <span>Top 3 bancos concentran: <strong className="text-slate-800 dark:text-white font-mono">71.98%</strong></span>
            <button onClick={() => onSelectTab('instituciones')} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer">
              Explorador <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Tabla de Top Instituciones */}
        <div className="lg:col-span-7 bg-white/80 dark:bg-neutral-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Building2 size={16} className="text-blue-500" />
                Principales Instituciones por Volumen
              </h3>
              <span className="text-[11px] font-mono text-slate-400">{formatPeriodLong(data.periodo)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 text-[10px] uppercase font-mono">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Institución</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2 text-right">Balance</th>
                    <th className="py-2 px-2 text-right">Market Share</th>
                    <th className="py-2 px-2 text-right">Tasa Ponderada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {topBanks.map((b: any, index: number) => (
                    <tr
                      key={b.entidad}
                      onClick={() => onSelectBank && onSelectBank(b.entidad)}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer group transition-colors"
                    >
                      <td className="py-2.5 px-2 font-mono text-slate-400 font-bold">{index + 1}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                        {b.entidad}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 text-[11px]">{b.tipoEntidad}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                        {formatMoneyCompact(b.balance)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-neutral-700 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(b.marketSharePct * 2.5, 100)}%` }} />
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{b.marketSharePct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPercent(b.weightedYieldPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>Haz clic en un banco para ver su ficha completa</span>
            <button onClick={() => onSelectTab('instituciones')} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer">
              Ver todas las 40 entidades <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DISTRIBUCIÓN POR TIPO DE PERSONA (FÍSICA VS JURÍDICA)                  */}
      {/* ========================================================================= */}
      <div className="bg-white/80 dark:bg-neutral-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
          <Users size={16} className="text-indigo-500" />
          Estructura de Titularidad: Personas Físicas vs. Jurídicas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {holders.map((h: any) => (
            <div key={h.persona} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {h.persona}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/30">
                  {h.sharePct}% del total
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Balance Total</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white" title={formatMoneyFull(h.balance)}>
                    {formatMoneyCompact(h.balance)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Instrumentos / Cuentas</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    {formatInstrumentsCompact(h.instruments)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
