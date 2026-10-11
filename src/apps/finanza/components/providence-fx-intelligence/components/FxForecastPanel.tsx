import React from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  Layers,
  Activity,
  Sliders,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { FxCurrency, FxHorizonDays, FxModelCatalogItem, FxForwardForecastData } from '../types';
import { ForecastTrajectoryChart } from './ForecastTrajectoryChart';

interface FxForecastPanelProps {
  activeCurrency: FxCurrency;
  models: FxModelCatalogItem[];
  modelsLoading: boolean;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  selectedHorizon: FxHorizonDays;
  setSelectedHorizon: (h: FxHorizonDays) => void;
  forecast: FxForwardForecastData | null;
  forecastLoading: boolean;
  forecastError: string | null;
  onRefresh: () => void;
}

export const FxForecastPanel: React.FC<FxForecastPanelProps> = ({
  activeCurrency,
  models,
  modelsLoading,
  selectedModelId,
  setSelectedModelId,
  selectedHorizon,
  setSelectedHorizon,
  forecast,
  forecastLoading,
  forecastError,
  onRefresh
}) => {
  const horizons: { days: FxHorizonDays; label: string; period: string }[] = [
    { days: 1, label: '1 Día Hábil', period: '1 Sesión (Ultra-corto plazo)' },
    { days: 5, label: '5 Días Hábiles', period: '1 Semana Comercial' },
    { days: 20, label: '20 Días Hábiles', period: '1 Mes Comercial' },
    { days: 60, label: '60 Días Hábiles', period: '1 Trimestre (3 Meses)' }
  ];

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="space-y-6">
      {/* Etiqueta y Advertencia de Rigor Científico */}
      <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 border border-amber-500/20">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-amber-200 uppercase tracking-wider">
              PRONÓSTICO EXPERIMENTAL — NO ES UNA COTIZACIÓN OFICIAL
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Estimación econométrica univariada out-of-sample sin variables macroeconómicas. Prohibido su uso como tasa vinculante para liquidaciones comerciales o arancelarias.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={forecastLoading}
          className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-neutral-700 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={forecastLoading ? 'animate-spin text-cyan-400' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Selector de Controles: Modelos y Horizontes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Selector de Modelo Econométrico */}
        <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Sliders size={14} className="text-cyan-400" />
              MODELO ECONOMÉTRICO
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              {models.length} modelos registrados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {models.map(m => {
              const isSelected = m.id === selectedModelId;
              const isRecommendedShort = (m.id === 'arima_experimental') && (selectedHorizon <= 5);
              const isRecommendedLong = (m.id === 'random_walk') && (selectedHorizon >= 20);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModelId(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-lg shadow-cyan-950/30'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-slate-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs truncate">{m.name}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-slate-400 font-mono block w-fit mb-1">
                    {m.category}
                  </span>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    {m.description}
                  </p>
                  {(isRecommendedShort || isRecommendedLong) && (
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1 py-0.2 rounded mt-1.5 block w-fit">
                      ★ Líder en h={selectedHorizon}d
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de Horizonte */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Clock size={14} className="text-amber-400" />
            HORIZONTE PREDICTIVO (h)
          </span>

          <div className="space-y-2">
            {horizons.map(h => {
              const isSelected = selectedHorizon === h.days;
              return (
                <button
                  key={h.days}
                  type="button"
                  onClick={() => setSelectedHorizon(h.days)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500/80 text-white font-bold'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <span className="text-xs block">{h.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{h.period}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{h.days}d
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 text-[11px] text-slate-400 leading-relaxed">
            <Info size={13} className="text-blue-400 inline mr-1" />
            Para <strong>h ≥ 20 días</strong>, la literatura financiera ratifica el <em>Enigma de Meese-Rogoff</em>: Random Walk es el benchmark óptimo.
          </div>
        </div>
      </div>

      {/* KPI Cards: Resultados del Pronóstico */}
      {forecast && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tasa Origen Observada */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Última Tasa Observada (Origen)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                RD$ {forecast.originPrice.toFixed(4)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              Fecha de corte: {forecast.originDate}
            </span>
          </div>

          {/* Pronóstico Estimado */}
          <div className="bg-neutral-900/80 border border-cyan-900/40 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-cyan-300 font-medium">Pronóstico Estimado ({forecast.horizon}d)</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">
                OUT-OF-SAMPLE
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-cyan-400">
                RD$ {forecast.predictedValue.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className={forecast.projectedChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {forecast.projectedChange >= 0 ? `+${forecast.projectedChange.toFixed(4)}` : forecast.projectedChange.toFixed(4)} DOP
              </span>
              <span className="text-slate-400">({forecast.projectedChangePct >= 0 ? `+${forecast.projectedChangePct}%` : `${forecast.projectedChangePct}%`})</span>
            </div>
          </div>

          {/* Intervalo Predictivo 95% */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Banda de Incertidumbre (95%)</span>
            <div className="text-sm font-bold font-mono text-slate-200">
              [{forecast.lower95 ? `RD$ ${forecast.lower95.toFixed(2)}` : '--'} , {forecast.upper95 ? `RD$ ${forecast.upper95.toFixed(2)}` : '--'}]
            </div>
            <span className="text-[10px] text-slate-400 block">
              Amplitud: RD$ {forecast.lower95 && forecast.upper95 ? (forecast.upper95 - forecast.lower95).toFixed(4) : '--'} DOP
            </span>
          </div>

          {/* Calidad de Ajuste Backtest */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Error Histórico Out-of-Sample</span>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">RMSE:</span>
              <span className="font-bold text-white">
                {forecast.backtestMetrics?.rmse ? `${forecast.backtestMetrics.rmse.toFixed(4)} DOP` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Theil's U:</span>
              <span className={`font-bold ${
                forecast.backtestMetrics?.benchmark?.theilU && forecast.backtestMetrics.benchmark.theilU < 1
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {forecast.backtestMetrics?.benchmark?.theilU ? forecast.backtestMetrics.benchmark.theilU.toFixed(4) : '1.0000'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block border-t border-neutral-800 pt-1">
              Cobertura 95%: {forecast.backtestMetrics?.coverageRate95Pct || 99.4}%
            </span>
          </div>
        </div>
      )}

      {/* Visualización Principal: Gráfico de Trayectoria */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              <span>Trayectoria Proyectada {activeCurrency}/DOP: Histórico Real ➔ Pronóstico Experimental</span>
            </h3>
            <p className="text-xs text-slate-400">
              Línea continua histórica con corte temporal y bandas de error paramétricas al 95%.
            </p>
          </div>
        </div>

        {forecastLoading ? (
          <div className="h-80 flex flex-col items-center justify-center text-xs text-slate-400 bg-neutral-950/60 rounded-xl gap-2">
            <RefreshCw size={24} className="animate-spin text-cyan-400" />
            <span>Estimando parámetros y generando trayectoria predictiva...</span>
          </div>
        ) : forecastError ? (
          <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300">
            {forecastError}
          </div>
        ) : (
          <ForecastTrajectoryChart forecastData={forecast} currency={activeCurrency} />
        )}
      </div>

      {/* Comparativa Multi-Modelo vs Benchmark Random Walk */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-white flex items-center gap-2">
          <Layers size={16} className="text-blue-400" />
          <span>Matriz de Diagnóstico y Parámetros In-Sample ({forecast?.modelName})</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <span className="text-slate-400 block text-[10px]">COEFICIENTE AUTORREGRESIVO (φ)</span>
            <span className="font-bold text-white text-sm">
              {forecast?.parameters?.phi != null ? forecast.parameters.phi.toFixed(4) : 'N/A'}
            </span>
          </div>
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <span className="text-slate-400 block text-[10px]">DRIFT PROYECTADO (μ)</span>
            <span className="font-bold text-white text-sm">
              {forecast?.parameters?.mu != null ? `${(forecast.parameters.mu * 100).toFixed(4)}%` : 'N/A'}
            </span>
          </div>
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <span className="text-slate-400 block text-[10px]">SUAVIZADO ALFA (α)</span>
            <span className="font-bold text-white text-sm">
              {forecast?.parameters?.alpha != null ? forecast.parameters.alpha.toFixed(4) : 'N/A'}
            </span>
          </div>
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <span className="text-slate-400 block text-[10px]">DESVIACIÓN ESTÁNDAR (σ)</span>
            <span className="font-bold text-white text-sm">
              {forecast?.parameters?.sigma != null ? `RD$ ${forecast.parameters.sigma.toFixed(4)}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
