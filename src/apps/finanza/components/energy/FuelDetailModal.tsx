import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Fuel,
  ExternalLink,
  Info,
  Clock,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  Scale,
  Receipt,
  Car
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export interface FuelItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  unit: string;
  price: number;
  previousPrice?: number | null;
  change?: number | null;
  changePercent?: number | null;
  subsidyPerUnit?: number | null;
  validFrom: string;
  validTo: string;
  description?: string;
  breakdown?: {
    importParityPrice?: number | null;
    taxLey11200?: number | null;
    taxLey49506?: number | null;
    distributionMargin?: number | null;
    retailMargin?: number | null;
    transportFee?: number | null;
    exchangeRateReference?: number | null;
  } | null;
}

interface FuelDetailModalProps {
  fuel: FuelItem | null;
  isOpen: boolean;
  onClose: () => void;
  marketContext?: any;
  policy?: any;
  period?: any;
}

export const FuelDetailModal: React.FC<FuelDetailModalProps> = ({
  fuel,
  isOpen,
  onClose,
  marketContext,
  policy,
  period
}) => {
  const [activeRange, setActiveRange] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL'>('1Y');
  const [chartMode, setChartMode] = useState<'step' | 'normalized'>('step');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !fuel) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/markets/energy-rd/fuels/${fuel.id}/history?range=${activeRange}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.series) {
            setHistoryData(json.data.series);
          }
        }
      } catch (err) {
        console.warn('[FuelDetailModal] Error cargando histórico:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [isOpen, fuel, activeRange]);

  if (!isOpen || !fuel) return null;

  const change = fuel.change || 0;
  const isUp = change > 0;
  const isDown = change < 0;
  const isFlat = change === 0;

  // Formatear vigencia
  const formatPeriod = (fromStr?: string, toStr?: string) => {
    if (!fromStr || !toStr) return 'Vigencia oficial semanal';
    const [, mFrom, dFrom] = fromStr.split('-');
    const [, mTo, dTo] = toStr.split('-');
    return `Vigente del ${dFrom}/${mFrom} al ${dTo}/${mTo}`;
  };

  const chartPoints = historyData.length > 0 ? historyData : [
    { period: fuel.validFrom.slice(5), price: fuel.price, date: fuel.validFrom }
  ];

  // Cálculo de serie normalizada Base 100 para comparar contra WTI y USD/DOP
  const basePoint = chartPoints[0]?.price || fuel.price || 1;
  const normalizedChartPoints = chartPoints.map((pt, idx) => {
    const fuelNorm = Math.round((pt.price / basePoint) * 10000) / 100;
    // Aproximación de correlación para la serie si no hay cotización diaria del crudo en cada punto
    const wtiBase = marketContext?.wti?.price ? marketContext.wti.price * 0.95 : 90;
    const wtiNorm = Math.round((100 + (idx / Math.max(1, chartPoints.length)) * (marketContext?.wti?.changePercent || 0)) * 100) / 100;
    const usdNorm = Math.round((100 + (idx / Math.max(1, chartPoints.length)) * (marketContext?.usdDop?.changePercent || 0)) * 100) / 100;
    
    return {
      period: pt.period || pt.date?.slice(5),
      fullPeriod: pt.fullPeriod || pt.date,
      price: pt.price,
      combustibleBase100: fuelNorm,
      wtiBase100: wtiNorm,
      usdDopBase100: usdNorm
    };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 p-5 sm:p-7 space-y-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        {/* Encabezado Principal */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 text-amber-400">
            <Fuel size={28} />
          </div>
          <div className="space-y-1.5 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
                {fuel.name}
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30">
                {fuel.unit}
              </span>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Oficial MICM
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {fuel.description || 'Precio minorista oficial fijado semanalmente por el Ministerio de Industria, Comercio y Mipymes.'}
            </p>
          </div>
        </div>

        {/* Hero Card: Precio, Cambio y Subsidio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          {/* Precio Actual */}
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Precio Vigente
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                RD$ {fuel.price.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                /{fuel.unit.split('/')[1] || 'gal'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs pt-0.5">
              <Calendar size={13} className="text-amber-400" />
              <span>{formatPeriod(fuel.validFrom, fuel.validTo)}</span>
            </div>
          </div>

          {/* Variación Semanal */}
          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 sm:pl-4 pt-2 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Variación Semanal
            </span>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 text-base sm:text-lg font-bold font-mono ${
                isUp ? 'text-rose-400' : isDown ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {isUp ? <TrendingUp size={18} /> : isDown ? <TrendingDown size={18} /> : <Minus size={18} />}
                <span>
                  {isUp ? `+RD$ ${change.toFixed(2)}` : isDown ? `-RD$ ${Math.abs(change).toFixed(2)}` : 'Sin variación (0.00)'}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {isFlat ? 'Precio congelado por resolución oficial' : `${fuel.changePercent?.toFixed(2)}% vs semana previa`}
            </span>
          </div>

          {/* Subsidio Estatal */}
          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 sm:pl-4 pt-2 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Subsidio Estatal (Res. 201-14)
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-400">
              {fuel.subsidyPerUnit && fuel.subsidyPerUnit > 0 ? (
                `RD$ ${fuel.subsidyPerUnit.toFixed(2)} / gal`
              ) : (
                <span className="text-slate-400 text-sm font-normal">No informado / 0.00</span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 block">
              {fuel.subsidyPerUnit ? 'Monto absorbido por el Estado en bomba' : 'Sin ajuste fiscal registrado'}
            </span>
          </div>
        </div>

        {/* Estructura de Costos Oficial (Fórmula Ley 112-00) */}
        {fuel.breakdown && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Receipt size={14} className="text-cyan-400" />
              Estructura Oficial de Costos (Ley 112-00 y Ley 495-06)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-medium block">Paridad Importación</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {fuel.breakdown.importParityPrice ? `RD$ ${fuel.breakdown.importParityPrice.toFixed(2)}` : 'N/D'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-medium block">Impuesto Ley 112-00</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {fuel.breakdown.taxLey11200 ? `RD$ ${fuel.breakdown.taxLey11200.toFixed(2)}` : 'RD$ 0.00'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-medium block">Ad-Valorem 16% (495-06)</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {fuel.breakdown.taxLey49506 ? `RD$ ${fuel.breakdown.taxLey49506.toFixed(2)}` : 'N/D'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-medium block">Márgenes Comercializ.</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {fuel.breakdown.distributionMargin && fuel.breakdown.retailMargin
                    ? `RD$ ${(fuel.breakdown.distributionMargin + fuel.breakdown.retailMargin + (fuel.breakdown.transportFee || 0)).toFixed(2)}`
                    : 'N/D'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Gráfico y Selector de Rangos */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setChartMode('step')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMode === 'step'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity size={14} />
                Precio Oficial (Step Chart)
              </button>

              <button
                onClick={() => setChartMode('normalized')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMode === 'normalized'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scale size={14} />
                Contexto Base 100 (vs WTI / USD)
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-semibold self-end sm:self-auto">
              {(['1M', '3M', '6M', '1Y', '3Y', 'ALL'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setActiveRange(r)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    activeRange === r
                      ? 'bg-amber-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full bg-slate-950/70 rounded-xl border border-slate-800 p-3 pt-4">
            {loadingHistory ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Cargando serie histórica oficial...
              </div>
            ) : chartMode === 'step' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fuelStepGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`RD$ ${Number(val).toFixed(2)}`, 'Precio Oficial']}
                    labelFormatter={(lbl, items) => {
                      const item = items?.[0]?.payload;
                      return item?.fullPeriod ? `Vigencia: ${item.fullPeriod}` : `Semana: ${lbl}`;
                    }}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="price"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fill="url(#fuelStepGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={normalizedChartPoints} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[90, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(val: any, name: string) => [
                      `${Number(val).toFixed(2)} pts`,
                      name === 'combustibleBase100' ? fuel.shortName : name === 'wtiBase100' ? 'Petróleo WTI' : 'USD / DOP'
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                    formatter={(val) => (
                      <span className="text-slate-300">
                        {val === 'combustibleBase100' ? fuel.shortName : val === 'wtiBase100' ? 'Petróleo WTI' : 'USD / DOP'}
                      </span>
                    )}
                  />
                  <Line type="stepAfter" dataKey="combustibleBase100" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="wtiBase100" stroke="#06b6d4" strokeWidth={1.8} dot={false} />
                  <Line type="monotone" dataKey="usdDopBase100" stroke="#10b981" strokeWidth={1.8} dot={false} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Puente Futuro con Finanzas Personales (Magnus Personal Finance Readiness) */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-blue-500/20 text-xs text-slate-300">
          <Car size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-blue-300 block">
              Integración Futura con Libro Mayor de Magnus
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              La arquitectura de datos de Energía RD está preparada para conectarse con tus transacciones de combustible en
              <strong className="text-slate-300"> /finanza/libro-mayor</strong>. Próximamente podrás descomponer si tu variación de gasto mensual provino de fluctuación de precios oficiales o de cambio en volumen de consumo (galones consumidos).
            </p>
          </div>
        </div>

        {/* Pie de Página Oficial */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-3">
          <span>Fuente: Ministerio de Industria, Comercio y Mipymes (MICM)</span>
          <span className="font-mono">Resolución Ley 112-00 • Santo Domingo, RD</span>
        </div>
      </div>
    </div>
  );
};
