/**
 * ============================================================================
 * RENDIMIENTOS TAB // SISTEMA BANCARIO
 * Passive interest yield rankings by currency (DOP/USD/EUR) with risk disclaimers
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Percent,
  TrendingUp,
  AlertTriangle,
  Coins,
  ShieldAlert,
  ArrowUpDown,
  Search,
  Building2,
  HelpCircle
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
import { apiFetch } from '../../../../../shared/utils/apiFetch';
import {
  formatPercent,
  formatMoneyCompact,
  formatMoneyFull,
  formatInstrumentsCompact,
  formatPeriodLong
} from '../../../utils/bankingFormatters';

interface RendimientosTabProps {
  onSelectBank?: (bank: string) => void;
}

export const RendimientosTab: React.FC<RendimientosTabProps> = ({ onSelectBank }) => {
  const [currency, setCurrency] = useState<'DOP' | 'USD' | 'EUR'>('DOP');
  const [yields, setYields] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [period, setPeriod] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const fetchYields = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/markets/banking/yields?currency=${currency}`).then(r => r.json());
        if (isMounted && res?.success) {
          setYields(res.data || []);
          if (res.periodo) setPeriod(res.periodo);
        }
      } catch (err) {
        console.warn('[RendimientosTab] Error al cargar rendimientos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchYields();
    return () => { isMounted = false; };
  }, [currency]);

  // Filtrado
  const filtered = yields.filter((item: any) => {
    const matchesSearch = item.entidad.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || item.tipoEntidad === filterType;
    return matchesSearch && matchesType;
  });

  // Top 10 para gráfica comparativa
  const top10Chart = filtered.slice(0, 10).map((item: any) => ({
    name: item.entidad,
    yield: item.weightedYieldPct,
    balance: item.totalBalance
  }));

  // Obtener tipos de entidad únicos
  const entityTypes = Array.from(new Set(yields.map(y => y.tipoEntidad)));

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SELECTOR DE DIVISA Y AVISO LEGAL RIGUROSO                              */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-neutral-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        {/* Toggle de Moneda */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setCurrency('DOP')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              currency === 'DOP'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🇩🇴</span> Pesos (DOP)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              currency === 'USD'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🇺🇸</span> Dólares (USD)
          </button>
          <button
            onClick={() => setCurrency('EUR')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              currency === 'EUR'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🇪🇺</span> Euros (EUR)
          </button>
        </div>

        {period && (
          <div className="text-xs text-slate-500 font-mono">
            Período Regulatorio: <strong className="text-slate-800 dark:text-slate-200">{formatPeriodLong(period)}</strong>
          </div>
        )}
      </div>

      {/* Banner de Advertencia Legal y Metodológica Obligatoria */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">Criterio Financiero y Advertencia de Riesgo:</strong>
          <span>
            Una mayor tasa pasiva observada no implica necesariamente menor riesgo crediticio de la institución ni que todos sus productos de ahorro ofrezcan este rendimiento. Corresponde al promedio ponderado por balance reportado oficialmente a la Superintendencia de Bancos. El volumen de captaciones no debe utilizarse como indicador de solvencia.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GRÁFICA COMPARATIVA TOP 10 TASAS PONDERADAS                            */}
      {/* ========================================================================= */}
      <div className="bg-white/80 dark:bg-neutral-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Percent size={16} className="text-blue-500" />
              Mayor Tasa Pasiva Ponderada Observada ({currency})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparativa de las 10 entidades con mayor tasa promedio pagada a depositantes
            </p>
          </div>
        </div>

        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10Chart} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} interval={0} angle={-25} textAnchor="end" />
              <YAxis unit="%" tick={{ fontSize: 10, fill: '#888' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                formatter={(val: any, _name: any, item: any) => [`${val}% (Balance: ${formatMoneyCompact(item.payload.balance, currency === 'DOP' ? 'RD$' : currency)})`, 'Tasa Ponderada']}
              />
              <Bar dataKey="yield" fill={currency === 'USD' ? '#10b981' : currency === 'EUR' ? '#6366f1' : '#3b82f6'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTROS Y TABLA COMPLETA DE RANKING                                    */}
      {/* ========================================================================= */}
      <div className="bg-white/80 dark:bg-neutral-800/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Barra de Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar institución..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Tipo:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white cursor-pointer"
            >
              <option value="ALL">Todos los tipos</option>
              {entityTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla de Ranking */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 text-[10px] uppercase font-mono">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Institución</th>
                <th className="py-2.5 px-3">Tipo Entidad</th>
                <th className="py-2.5 px-3 text-right">Tasa Ponderada</th>
                <th className="py-2.5 px-3 text-right">Rango Observado (Mín - Máx)</th>
                <th className="py-2.5 px-3 text-right">Balance en {currency}</th>
                <th className="py-2.5 px-3 text-right">Instrumentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
              {filtered.map((item: any) => (
                <tr
                  key={item.entidad}
                  onClick={() => onSelectBank && onSelectBank(item.entidad)}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer group transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-400">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${item.rank <= 3 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500'}`}>
                      {item.rank}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                    {item.entidad}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px]">{item.tipoEntidad}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                    {formatPercent(item.weightedYieldPct)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500 text-[11px]">
                    {formatPercent(item.minTasaPct)} – {formatPercent(item.maxTasaPct)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                    {formatMoneyCompact(item.totalBalance, currency === 'DOP' ? 'RD$' : currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {formatInstrumentsCompact(item.totalInstruments)}
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
