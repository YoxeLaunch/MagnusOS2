import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Calculator,
  ArrowDownUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
  Landmark,
  ShieldCheck
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
  Cell,
  CartesianGrid
} from 'recharts';
import { FxRatesResponse, FxBankRate } from '../../../types';
import { FxCurrency } from '../types';

interface FxMarketPanelProps {
  activeCurrency: FxCurrency;
  data: FxRatesResponse | null;
  loading: boolean;
  onNavigateToForecast: () => void;
  onNavigateToRisk: () => void;
}

export const FxMarketPanel: React.FC<FxMarketPanelProps> = ({
  activeCurrency,
  data,
  loading,
  onNavigateToForecast,
  onNavigateToRisk
}) => {
  const [selectedInstId, setSelectedInstId] = useState<string>('bcrd');
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcDirection, setCalcDirection] = useState<'SELL_FX' | 'BUY_FX'>('SELL_FX');

  const selectedBank = React.useMemo(() => {
    if (!data || !data.banks) return null;
    if (selectedInstId === 'general') {
      return {
        institutionId: 'general',
        institutionName: 'Promedio de Mercado',
        fullName: 'Consenso Ponderado del Mercado Dominicano',
        rateType: 'MARKET_AVERAGE',
        buy: data.summary?.avgBuy || 0,
        sell: data.summary?.avgSell || 0,
        spread: data.summary?.avgSpread || 0,
        validationStatus: 'VERIFIED',
        confidence: 1.0
      };
    }
    if (selectedInstId === 'bcrd') {
      const buyRate = data?.reference?.official?.buy || (activeCurrency === 'EUR' ? 68.32 : 60.87);
      const sellRate = data?.reference?.official?.sell || (activeCurrency === 'EUR' ? 68.90 : 61.47);
      return {
        institutionId: 'bcrd',
        institutionName: 'Banco Central (BCRD)',
        fullName: 'Banco Central de la República Dominicana',
        rateType: 'OFFICIAL_REFERENCE',
        buy: buyRate,
        sell: sellRate,
        spread: +(sellRate - buyRate).toFixed(4),
        validationStatus: 'VERIFIED' as const,
        confidence: 1.0
      };
    }
    return (data.banks || []).find((b: FxBankRate) => b.institutionId === selectedInstId) || data.banks[0] || null;
  }, [data, selectedInstId, activeCurrency]);

  const comparisonData = React.useMemo(() => {
    if (!data || !data.banks) return [];
    return [...data.banks]
      .filter(b => b.buy && b.sell)
      .sort((a, b) => b.buy - a.buy)
      .slice(0, 8)
      .map(b => ({
        name: b.institutionName,
        compra: b.buy,
        venta: b.sell,
        spread: b.spread
      }));
  }, [data]);

  const calcConversion = React.useMemo(() => {
    if (!selectedBank) return { result: 0, rateUsed: 0, label: '' };
    if (calcDirection === 'SELL_FX') {
      const rate = selectedBank.buy;
      return {
        result: calcAmount * rate,
        rateUsed: rate,
        label: `Recibes en Pesos (RD$) vendiendo ${activeCurrency}`
      };
    } else {
      const rate = selectedBank.sell;
      return {
        result: rate > 0 ? calcAmount / rate : 0,
        rateUsed: rate,
        label: `Recibes en ${activeCurrency} pagando Pesos (RD$)`
      };
    }
  }, [selectedBank, calcAmount, calcDirection, activeCurrency]);

  return (
    <div className="space-y-6">
      {/* Banner de Acceso Rápido a Inteligencia Cuantitativa */}
      <div className="bg-gradient-to-r from-blue-950/40 via-neutral-900 to-cyan-950/30 border border-blue-800/40 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Centro de Inteligencia Cuantitativa Providence FX</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                NIVEL 3
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Accede a proyecciones ARIMA out-of-sample, estimación condicional de riesgo GARCH(1,1) y backtests históricos con zero lookahead.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateToForecast}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-950 cursor-pointer"
          >
            <span>Ver Pronósticos</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={onNavigateToRisk}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 font-semibold text-xs transition-all border border-neutral-700 cursor-pointer"
          >
            Análisis de Riesgo
          </button>
        </div>
      </div>

      {/* KPI Cards: Oficial vs Mercado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BCRD Oficial */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Landmark size={14} />
              TASA OFICIAL BCRD
            </span>
            <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-900/50">
              LEGAL
            </span>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-white">
              RD$ {data?.reference?.official?.buy ? data.reference.official.buy.toFixed(2) : '60.87'}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Compra Oficial de Referencia</span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-neutral-800 pt-1.5 flex justify-between">
            <span>Venta Oficial:</span>
            <span className="font-mono text-slate-200">
              RD$ {data?.reference?.official?.sell ? data.reference.official.sell.toFixed(2) : '61.47'}
            </span>
          </div>
        </div>

        {/* Promedio Mercado */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <Activity size={14} />
              PROMEDIO DE MERCADO
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {data?.summary?.institutionsCount || 10} entidades
            </span>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-white">
              RD$ {data?.summary?.avgBuy ? data.summary.avgBuy.toFixed(2) : '60.75'}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Compra Ponderada Mostrador</span>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-neutral-800 pt-1.5 flex justify-between">
            <span>Venta Promedio:</span>
            <span className="font-mono text-slate-200">
              RD$ {data?.summary?.avgSell ? data.summary.avgSell.toFixed(2) : '61.85'}
            </span>
          </div>
        </div>

        {/* Mejor Compra */}
        <div className="bg-neutral-900/80 border border-emerald-900/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ArrowDownUp size={14} />
              MEJOR PARA VENDER {activeCurrency}
            </span>
            <span className="text-[10px] font-mono text-emerald-300">MAX COMPRA</span>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-emerald-400">
              RD$ {data?.summary?.bestToSell?.rate ? data.summary.bestToSell.rate.toFixed(2) : '60.95'}
            </span>
            <span className="text-xs text-white font-medium block mt-0.5">
              {data?.summary?.bestToSell?.institutionName || 'Banco Popular'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 border-t border-neutral-800 pt-1.5 truncate">
            Te entrega la mayor cantidad de pesos
          </p>
        </div>

        {/* Mejor Venta */}
        <div className="bg-neutral-900/80 border border-blue-900/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <ArrowDownUp size={14} />
              MEJOR PARA COMPRAR {activeCurrency}
            </span>
            <span className="text-[10px] font-mono text-blue-300">MIN VENTA</span>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-blue-400">
              RD$ {data?.summary?.bestToBuy?.rate ? data.summary.bestToBuy.rate.toFixed(2) : '61.40'}
            </span>
            <span className="text-xs text-white font-medium block mt-0.5">
              {data?.summary?.bestToBuy?.institutionName || 'Banreservas'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 border-t border-neutral-800 pt-1.5 truncate">
            Pagas la menor cantidad de pesos
          </p>
        </div>
      </div>

      {/* Simulador Cambiario Bidireccional */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-blue-400" />
            <h3 className="font-bold text-sm text-white">
              Simulador Cambiario Operativo ({activeCurrency} ⇄ DOP)
            </h3>
          </div>
          <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setCalcDirection('SELL_FX')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                calcDirection === 'SELL_FX' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vender {activeCurrency} ({activeCurrency} ➔ DOP)
            </button>
            <button
              type="button"
              onClick={() => setCalcDirection('BUY_FX')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                calcDirection === 'BUY_FX' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Comprar {activeCurrency} (DOP ➔ {activeCurrency})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Monto a Convertir:</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={calcAmount}
                onChange={e => setCalcAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                {calcDirection === 'SELL_FX' ? activeCurrency : 'DOP'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Entidad de Cotización:</label>
            <select
              value={selectedInstId}
              onChange={e => setSelectedInstId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="bcrd">🏛 Banco Central (BCRD Oficial)</option>
              <option value="general">📊 Promedio de Mercado</option>
              {(data?.banks || []).map(b => (
                <option key={b.institutionId} value={b.institutionId}>
                  🏢 {b.institutionName} (C: {b.buy.toFixed(2)} | V: {b.sell.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">{calcConversion.label}</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {calcDirection === 'SELL_FX'
                  ? `RD$ ${calcConversion.result.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${calcConversion.result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${activeCurrency}`}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span>Tasa:</span>
              <span className="font-mono text-white block">RD$ {calcConversion.rateUsed.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparativa Gráfica de Entidades Financieras */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-400" />
            <h3 className="font-bold text-sm text-white">
              Cotizaciones Comerciales por Entidad ({activeCurrency}/DOP)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Top 8 entidades por tasa de compra</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke="#64748b" fontSize={10} tickFormatter={(v: number) => `RD$ ${v.toFixed(1)}`} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={90} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-neutral-900 border border-neutral-700 p-2.5 rounded-xl shadow-xl text-xs font-mono">
                      <p className="font-bold text-white mb-1">{item.name}</p>
                      <p className="text-emerald-400">Compra: RD$ {item.compra.toFixed(4)}</p>
                      <p className="text-blue-400">Venta: RD$ {item.venta.toFixed(4)}</p>
                      <p className="text-slate-400 text-[11px]">Diferencial (Spread): RD$ {item.spread.toFixed(4)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="compra" fill="#10b981" radius={[0, 4, 4, 0]} name="Compra" />
              <Bar dataKey="venta" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Venta" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
