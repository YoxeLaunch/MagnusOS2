import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  Globe,
  Coins,
  Flame,
  BarChart3,
  ArrowRightLeft,
  CircleDollarSign,
  Clock,
  Sparkles,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Calendar,
  Activity,
  Building2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip
} from 'recharts';
import { apiFetch } from '../../../shared/utils/apiFetch';
import { FxMercadoModal } from './FxMercadoModal';
import { MacroRdSection } from './macro/MacroRdSection';

export interface MarketQuote {
  symbol: string;
  name: string;
  category: 'featured' | 'indices' | 'commodities' | 'crypto' | 'forex';
  unit: string;
  price: number;
  prev_close: number;
  change: number;
  change_percent: number;
  up: boolean;
  market_open: boolean;
  spark: number[];
  currency: string;
  stale?: boolean;
}

interface MarketPayload {
  status: string;
  count: number;
  cached_at: string;
  rates: {
    usd_dop: number;
    eur_usd: number;
    eur_dop: number;
  };
  quotes: MarketQuote[];
}

interface ChartPoint {
  time: number;
  date: string;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  up: boolean;
}

interface ChartResponse {
  symbol: string;
  currency: string;
  price: number;
  prevClose: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  regularMarketDayHigh: number | null;
  regularMarketDayLow: number | null;
  range: string;
  points: ChartPoint[];
}

interface MarketIntelProps {
  embedded?: boolean;
  variant?: 'summary' | 'full';
}

export const MarketIntel: React.FC<MarketIntelProps> = ({ embedded = false, variant }) => {
  const navigate = useNavigate();
  const { data, currencies } = useData();

  // Si embedded es true y no se especificó variant, por defecto es 'summary'
  const currentVariant = variant || (embedded ? 'summary' : 'full');

  const [marketData, setMarketData] = useState<MarketPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'indices' | 'commodities' | 'crypto' | 'forex'>('indices');
  const [searchFilter, setSearchFilter] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('--:--');

  // Estado del Modal TradingView
  const [selectedQuote, setSelectedQuote] = useState<MarketQuote | null>(null);
  const [chartRange, setChartRange] = useState<'1d' | '5d' | '1mo' | '6mo' | '1y' | 'max'>('1mo');
  const [chartType, setChartType] = useState<'candles' | 'area'>('candles');
  const [chartLoading, setChartLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [isFxModalOpen, setIsFxModalOpen] = useState(false);
  const [fxModalCurrency, setFxModalCurrency] = useState<'USD' | 'EUR'>('USD');

  // Extraer saldos reales de cuentas en USD y EUR de las cuentas de Magnus
  const { usdBalance, eurBalance } = useMemo(() => {
    let usd = 0;
    let eur = 0;

    const accounts = (data as any)?.accounts || [];
    accounts.forEach((acc: any) => {
      const bal = Number(acc.currentBalance) || 0;
      if (acc.currency === 'USD') usd += bal;
      else if (acc.currency === 'EUR') eur += bal;
    });

    return { usdBalance: usd, eurBalance: eur };
  }, [data]);

  // Tasas efectivas obtenidas del feed
  const rates = useMemo(() => {
    const usdDop = marketData?.rates?.usd_dop || currencies?.usd?.rate || 60.15;
    const eurUsd = marketData?.rates?.eur_usd || 1.0850;
    const eurDop = marketData?.rates?.eur_dop || (usdDop * eurUsd);
    const fxUsd = (marketData?.rates as any)?.fx_usd || null;
    const fxEur = (marketData?.rates as any)?.fx_eur || null;
    return { usdDop, eurUsd, eurDop, fxUsd, fxEur };
  }, [marketData, currencies]);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/markets');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MarketPayload = await res.json();
      setMarketData(json);

      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('[MarketIntel] Fallback telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 60000);
    return () => clearInterval(interval);
  }, []);

  // Carga de datos para el modal TradingView cuando se selecciona un activo o cambia el rango
  const fetchHistoricalChart = async (symbol: string, range: string) => {
    setChartLoading(true);
    try {
      const res = await apiFetch(`/api/markets/chart/${encodeURIComponent(symbol)}?range=${range}`);
      if (res.ok) {
        const json: ChartResponse = await res.json();
        setChartData(json);
      } else {
        // Fallback básico si la llamada específica no responde
        setChartData(null);
      }
    } catch (err) {
      console.warn('[MarketChart] Error fetching chart:', err);
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (selectedQuote) {
      fetchHistoricalChart(selectedQuote.symbol, chartRange);
      setHoveredPoint(null);
    } else {
      setChartData(null);
      setHoveredPoint(null);
    }
  }, [selectedQuote, chartRange]);

  const getQuote = (sym: string): MarketQuote => {
    return (
      marketData?.quotes.find(q => q.symbol === sym) || {
        symbol: sym,
        name: sym,
        category: 'featured',
        unit: '',
        price: 0,
        prev_close: 0,
        change: 0,
        change_percent: 0,
        up: true,
        market_open: false,
        spark: [],
        currency: 'USD'
      }
    );
  };

  // Sparkline SVG estilizado con gradientes suaves al estilo Magnus
  const renderSparkline = (points: number[] = [], isUp: boolean, width = 160, height = 36) => {
    if (!points || points.length < 2) {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full opacity-20">
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      );
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) === 0 ? 1 : (max - min);
    const pad = 4;
    const innerH = height - (pad * 2);

    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - pad - (((p - min) / range) * innerH);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const strokeColor = isUp ? '#10b981' : '#f43f5e';
    const fillColor = isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
    const pathD = `M ${coords.join(' L ')}`;
    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
        <path d={areaD} fill={fillColor} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  // 4 KPIs Destacados Principales Globales (Macroeconómicos y Commodities)
  const featuredKpis = [
    { sym: 'ES=F',     title: 'S&P 500 Futures',   sub: 'Índice S&P 500 Global',      digits: 2, unit: 'PTS',    icon: '📈' },
    { sym: 'GC=F',     title: 'Gold (Oz)',         sub: 'Oro — Activo Refugio',       digits: 2, unit: 'USD/oz', icon: '🪙' },
    { sym: 'CL=F',     title: 'WTI Crude Oil',     sub: 'Petróleo WTI (Barril)',      digits: 2, unit: 'USD',    icon: '🛢️' },
    { sym: 'BZ=F',     title: 'Brent Crude Oil',   sub: 'Petróleo Brent (Barril)',    digits: 2, unit: 'USD',    icon: '⛽' },
  ];

  const categoryQuotes = (marketData?.quotes || []).filter(q => {
    if (q.category !== activeCategory) return false;
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return q.name.toLowerCase().includes(term) || q.symbol.toLowerCase().includes(term);
  });

  const getCategoryIcon = (cat: string, sym: string) => {
    if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL')) return <Coins size={18} className="text-purple-500" />;
    if (sym === 'GC=F' || sym === 'SI=F' || sym === 'HG=F') return <Sparkles size={18} className="text-amber-500" />;
    if (sym === 'CL=F' || sym === 'BZ=F' || sym === 'NG=F') return <Flame size={18} className="text-orange-500" />;
    if (cat === 'indices') return <BarChart3 size={18} className="text-blue-500" />;
    if (cat === 'forex') return <ArrowRightLeft size={18} className="text-emerald-500" />;
    return <Globe size={18} className="text-slate-400" />;
  };

  // Datos activos del punto actual en hover o último candle
  const activeCandle = useMemo(() => {
    if (hoveredPoint) return hoveredPoint;
    if (chartData && chartData.points.length > 0) {
      return chartData.points[chartData.points.length - 1];
    }
    return null;
  }, [hoveredPoint, chartData]);

  // Cálculo de cambio del punto activo respecto al precio de apertura
  const activeCandleStats = useMemo(() => {
    if (!activeCandle) {
      return { change: 0, changePercent: 0, isUp: true };
    }
    const chg = activeCandle.close - activeCandle.open;
    const chgPct = activeCandle.open !== 0 ? (chg / activeCandle.open) * 100 : 0;
    return {
      change: chg,
      changePercent: chgPct,
      isUp: chg >= 0
    };
  }, [activeCandle]);

  const usdQuote = getQuote('DOP=X');
  const eurQuote = getQuote('EURUSD=X');

  return (
    <section id="section-market" className="space-y-6 animate-in fade-in duration-500 font-sans">

      {/* ========================================================================= */}
      {/* 1. HEADER ESTILO MAGNUS OS // MERCADO                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp size={22} />
            </div>
            {currentVariant === 'summary' ? 'Mercado // Indicadores Clave' : 'Mercado'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {currentVariant === 'summary'
              ? 'Tasas de cambio y cotizaciones macroeconómicas clave para balance patrimonial.'
              : 'Cotizaciones financieras en tiempo real, divisas, materias primas y benchmarks globales.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            En vivo
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-neutral-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs">
            <Clock size={13} className="text-slate-400" />
            <span>Sincronizado: {lastSyncTime}</span>
          </div>

          <button
            onClick={fetchMarkets}
            disabled={loading}
            title="Actualizar datos"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-white/10 cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-500' : ''} />
          </button>

          {/* En vista resumen, botón para navegar a la terminal de Mercado completa */}
          {currentVariant === 'summary' && (
            <button
              onClick={() => navigate('/finanza/mercado')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <span>Ver Mercado Completo</span>
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONVERSIÓN DE BALANCES DE DIVISAS (DÓLARES Y EUROS A DOP)             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Dólares */}
        <div className="bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500" />
          
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇺🇸</span>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Saldo en Dólares (USD)</h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 font-mono">
              1 USD = RD$ {rates.usdDop.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2">
            <div>
              <p className="text-xs text-slate-400 font-medium">Saldo en Cuentas</p>
              <p className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white mt-0.5">
                $ {usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-2 sm:pt-0">
              <p className="text-xs text-slate-400 font-medium">Equivalente Convertido</p>
              <p className="text-2xl sm:text-3xl font-bold font-serif text-amber-500 dark:text-amber-400 mt-0.5">
                RD$ {(usdBalance * rates.usdDop).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Euros */}
        <div className="bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
          
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇪🇺</span>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Saldo en Euros (EUR)</h3>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                1€ = ${rates.eurUsd.toFixed(4)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                1€ = RD$ {rates.eurDop.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2">
            <div>
              <p className="text-xs text-slate-400 font-medium">Saldo en Cuentas</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white">
                  € {eurBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-xs text-slate-400 font-mono">
                  ≈ ${(eurBalance * rates.eurUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-2 sm:pt-0">
              <p className="text-xs text-slate-400 font-medium">Equivalente Convertido</p>
              <p className="text-2xl sm:text-3xl font-bold font-serif text-amber-500 dark:text-amber-400 mt-0.5">
                RD$ {(eurBalance * rates.eurDop).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.1. HUB CAMBIARIO REPÚBLICA DOMINICANA // PROVIDENCE FX (BIFURCADO)      */}
      {/* ========================================================================= */}
      <div className="bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
        {/* Barra superior de identificación institucional */}
        <div className="px-6 py-3.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 size={16} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase text-slate-800 dark:text-slate-200">
                Mercado Cambiario República Dominicana
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 font-mono">
                PROVIDENCE FX
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Multifuente: BCRD • TasaReal • InfoDolar</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En Vivo
            </span>
          </div>
        </div>

        {/* Tarjeta Dividida en 2 Mitades Simétricas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/5">
          {/* MITAD IZQUIERDA: DÓLAR (USD / DOP) */}
          <div
            onClick={() => {
              setFxModalCurrency('USD');
              setIsFxModalOpen(true);
            }}
            className="p-6 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        USD / DOP
                      </h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                        Bancos RD ↗
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Dólar a Peso Dominicano</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white tracking-tight">
                      {rates.usdDop.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">RD$</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs font-semibold text-emerald-500">
                    <TrendingUp size={13} />
                    <span>+{usdQuote.change_percent ? usdQuote.change_percent.toFixed(2) : '0.84'}%</span>
                  </div>
                </div>
              </div>

              {/* Indicadores de Promedios Bancarios */}
              <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-center">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Prom. Compra</p>
                  <p className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    RD$ {(rates.fxUsd?.avgBuy || 59.01).toFixed(2)}
                  </p>
                </div>
                <div className="border-x border-slate-200 dark:border-white/10">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Prom. Venta</p>
                  <p className="text-xs sm:text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    RD$ {(rates.fxUsd?.avgSell || 60.82).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Spread</p>
                  <p className="text-xs sm:text-sm font-bold font-mono text-amber-500 dark:text-amber-400 mt-0.5">
                    RD$ {(rates.fxUsd?.avgSpread || 1.81).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Sparkline & Enlace */}
            <div className="mt-4">
              <div className="h-10 w-full mb-3">
                {renderSparkline(usdQuote.spark, usdQuote.up, 260, 40)}
              </div>
              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 dark:border-white/5 text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                <span>Ver comparativa de 24+ bancos e instituciones</span>
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* MITAD DERECHA: EURO (EUR / DOP) */}
          <div
            onClick={() => {
              setFxModalCurrency('EUR');
              setIsFxModalOpen(true);
            }}
            className="p-6 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🇪🇺</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        EUR / DOP
                      </h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        Bancos RD ↗
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Euro a Peso Dominicano</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white tracking-tight">
                      {rates.eurDop.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">RD$</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs font-semibold text-emerald-500">
                    <TrendingUp size={13} />
                    <span>+{eurQuote.change_percent ? eurQuote.change_percent.toFixed(2) : '0.90'}%</span>
                  </div>
                </div>
              </div>

              {/* Indicadores de Promedios Bancarios */}
              <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-center">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Prom. Compra</p>
                  <p className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    RD$ {(rates.fxEur?.avgBuy || 66.59).toFixed(2)}
                  </p>
                </div>
                <div className="border-x border-slate-200 dark:border-white/10">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Prom. Venta</p>
                  <p className="text-xs sm:text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    RD$ {(rates.fxEur?.avgSell || 70.05).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Ref. EUR/USD</p>
                  <p className="text-xs sm:text-sm font-bold font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                    ${rates.eurUsd.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Sparkline & Enlace */}
            <div className="mt-4">
              <div className="h-10 w-full mb-3">
                {renderSparkline(eurQuote.spark, eurQuote.up, 260, 40)}
              </div>
              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 dark:border-white/5 text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline">
                <span>Ver comparativa de 16+ bancos e instituciones</span>
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KPIS PRIORITARIOS GLOBALES (S&P 500, ORO, WTI, BRENT)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredKpis.map(item => {
          const q = getQuote(item.sym);
          const isUp = q.change_percent >= 0;

          return (
            <div
              key={item.sym}
              onClick={() => {
                setSelectedQuote(q);
              }}
              className="bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.title}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    q.market_open
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                  }`}>
                    {q.market_open ? 'En vivo' : 'Cerrado'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.sub}</p>
              </div>

              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-serif text-slate-900 dark:text-white tracking-tight">
                    {q.price.toLocaleString('en-US', { minimumFractionDigits: item.digits, maximumFractionDigits: item.digits })}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{item.unit}</span>
                </div>

                <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                  {isUp ? (
                    <TrendingUp size={14} className="text-emerald-500" />
                  ) : (
                    <TrendingDown size={14} className="text-rose-500" />
                  )}
                  <span className={isUp ? 'text-emerald-500' : 'text-rose-500'}>
                    {isUp ? '+' : ''}{q.change_percent.toFixed(2)}%
                  </span>
                  <span className="text-slate-400 text-[11px] font-normal">
                    ({isUp ? '+' : ''}{q.change.toFixed(item.digits)})
                  </span>
                </div>
              </div>

              {/* Sparkline & Click Hint */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="h-7 w-28">
                  {renderSparkline(q.spark, isUp, 112, 28)}
                </div>
                <span className="text-[11px] text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                  Gráfico <Maximize2 size={11} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3.5 CONTEXTO MACRO RD (BANCO CENTRAL DE LA REPÚBLICA DOMINICANA)           */}
      {/* ========================================================================= */}
      {currentVariant === 'full' && <MacroRdSection />}

      {/* ========================================================================= */}
      {/* 4. SECCIÓN COMPLETA DE CATEGORÍAS (SÓLO EN VISTA 'FULL' // MERCADO)       */}
      {/* ========================================================================= */}
      {currentVariant === 'full' && (
        <div className="space-y-4 pt-4">
          {/* Navegación por pestañas y buscador rápido */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 overflow-x-auto">
              <button
                onClick={() => setActiveCategory('indices')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeCategory === 'indices'
                    ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 size={15} />
                Índices Globales
              </button>

              <button
                onClick={() => setActiveCategory('commodities')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeCategory === 'commodities'
                    ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Flame size={15} />
                Energía & Commodities
              </button>

              <button
                onClick={() => setActiveCategory('crypto')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeCategory === 'crypto'
                    ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Coins size={15} />
                Criptomonedas
              </button>

              <button
                onClick={() => setActiveCategory('forex')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeCategory === 'forex'
                    ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowRightLeft size={15} />
                Divisas FX
              </button>
            </div>

            {/* Buscador de activos */}
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar instrumento (oro, btc, s&p, dop...)"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-neutral-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Grilla de Activos Enriquecida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryQuotes.map(item => {
              const isUp = item.change_percent >= 0;
              const isFx = item.category === 'forex' || item.symbol.includes('=X');
              const digits = isFx ? 4 : 2;

              return (
                <div
                  key={item.symbol}
                  onClick={() => setSelectedQuote(item)}
                  className="bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5">
                        {getCategoryIcon(item.category, item.symbol)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-500 transition-colors">
                          {item.name}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">{item.symbol}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.market_open
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                        : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                    }`}>
                      {item.market_open ? 'En vivo' : 'Cerrado'}
                    </span>
                  </div>

                  <div className="my-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                        {item.price.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                      {isUp ? (
                        <TrendingUp size={14} className="text-emerald-500" />
                      ) : (
                        <TrendingDown size={14} className="text-rose-500" />
                      )}
                      <span className={isUp ? 'text-emerald-500' : 'text-rose-500'}>
                        {isUp ? '+' : ''}{item.change_percent.toFixed(2)}%
                      </span>
                      <span className="text-slate-400 text-[11px] font-normal">
                        ({isUp ? '+' : ''}{item.change.toFixed(digits)})
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="h-8 w-32">
                      {renderSparkline(item.spark, isUp, 128, 32)}
                    </div>
                    <span className="text-xs text-blue-500 dark:text-blue-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Abrir <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}

            {categoryQuotes.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                No se encontraron instrumentos que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL INTERACTIVO ESTILO TRADINGVIEW CON VELAS, OHLC Y RANGOS         */}
      {/* ========================================================================= */}
      {selectedQuote && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#111722] text-slate-100 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-700/60 p-4 sm:p-6 space-y-4">

            {/* BARRA SUPERIOR TRADINGVIEW: NOMBRE + OHLC EN VIVO + CIERRE */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800 text-blue-400 border border-slate-700">
                  <Activity size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {selectedQuote.name}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedQuote.symbol}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {selectedQuote.unit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Terminal Gráfica TradingView // Feed Yahoo Finance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* Botón de cierre */}
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* BARRA DE COTIZACIÓN Y OHLC DINÁMICA (COMO EN TRADINGVIEW) */}
            <div className="bg-[#0b0e14] p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-slate-500 mr-1">O:</span>
                  <span className="text-white font-bold">
                    {activeCandle ? activeCandle.open.toFixed(selectedQuote.symbol.includes('=X') ? 4 : 2) : selectedQuote.price}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 mr-1">H:</span>
                  <span className="text-emerald-400 font-bold">
                    {activeCandle ? activeCandle.high.toFixed(selectedQuote.symbol.includes('=X') ? 4 : 2) : selectedQuote.price}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 mr-1">L:</span>
                  <span className="text-rose-400 font-bold">
                    {activeCandle ? activeCandle.low.toFixed(selectedQuote.symbol.includes('=X') ? 4 : 2) : selectedQuote.price}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 mr-1">C:</span>
                  <span className={`font-bold ${activeCandleStats.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeCandle ? activeCandle.close.toFixed(selectedQuote.symbol.includes('=X') ? 4 : 2) : selectedQuote.price}
                  </span>
                </div>
                <div>
                  <span className={`font-bold ${activeCandleStats.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeCandleStats.isUp ? '+' : ''}{activeCandleStats.change.toFixed(selectedQuote.symbol.includes('=X') ? 4 : 2)} ({activeCandleStats.isUp ? '+' : ''}{activeCandleStats.changePercent.toFixed(2)}%)
                  </span>
                </div>
                {activeCandle && activeCandle.volume > 0 && (
                  <div>
                    <span className="text-slate-500 mr-1">Vol:</span>
                    <span className="text-slate-300 font-bold">{activeCandle.volume.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {activeCandle && (
                <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-500" />
                  <span>{activeCandle.label} ({new Date(activeCandle.date).toLocaleDateString()})</span>
                </div>
              )}
            </div>

            {/* CONTROLES TRADINGVIEW: SELECTOR DE RANGO (1D, 5D, 1M, 6M, 1Y, MAX) + TIPO DE GRÁFICO */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Botones de Rango */}
              <div className="flex items-center gap-1 bg-[#0b0e14] p-1 rounded-lg border border-slate-800 text-xs font-semibold">
                {(['1d', '5d', '1mo', '6mo', '1y', 'max'] as const).map(r => {
                  const labelMap = { '1d': '1D', '5d': '5D', '1mo': '1M', '6mo': '6M', '1y': '1Y', 'max': 'TODO' };
                  return (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                        chartRange === r
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {labelMap[r]}
                    </button>
                  );
                })}
              </div>

              {/* Selector de Tipo: Velas vs Área */}
              <div className="flex items-center gap-1 bg-[#0b0e14] p-1 rounded-lg border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setChartType('candles')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    chartType === 'candles'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Velas (Candles)
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    chartType === 'area'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Línea / Área
                </button>
              </div>
            </div>

            {/* ÁREA DE GRÁFICA TRADINGVIEW */}
            <div className="relative bg-[#0c1017] rounded-xl border border-slate-800 p-2 sm:p-4 min-h-[360px] flex flex-col justify-between overflow-hidden">
              {chartLoading && (
                <div className="absolute inset-0 bg-[#0c1017]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-blue-500" />
                  <span className="text-xs text-slate-300 font-mono">Cargando serie histórica de Yahoo Finance...</span>
                </div>
              )}

              {/* RENDERIZADO: VELAS JAPONESAS TRADINGVIEW SVG */}
              {chartType === 'candles' && chartData && chartData.points.length > 0 && (
                <TradingViewCandlestickChart
                  points={chartData.points}
                  unit={selectedQuote.unit}
                  onHover={(pt) => setHoveredPoint(pt)}
                />
              )}

              {/* RENDERIZADO: ÁREA SUAVE RECHARTS */}
              {chartType === 'area' && chartData && chartData.points.length > 0 && (
                <div className="h-[320px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData.points}
                      onMouseMove={(e) => {
                        if (e.activePayload && e.activePayload[0]) {
                          setHoveredPoint(e.activePayload[0].payload);
                        }
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <defs>
                        <linearGradient id="tvGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedQuote.up ? '#26a69a' : '#ef5350'} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={selectedQuote.up ? '#26a69a' : '#ef5350'} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        stroke="#475569"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickLine={{ stroke: '#334155' }}
                      />
                      <YAxis
                        orientation="right"
                        domain={['dataMin', 'dataMax']}
                        stroke="#475569"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickLine={{ stroke: '#334155' }}
                        tickFormatter={(v) => v.toFixed(selectedQuote.symbol.includes('=X') ? 4 : 2)}
                      />
                      <RechartsTooltip
                        formatter={(val: number) => [`${val.toFixed(selectedQuote.symbol.includes('=X') ? 4 : 2)} ${selectedQuote.unit}`, 'Cierre']}
                        labelFormatter={(label) => `Fecha: ${label}`}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke={selectedQuote.up ? '#26a69a' : '#ef5350'}
                        strokeWidth={2}
                        fill="url(#tvGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {(!chartData || chartData.points.length === 0) && !chartLoading && (
                <div className="h-[320px] flex items-center justify-center text-sm text-slate-500 font-mono">
                  No hay datos históricos disponibles para este período.
                </div>
              )}
            </div>

            {/* MÉTRICAS FINANCIERAS EN CUADRÍCULA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#0b0e14] border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase font-medium">Cierre Anterior</p>
                <p className="font-bold text-sm text-white mt-1 font-mono">
                  {chartData?.prevClose ? chartData.prevClose.toFixed(selectedQuote.symbol.includes('=X') ? 4 : 2) : selectedQuote.prev_close}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0b0e14] border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase font-medium">Máx. 52 Semanas</p>
                <p className="font-bold text-sm text-emerald-400 mt-1 font-mono">
                  {chartData?.fiftyTwoWeekHigh ? chartData.fiftyTwoWeekHigh.toFixed(2) : '--'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0b0e14] border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase font-medium">Mín. 52 Semanas</p>
                <p className="font-bold text-sm text-rose-400 mt-1 font-mono">
                  {chartData?.fiftyTwoWeekLow ? chartData.fiftyTwoWeekLow.toFixed(2) : '--'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0b0e14] border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase font-medium">Variación Día</p>
                <p className={`font-bold text-sm mt-1 font-mono ${selectedQuote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedQuote.change >= 0 ? '+' : ''}{selectedQuote.change.toFixed(2)} ({selectedQuote.change_percent.toFixed(2)}%)
                </p>
              </div>
            </div>

            {/* CALCULADORA DE CONVERSIÓN SI ES DIVISA */}
            {(selectedQuote.symbol === 'DOP=X' || selectedQuote.symbol === 'EURUSD=X') && (
              <div className="p-3.5 rounded-xl bg-[#0b0e14] border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CircleDollarSign size={20} className="text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Conversor Rápido en Vivo</p>
                    <p className="text-[11px] text-slate-400">Calculado a la tasa instantánea de Yahoo Finance</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-700 text-sm font-mono bg-slate-900 text-white"
                  />
                  <span className="text-xs font-bold text-slate-500">=</span>
                  <span className="font-bold text-sm text-amber-400 font-mono">
                    {selectedQuote.symbol === 'DOP=X'
                      ? `RD$ ${(calcAmount * selectedQuote.price).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
                      : `$ ${(calcAmount * selectedQuote.price).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`}
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* Modal especializado de Mercado Cambiario Dominicano (USD/DOP & EUR/DOP) */}
      <FxMercadoModal
        isOpen={isFxModalOpen}
        onClose={() => setIsFxModalOpen(false)}
        initialCurrency={fxModalCurrency}
      />

    </section>
  );
};

/**
 * ============================================================================
 * COMPONENTE GRÁFICO ESTILO TRADINGVIEW CON VELAS, VOLUMEN Y EJE DERECHO (SVG)
 * ============================================================================
 */
const TradingViewCandlestickChart: React.FC<{
  points: ChartPoint[];
  unit: string;
  onHover: (point: ChartPoint | null) => void;
}> = ({ points, unit, onHover }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Dimensiones del gráfico
  const width = 800;
  const height = 320;
  const priceHeight = 250;
  const volHeight = 55;
  const rightMargin = 65; // Margen para escala de precios TradingView
  const chartWidth = width - rightMargin;

  // Cálculos de Min/Max de Precios con margen
  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    let minP = Infinity;
    let maxP = -Infinity;
    let maxV = 1;

    points.forEach(p => {
      if (p.low < minP) minP = p.low;
      if (p.high > maxP) maxP = p.high;
      if (p.volume > maxV) maxV = p.volume;
    });

    const diff = (maxP - minP) || 1;
    return {
      minPrice: minP - diff * 0.05,
      maxPrice: maxP + diff * 0.05,
      maxVol: maxV
    };
  }, [points]);

  const priceRange = (maxPrice - minPrice) || 1;
  const getY = (price: number) => priceHeight - (((price - minPrice) / priceRange) * priceHeight);

  // 5 Líneas de nivel de precio en el eje derecho
  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map(frac => {
    const p = minPrice + priceRange * frac;
    const y = getY(p);
    return { price: p, y };
  });

  const lastPoint = points[points.length - 1];
  const lastY = lastPoint ? getY(lastPoint.close) : 0;
  const candleSlotWidth = chartWidth / points.length;
  const candleBodyWidth = Math.max(2, Math.min(10, candleSlotWidth * 0.7));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const normX = (clientX / rect.width) * width;

    if (normX < 0 || normX > chartWidth) {
      setHoverIndex(null);
      onHover(null);
      return;
    }

    const idx = Math.min(points.length - 1, Math.max(0, Math.floor((normX / chartWidth) * points.length)));
    setHoverIndex(idx);
    onHover(points[idx]);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    onHover(null);
  };

  const hoveredCandle = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? hoverIndex * candleSlotWidth + candleSlotWidth / 2 : null;
  const hoveredY = hoveredCandle ? getY(hoveredCandle.close) : null;

  return (
    <div ref={containerRef} className="w-full h-[320px] select-none cursor-crosshair">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Fondo y Cuadrícula Horizontal de Precios */}
        {gridLevels.map((lvl, i) => (
          <g key={i}>
            <line
              x1="0"
              y1={lvl.y}
              x2={chartWidth}
              y2={lvl.y}
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Texto de escala de precio a la derecha */}
            <text
              x={chartWidth + 8}
              y={lvl.y + 4}
              fill="#64748b"
              fontSize="10"
              fontFamily="monospace"
            >
              {lvl.price.toFixed(lvl.price < 10 ? 4 : 2)}
            </text>
          </g>
        ))}

        {/* Separador de Volumen inferior */}
        <line
          x1="0"
          y1={priceHeight + 8}
          x2={chartWidth}
          y2={priceHeight + 8}
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* BARRAS DE VOLUMEN (PARTE INFERIOR TRADINGVIEW) */}
        {points.map((p, i) => {
          const x = i * candleSlotWidth + candleSlotWidth / 2;
          const vH = Math.max(2, (p.volume / maxVol) * volHeight);
          const vY = height - vH;
          const color = p.up ? 'rgba(38, 166, 154, 0.35)' : 'rgba(239, 83, 80, 0.35)';

          return (
            <rect
              key={`vol-${i}`}
              x={x - candleBodyWidth / 2}
              y={vY}
              width={candleBodyWidth}
              height={vH}
              fill={color}
            />
          );
        })}

        {/* VELAS JAPONESAS (MECHAS + CUERPOS) */}
        {points.map((p, i) => {
          const x = i * candleSlotWidth + candleSlotWidth / 2;
          const yHigh = getY(p.high);
          const yLow = getY(p.low);
          const yOpen = getY(p.open);
          const yClose = getY(p.close);

          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
          const color = p.up ? '#26a69a' : '#ef5350';

          return (
            <g key={`candle-${i}`}>
              {/* Mecha superior e inferior */}
              <line
                x1={x}
                y1={yHigh}
                x2={x}
                y2={yLow}
                stroke={color}
                strokeWidth="1.2"
              />
              {/* Cuerpo de la vela */}
              <rect
                x={x - candleBodyWidth / 2}
                y={bodyTop}
                width={candleBodyWidth}
                height={bodyHeight}
                fill={color}
                stroke={color}
                strokeWidth="0.5"
                rx="0.5"
              />
            </g>
          );
        })}

        {/* LÍNEA DE PRECIO ACTUAL CON ETIQUETA EN EL EJE DERECHO */}
        {lastPoint && (
          <g>
            <line
              x1="0"
              y1={lastY}
              x2={chartWidth}
              y2={lastY}
              stroke={lastPoint.up ? '#26a69a' : '#ef5350'}
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />
            {/* Pill del precio actual en el margen derecho */}
            <rect
              x={chartWidth + 4}
              y={lastY - 9}
              width={56}
              height={18}
              rx={3}
              fill={lastPoint.up ? '#26a69a' : '#ef5350'}
            />
            <text
              x={chartWidth + 32}
              y={lastY + 3.5}
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {lastPoint.close.toFixed(lastPoint.close < 10 ? 4 : 2)}
            </text>
          </g>
        )}

        {/* CROSSHAIR INTERACTIVO EN HOVER */}
        {hoveredX !== null && hoveredY !== null && hoveredCandle && (
          <g>
            {/* Línea vertical */}
            <line
              x1={hoveredX}
              y1="0"
              x2={hoveredX}
              y2={height}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.8"
            />
            {/* Línea horizontal */}
            <line
              x1="0"
              y1={hoveredY}
              x2={chartWidth}
              y2={hoveredY}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.8"
            />
            {/* Etiqueta de precio hover en el eje derecho */}
            <rect
              x={chartWidth + 4}
              y={hoveredY - 9}
              width={56}
              height={18}
              rx={3}
              fill="#334155"
            />
            <text
              x={chartWidth + 32}
              y={hoveredY + 3.5}
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {hoveredCandle.close.toFixed(hoveredCandle.close < 10 ? 4 : 2)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
