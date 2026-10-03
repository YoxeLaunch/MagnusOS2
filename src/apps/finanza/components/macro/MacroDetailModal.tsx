import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Building2,
  ExternalLink,
  Info,
  Clock,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';

export interface MacroKpiItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  frequency: string;
  unit: string;
  value: number;
  previousValue?: number | null;
  changeAbsolute?: number | null;
  changePercent?: number | null;
  referencePeriod: string;
  observedAt: string;
  source: string;
  sourceUrl?: string;
  revision?: number;
  preferredChartType?: string;
  description?: string;
  magnusInterpretation?: string;
  metadata?: any;
}

interface MacroDetailModalProps {
  indicator: MacroKpiItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MacroDetailModal: React.FC<MacroDetailModalProps> = ({
  indicator,
  isOpen,
  onClose
}) => {
  const [activeRange, setActiveRange] = useState<'1Y' | '3Y' | '5Y' | 'ALL'>('1Y');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !indicator) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/markets/macro/indicator/${indicator.id}?range=${activeRange}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.series) {
            setHistoryData(json.data.series);
          }
        }
      } catch (err) {
        console.warn('[MacroDetailModal] Error cargando histórico:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [isOpen, indicator, activeRange]);

  if (!isOpen || !indicator) return null;

  const isStepChart = indicator.preferredChartType === 'step' || indicator.id === 'TPM';
  const hasChange = typeof indicator.changeAbsolute === 'number' && Number.isFinite(indicator.changeAbsolute);
  const isUp = hasChange && indicator.changeAbsolute! > 0;
  const isDown = hasChange && indicator.changeAbsolute! < 0;

  // Si aún no hay suficientes datos históricos de series en base de datos, mostramos el punto actual
  const chartPoints = historyData.length > 0 ? historyData : [
    { period: indicator.referencePeriod, value: indicator.value, observedAt: indicator.observedAt }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Encabezado */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {indicator.category}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Oficial {indicator.source}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Frecuencia {indicator.frequency}
              </span>
            </div>
            <h2 className="text-xl font-bold mt-2 text-white font-serif tracking-tight flex items-center gap-2">
              {indicator.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-500" />
              Periodo de Referencia: <span className="font-semibold text-slate-200">{indicator.referencePeriod}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido principal scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

          {/* Tarjeta de métrica actual */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Dato Oficial Actual</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-serif text-white tracking-tight">
                  {indicator.value.toLocaleString('es-DO', { maximumFractionDigits: 4 })}
                </span>
                <span className="text-sm font-semibold text-cyan-400">{indicator.unit}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Variación Anterior</span>
              <div className="flex items-center gap-1.5 mt-2">
                {isUp ? (
                  <TrendingUp size={16} className="text-emerald-400" />
                ) : isDown ? (
                  <TrendingDown size={16} className="text-rose-400" />
                ) : (
                  <Minus size={16} className="text-slate-400" />
                )}
                <span className={`text-base font-bold ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-slate-400'}`}>
                  {hasChange ? (
                    `${indicator.changeAbsolute! > 0 ? '+' : ''}${indicator.changeAbsolute} ${indicator.unit}`
                  ) : (
                    'Sin cambio'
                  )}
                </span>
              </div>
              {indicator.previousValue !== null && indicator.previousValue !== undefined && (
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Previo: {indicator.previousValue} {indicator.unit}
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Verificación Oficial</span>
              <div className="mt-2 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1 text-slate-400">
                  <Building2 size={13} className="text-slate-500" />
                  <span>{indicator.source} (República Dominicana)</span>
                </div>
                {indicator.revision && indicator.revision > 1 && (
                  <div className="flex items-center gap-1 text-amber-400 text-[11px]">
                    <Layers size={12} />
                    <span>Revisión oficial #{indicator.revision}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gráfico y Selector de Rango */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Activity size={15} className="text-blue-400" />
                Evolución Histórica ({isStepChart ? 'Decisiones Escalonadas' : 'Serie Temporal'})
              </span>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-semibold">
                {(['1Y', '3Y', '5Y', 'ALL'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setActiveRange(r)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      activeRange === r
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full bg-slate-950/60 rounded-xl border border-slate-800/80 p-3 pt-4">
              {loadingHistory ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Cargando serie histórica...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="macroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="period"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tickLine={false}
                      tickFormatter={(val) => `${val}${indicator.unit === '%' ? '%' : ''}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`${val} ${indicator.unit}`, indicator.shortName]}
                      labelFormatter={(lbl) => `Periodo: ${lbl}`}
                    />
                    <Area
                      type={isStepChart ? 'stepAfter' : 'monotone'}
                      dataKey="value"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#macroGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Interpretación Magnus Capital */}
          {indicator.magnusInterpretation && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={15} />
                <span>Magnus Capital // Insight Económico</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {indicator.magnusInterpretation}
              </p>
              <div className="mt-2.5 text-[10px] text-amber-400/70 italic flex items-center gap-1">
                <Info size={11} />
                <span>Análisis analítico contextualizado. No constituye recomendación financiera directa.</span>
              </div>
            </div>
          )}

          {/* Descripción Técnica Oficial */}
          {indicator.description && (
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] block">
                Ficha Técnica del Indicador
              </span>
              <p className="text-slate-400 leading-relaxed bg-slate-950/30 p-3 rounded-lg border border-slate-800/60">
                {indicator.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Fuente oficial verificada: Banco Central de la República Dominicana</span>
          </div>

          {indicator.sourceUrl && (
            <a
              href={indicator.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              <span>Portal BCRD</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>

      </div>
    </div>
  );
};
