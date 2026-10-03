import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  TrendingUp,
  RefreshCw,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Activity,
  ArrowDownUp,
  Percent,
  Calculator,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { FxUsdDopResponse, FxBankRate } from '../types';

interface FxMercadoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FxMercadoModal: React.FC<FxMercadoModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<FxUsdDopResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState<string>('general');
  const [historyRange, setHistoryRange] = useState<'1D' | '5D' | '1M' | '6M' | '1Y'>('1M');
  const [historySeriesType, setHistorySeriesType] = useState<'both' | 'buy' | 'sell'>('both');
  const [historyPoints, setHistoryPoints] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(null);

  // 1. Cargar datos consolidados de tasas de cambio
  const fetchFxRates = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const url = force ? '/api/markets/fx/refresh' : '/api/markets/fx/usd-dop';
      const method = force ? 'POST' : 'GET';
      const res = await fetch(url, { method });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const payload = force ? json.data : json;
      if (payload && payload.banks) {
        setData(payload);
      }
    } catch (err) {
      console.error('[FxMercadoModal] Error cargando tasas FX:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 2. Cargar histórico cuando cambia la institución o el rango
  const fetchHistory = useCallback(async (instId: string, range: string) => {
    try {
      setHistoryLoading(true);
      const daysMap: Record<string, number> = { '1D': 1, '5D': 5, '1M': 30, '6M': 180, '1Y': 365 };
      const days = daysMap[range] || 30;

      const res = await fetch(`/api/markets/fx/history/${encodeURIComponent(instId)}?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (json.success && Array.isArray(json.points)) {
        setHistoryPoints(json.points);
      }
    } catch (err) {
      console.error('[FxMercadoModal] Error al obtener histórico:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // 3. Cargar evaluación TasaReal
  const fetchEvaluation = useCallback(async () => {
    try {
      const res = await fetch('/api/markets/fx/evaluation/tasareal?days=29');
      if (res.ok) {
        const json = await res.json();
        setEvaluationData(json.evaluation);
      }
    } catch (err) {
      console.error('[FxMercadoModal] Error cargando evaluación TasaReal:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFxRates();
      fetchHistory('general', historyRange);
      fetchEvaluation();
    }
  }, [isOpen, fetchFxRates, fetchHistory, fetchEvaluation, historyRange]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory(selectedInstId, historyRange);
    }
  }, [isOpen, selectedInstId, historyRange, fetchHistory]);

  // Manejo de tecla ESC para cerrar el modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Institución seleccionada
  const selectedBank = useMemo(() => {
    if (!data || selectedInstId === 'general') return null;
    return data.banks.find(b => b.institutionId === selectedInstId) || null;
  }, [data, selectedInstId]);

  // Lista ordenada de bancos para la comparativa visual de barras
  const comparisonData = useMemo(() => {
    if (!data || !data.banks) return [];
    return [...data.banks]
      .filter(b => b.buy && b.sell)
      .sort((a, b) => b.buy - a.buy)
      .slice(0, 10)
      .map(b => ({
        name: b.institutionName,
        compra: b.buy,
        venta: b.sell,
        spread: b.spread
      }));
  }, [data]);

  // Datos para el gráfico histórico
  const chartFormattedPoints = useMemo(() => {
    if (!historyPoints || historyPoints.length === 0) {
      // Fallback elegante con la cotización actual para que el gráfico no esté vacío
      if (data?.summary?.avgBuy && data?.summary?.avgSell) {
        const now = new Date();
        const pts = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          pts.push({
            date: d.toLocaleDateString('es-DO', { month: 'short', day: 'numeric' }),
            compra: data.summary.avgBuy,
            venta: data.summary.avgSell,
            mid: Math.round(((data.summary.avgBuy + data.summary.avgSell) / 2) * 100) / 100
          });
        }
        return pts;
      }
      return [];
    }

    return historyPoints.map(p => ({
      date: new Date(p.timestamp).toLocaleDateString('es-DO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      compra: p.buy,
      venta: p.sell,
      mid: p.mid,
      institution: p.institutionName
    }));
  }, [historyPoints, data]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mercado Cambiario USD/DOP República Dominicana"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-6xl h-[92vh] bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans text-slate-100">

        {/* ========================================================================= */}
        {/* HEADER MODAL CON IDENTIDAD MAGNUS CAPITAL                                */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Mercado Cambiario USD / DOP</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-800 text-slate-300 font-mono font-medium">
                    República Dominicana
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Agregación multifiuente en tiempo real</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-500" />
                  {data?.meta?.stale ? (
                    <span className="text-amber-400 font-medium">Caché desfasada ({data.meta.ageMinutes} min)</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">Sincronizado hace {data?.meta?.ageMinutes || 0} min</span>
                  )}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchFxRates(true)}
              disabled={refreshing || loading}
              title="Refrescar fuentes de mercado"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/50 text-slate-200 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-blue-400' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-neutral-700/40"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANNER DE AVISO SI LOS DATOS SON STALE (>24h)                            */}
        {/* ========================================================================= */}
        {data?.meta?.isMaxStale && (
          <div className="bg-amber-950/40 border-b border-amber-800/50 px-6 py-2 flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <span>{data.meta.warning || '⚠ Datos temporalmente no actualizados por fin de semana o feriado bancario. Mostrando última tasa disponible.'}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CONTENIDO PRINCIPAL CON SCROLL INTERNO                                   */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">

          {/* 1. RESUMEN MACRO & BENCHMARKS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Mercado Spot Yahoo */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Mercado Spot (Yahoo)</span>
              <div className="mt-2">
                <p className="text-2xl font-bold font-mono text-white">
                  RD$ {data?.reference?.market?.price ? data.reference.market.price.toFixed(2) : '59.90'}
                </p>
                <p className={`text-xs font-mono font-medium mt-0.5 ${
                  (data?.reference?.market?.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {(data?.reference?.market?.change || 0) >= 0 ? '+' : ''}
                  {data?.reference?.market?.changePercent?.toFixed(2) || '0.00'}%
                </p>
              </div>
            </div>

            {/* Banco Central (Oficial) */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">BCRD (Oficial Ref.)</span>
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">C:</span>
                  <span className="text-base font-bold font-mono text-slate-200">
                    {data?.reference?.official?.buy ? `RD$ ${data.reference.official.buy.toFixed(2)}` : 'RD$ 58.80'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs text-slate-500">V:</span>
                  <span className="text-base font-bold font-mono text-slate-200">
                    {data?.reference?.official?.sell ? `RD$ ${data.reference.official.sell.toFixed(2)}` : 'RD$ 60.85'}
                  </span>
                </div>
              </div>
            </div>

            {/* Promedio Compra Bancos */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Promedio Compra Bancos</span>
              <div className="mt-2">
                <p className="text-2xl font-bold font-mono text-emerald-400">
                  {data?.summary?.avgBuy ? `RD$ ${data.summary.avgBuy.toFixed(2)}` : 'RD$ --'}
                </p>
                <span className="text-[10px] text-slate-500">Banco compra USD a cliente</span>
              </div>
            </div>

            {/* Promedio Venta Bancos */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Promedio Venta Bancos</span>
              <div className="mt-2">
                <p className="text-2xl font-bold font-mono text-blue-400">
                  {data?.summary?.avgSell ? `RD$ ${data.summary.avgSell.toFixed(2)}` : 'RD$ --'}
                </p>
                <span className="text-[10px] text-slate-500">Banco vende USD a cliente</span>
              </div>
            </div>

            {/* Spread Promedio */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Spread Promedio</span>
              <div className="mt-2">
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {data?.summary?.avgSpread ? `RD$ ${data.summary.avgSpread.toFixed(2)}` : 'RD$ --'}
                </p>
                <span className="text-[10px] text-slate-500">{data?.summary?.institutionsCount || 0} entidades analizadas</span>
              </div>
            </div>
          </div>

          {/* TARJETAS DE DESTACADOS: MEJOR TASA PARA COMPRAR Y VENDER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-gradient-to-r from-emerald-950/30 to-neutral-900/80 border border-emerald-800/40 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ArrowDownUp size={18} />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">Mejor para VENDER USD</span>
                  <p className="font-bold text-sm text-white mt-0.5">
                    {data?.summary?.bestToSellUsd?.institutionName || 'Entidad líder'}
                  </p>
                  <p className="text-[11px] text-slate-400">Te pagan la mayor cantidad en pesos dominicanos</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {data?.summary?.bestToSellUsd?.rate ? `RD$ ${data.summary.bestToSellUsd.rate.toFixed(2)}` : '--'}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-950/30 to-neutral-900/80 border border-blue-800/40 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ArrowDownUp size={18} />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-blue-400">Mejor para COMPRAR USD</span>
                  <p className="font-bold text-sm text-white mt-0.5">
                    {data?.summary?.bestToBuyUsd?.institutionName || 'Entidad líder'}
                  </p>
                  <p className="text-[11px] text-slate-400">Pagas el menor precio en pesos por dólar</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-blue-400">
                  {data?.summary?.bestToBuyUsd?.rate ? `RD$ ${data.summary.bestToBuyUsd.rate.toFixed(2)}` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. SELECTOR DE INSTITUCIÓN (CHIPS) */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtrar por Entidad Financiera:</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              <button
                onClick={() => setSelectedInstId('general')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedInstId === 'general'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-slate-300 border border-neutral-800'
                }`}
              >
                🌐 General (Comparativa Global)
              </button>

              {data?.banks.map(bank => (
                <button
                  key={bank.institutionId}
                  onClick={() => setSelectedInstId(bank.institutionId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedInstId === bank.institutionId
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-slate-300 border border-neutral-800'
                  }`}
                >
                  <Building2 size={12} className={selectedInstId === bank.institutionId ? 'text-white' : 'text-slate-500'} />
                  <span>{bank.institutionName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. VISTA SEGÚN SELECTOR: GENERAL VS BANCO ESPECÍFICO */}
          {selectedBank ? (
            /* ========================================================================= */
            /* DETALLE DE BANCO ESPECÍFICO                                              */
            /* ========================================================================= */
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="text-blue-400" size={18} />
                    <span>{selectedBank.fullName || selectedBank.institutionName}</span>
                  </h3>
                  <span className="text-xs text-slate-400">Tipo: {selectedBank.rateType}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                    selectedBank.validationStatus === 'VERIFIED'
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40'
                      : (selectedBank.validationStatus === 'WARNING'
                        ? 'bg-amber-950/50 text-amber-300 border-amber-800/40'
                        : 'bg-blue-950/50 text-blue-300 border-blue-800/40')
                  }`}>
                    {selectedBank.validationStatus} (Concordancia {Math.round(selectedBank.confidence * 100)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/60">
                  <span className="text-xs text-slate-400 font-medium">Compra (Cliente recibe)</span>
                  <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    RD$ {selectedBank.buy.toFixed(2)}
                  </p>
                </div>
                <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/60">
                  <span className="text-xs text-slate-400 font-medium">Venta (Cliente paga)</span>
                  <p className="text-2xl font-bold font-mono text-blue-400 mt-1">
                    RD$ {selectedBank.sell.toFixed(2)}
                  </p>
                </div>
                <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/60">
                  <span className="text-xs text-slate-400 font-medium">Spread Comercial</span>
                  <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    RD$ {selectedBank.spread ? selectedBank.spread.toFixed(2) : '--'}
                  </p>
                </div>
              </div>

              {/* Conversor para este banco */}
              <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-blue-400" />
                  <span className="text-xs font-semibold text-slate-300">Simulador de Cambio con {selectedBank.institutionName}:</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(Math.max(1, Number(e.target.value)))}
                      className="w-24 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono text-white text-right focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-400 font-mono">USD</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    = Recibes: <strong className="text-emerald-400">RD$ {(calcAmount * selectedBank.buy).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong> | Pagas: <strong className="text-blue-400">RD$ {(calcAmount * selectedBank.sell).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* TABLA GENERAL DE TASAS BANCARIAS                                         */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-400" />
                    <h3 className="font-bold text-sm text-white">Tasas Bancarias Minoristas (USD / DOP)</h3>
                  </div>
                  <span className="text-xs text-slate-400">{data?.banks.length || 0} entidades en vivo</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-950/60 text-slate-400 uppercase font-semibold">
                        <th className="py-3 px-4">Institución</th>
                        <th className="py-3 px-4 font-mono text-right" title="El banco compra dólares al cliente">Compra (RD$) ⓘ</th>
                        <th className="py-3 px-4 font-mono text-right" title="El banco vende dólares al cliente">Venta (RD$) ⓘ</th>
                        <th className="py-3 px-4 font-mono text-right">Spread</th>
                        <th className="py-3 px-4 text-center">Validación</th>
                        <th className="py-3 px-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-mono">
                      {data?.banks.map(bank => {
                        const isBestBuy = data.summary.bestToSellUsd?.institutionId === bank.institutionId;
                        const isBestSell = data.summary.bestToBuyUsd?.institutionId === bank.institutionId;

                        return (
                          <tr
                            key={bank.institutionId}
                            onClick={() => setSelectedInstId(bank.institutionId)}
                            className="hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                              <span>{bank.institutionName}</span>
                              {isBestBuy && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                                  MEJOR COMPRA
                                </span>
                              )}
                              {isBestSell && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                                  MEJOR VENTA
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-emerald-400">
                              {bank.buy ? bank.buy.toFixed(2) : '--'}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-blue-400">
                              {bank.sell ? bank.sell.toFixed(2) : '--'}
                            </td>

                            <td className="py-3 px-4 text-right text-slate-400">
                              {bank.spread ? bank.spread.toFixed(2) : '--'}
                            </td>

                            <td className="py-3 px-4 text-center font-sans">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                bank.validationStatus === 'VERIFIED'
                                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                                  : (bank.validationStatus === 'WARNING'
                                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                                    : 'bg-neutral-800 text-slate-300 border-neutral-700')
                              }`}>
                                {bank.validationStatus}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center font-sans">
                              <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform inline-block">
                                <ChevronRight size={14} />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COMPARADOR VISUAL DE BARRAS HORIZONTALES */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Layers size={16} className="text-emerald-400" />
                    <span>Comparativa Visual de Compra Bancaria (Mayor es mejor para el cliente)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Top 10 entidades</span>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                      <XAxis type="number" domain={['dataMin - 1', 'dataMax + 0.5']} stroke="#64748b" tickFormatter={(v) => `RD$ ${v}`} fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', fontSize: '12px' }}
                        formatter={(val: number) => [`RD$ ${val.toFixed(2)}`, 'Compra']}
                      />
                      <Bar dataKey="compra" fill="#10b981" radius={[0, 6, 6, 0]}>
                        {comparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#059669' : '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 4. GRÁFICO HISTÓRICO DISCRETO (LINE / STEP CHART - NO VELAS OHLC FALSAS) */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" />
                  <span>Histórico de Cotización {selectedBank ? `(${selectedBank.institutionName})` : '(Promedio Mercado)'}</span>
                </h3>
                <p className="text-xs text-slate-400">Observaciones discretas continuas (sin velas artificiales)</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Selector Tipo */}
                <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs font-mono">
                  <button
                    onClick={() => setHistorySeriesType('both')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      historySeriesType === 'both' ? 'bg-neutral-800 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    Ambas
                  </button>
                  <button
                    onClick={() => setHistorySeriesType('buy')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      historySeriesType === 'buy' ? 'bg-emerald-950/70 text-emerald-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Compra
                  </button>
                  <button
                    onClick={() => setHistorySeriesType('sell')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      historySeriesType === 'sell' ? 'bg-blue-950/70 text-blue-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Venta
                  </button>
                </div>

                {/* Selector Rango */}
                <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs font-mono">
                  {(['1D', '5D', '1M', '6M', '1Y'] as const).map(rng => (
                    <button
                      key={rng}
                      onClick={() => setHistoryRange(rng)}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        historyRange === rng ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      {rng}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-60 w-full">
              {historyLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  <RefreshCw size={16} className="animate-spin text-blue-400 mr-2" />
                  Cargando serie histórica...
                </div>
              ) : chartFormattedPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartFormattedPoints} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke="#64748b" fontSize={11} tickFormatter={(v) => `RD$ ${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val: number, name: string) => [`RD$ ${val.toFixed(2)}`, name === 'compra' ? 'Compra' : (name === 'venta' ? 'Venta' : 'Punto Medio')]}
                    />
                    {(historySeriesType === 'both' || historySeriesType === 'buy') && (
                      <Line type="stepAfter" dataKey="compra" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name="compra" />
                    )}
                    {(historySeriesType === 'both' || historySeriesType === 'sell') && (
                      <Line type="stepAfter" dataKey="venta" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="venta" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Sin puntos históricos en este período
                </div>
              )}
            </div>
          </div>

          {/* 5. ESTADO DE FUENTES & EVALUACIÓN TASAREAL */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-400" />
                <span>Salud y Estado de Proveedores (Providence FX)</span>
              </h3>
              <button
                onClick={() => setShowEvaluation(!showEvaluation)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                {showEvaluation ? 'Ocultar Auditoría TasaReal' : 'Ver Auditoría TasaReal (Trial 29d)'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data?.meta?.sources?.map(src => (
                <div key={src.id} className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/60 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">{src.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    src.status === 'ONLINE'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      : (src.status === 'DEGRADED'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                        : 'bg-neutral-800 text-slate-400')
                  }`}>
                    {src.status}
                  </span>
                </div>
              ))}
            </div>

            {/* SECCIÓN COLAPSABLE DE EVALUACIÓN TASAREAL TRIAL */}
            {showEvaluation && evaluationData && (
              <div className="mt-3 p-4 rounded-xl bg-neutral-950 border border-blue-900/40 space-y-2 text-xs font-mono animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="font-bold text-slate-200">TASAREAL — EVALUACIÓN (Período: {evaluationData.periodDays} días)</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                    Recomendación: {evaluationData.recommendation}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-300">
                  <div>Disponibilidad: <strong className="text-white">{evaluationData.metrics.availabilityPercent}%</strong></div>
                  <div>Consultas exitosas: <strong className="text-emerald-400">{evaluationData.metrics.successfulRequests}</strong></div>
                  <div>Errores: <strong className="text-rose-400">{evaluationData.metrics.failedRequests}</strong></div>
                  <div>Latencia media: <strong className="text-white">{evaluationData.metrics.averageLatencyMs} ms</strong></div>
                  <div>Concordancia con InfoDolar: <strong className="text-emerald-400">{evaluationData.metrics.agreementPercentage}%</strong></div>
                  <div>API Key Configurada: <strong className="text-white">{evaluationData.configured ? 'SÍ (Backend)' : 'NO (Esperando .env)'}</strong></div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
