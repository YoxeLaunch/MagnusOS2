import React from 'react';
import {
  Activity,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { FxCurrency, FxRiskAnalyticsData } from '../types';
import { ReturnsDistributionChart } from './ReturnsDistributionChart';
import { VolatilityComparisonChart } from './VolatilityComparisonChart';

interface FxRiskPanelProps {
  activeCurrency: FxCurrency;
  riskData: FxRiskAnalyticsData | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export const FxRiskPanel: React.FC<FxRiskPanelProps> = ({
  activeCurrency,
  riskData,
  loading,
  error,
  onRetry
}) => {
  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-xs text-slate-400 bg-neutral-900/40 rounded-2xl border border-neutral-800 gap-3">
        <Activity size={24} className="animate-spin text-purple-400" />
        <span>Calculando estimación QMLE de GARCH(1,1) y distribución de retornos ({activeCurrency}/DOP)...</span>
      </div>
    );
  }

  if (error || !riskData) {
    return (
      <div className="p-8 bg-neutral-900/70 border border-neutral-800 rounded-2xl text-center space-y-3 max-w-lg mx-auto my-6">
        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 w-fit mx-auto border border-amber-500/20">
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-white font-bold">No fue posible cargar el análisis de riesgo</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'El cálculo econométrico de volatilidad no devolvió datos para la divisa seleccionada.'}
          </p>
        </div>
        {onRetry && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-neutral-700 inline-flex items-center gap-2"
            >
              <span>Reintentar Análisis</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const { volatility, garchParameters, distribution, valueAtRisk, extremeEpisodes, archEffect } = riskData;

  return (
    <div className="space-y-6">
      {/* Banner de Calibración de Riesgo */}
      <div className="bg-purple-950/20 border border-purple-800/40 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0 border border-purple-500/20">
            <Activity size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-purple-200 uppercase tracking-wider">
              MOTOR DE VOLATILIDAD CONDICIONAL GARCH(1,1) & RISKMETRICS EWMA
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Modelado de heterocedasticidad cambiaria sobre la serie histórica {activeCurrency}/DOP. Incorpora corrección por colas pesadas (leptocurtosis = {distribution.kurtosis.toFixed(1)}).
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 font-mono text-[11px] text-purple-300 bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-800/50">
          Persistencia: {garchParameters.persistence.toFixed(4)} (&lt; 1.0)
        </div>
      </div>

      {/* KPI Cards de Volatilidad y VaR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Volatilidad Condicional GARCH */}
        <div className="bg-neutral-900/80 border border-purple-900/40 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-purple-300 font-semibold">Volatilidad GARCH(1,1)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-mono">
              CONDICIONAL
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-400">
              {volatility.garchConditionalAnnualPct}%
            </span>
            <span className="text-xs text-slate-400">Anualizada</span>
          </div>
          <span className="text-[10px] text-slate-400 block border-t border-neutral-800 pt-1">
            Vida media shock: {garchParameters.halfLifeDays} días hábiles
          </span>
        </div>

        {/* Volatilidad EWMA RiskMetrics */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-cyan-300 font-semibold">EWMA (λ = 0.94)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-950 text-slate-400 font-mono">
              RISKMETRICS
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {volatility.ewmaAnnualPct}%
            </span>
            <span className="text-xs text-slate-400">Anualizada</span>
          </div>
          <span className="text-[10px] text-slate-400 block border-t border-neutral-800 pt-1">
            Media móvil 20d: {volatility.rolling20dAnnualPct}%
          </span>
        </div>

        {/* Volatilidad Histórica 35 Años */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Volatilidad Incondicional (1991–2026)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {volatility.annualizedHistoricalPct}%
            </span>
            <span className="text-xs text-slate-400">Largo Plazo</span>
          </div>
          <span className="text-[10px] text-slate-400 block border-t border-neutral-800 pt-1">
            {riskData.observationsCount.toLocaleString()} observaciones discretas
          </span>
        </div>

        {/* Value-at-Risk (VaR 95%) */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Value-at-Risk Diario (VaR 95%)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {valueAtRisk.var95HistoricalPct}%
            </span>
            <span className="text-xs text-slate-400">Empírico</span>
          </div>
          <span className="text-[10px] text-slate-400 block border-t border-neutral-800 pt-1">
            VaR 99% (Cola extrema): {valueAtRisk.var99HistoricalPct}%
          </span>
        </div>
      </div>

      {/* Gráficos de Riesgo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histograma de Retornos */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <ReturnsDistributionChart
            bins={distribution.bins}
            p1={distribution.percentiles.p1}
            p5={distribution.percentiles.p5}
            meanDailyPct={distribution.meanDailyPct}
          />
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-neutral-800">
            <div>
              <span className="text-[10px] text-slate-400 block">ASIMETRÍA</span>
              <span className="font-bold text-white">{distribution.skewness.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">CURTOSIS</span>
              <span className="font-bold text-white">{distribution.kurtosis.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">EXCESO CURTOSIS</span>
              <span className="font-bold text-amber-400">+{distribution.excessKurtosis.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Estructura Temporal de Volatilidad */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <VolatilityComparisonChart
            termStructure={riskData.termStructure}
            unconditionalAnnualVol={volatility.unconditionalLongTermAnnualPct / 100}
          />
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-neutral-800">
            <div>
              <span className="text-[10px] text-slate-400 block">OMEGA (ω)</span>
              <span className="font-bold text-white">{garchParameters.omega.toExponential(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">ALPHA (α ARCH)</span>
              <span className="font-bold text-white">{garchParameters.alpha.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">BETA (β GARCH)</span>
              <span className="font-bold text-white">{garchParameters.beta.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Explorador de Episodios Históricos Extremos */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h4 className="font-bold text-sm text-white flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          <span>Episodios de Riesgo Extremo y Quiebres Estructurales Documentados</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {extremeEpisodes.map((ep: any, i: number) => (
            <div key={i} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{ep.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  ep.severity === 'CRÍTICA' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-neutral-900 text-slate-300'
                }`}>
                  {ep.severity}
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-400 block">{ep.period}</span>
              <p className="text-xs text-slate-400 leading-relaxed">{ep.description}</p>
              <div className="border-t border-neutral-800 pt-1.5 flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Máximo Shock Diario:</span>
                <span className="font-bold text-rose-400">{ep.maxDailySpike}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guía Explicativa Financiera (Sin señales simplistas) */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 space-y-3 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <HelpCircle size={16} className="text-cyan-400" />
          <span>Guía de Interpretación Econométrica de Riesgo</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-400 pt-1 leading-relaxed">
          <div>
            <strong className="text-white block mb-1">1. Agrupamiento de Volatilidad:</strong>
            La prueba Engle ARCH-LM rechaza varianza constante ($p &lt; 0.001$). Períodos de calma son seguidos por calma, y turbulencias por turbulencias.
          </div>
          <div>
            <strong className="text-white block mb-1">2. Leptocurtosis (Colas Pesadas):</strong>
            Con curtosis de {distribution.kurtosis.toFixed(0)}, los eventos de cola en RD son mucho más frecuentes que en una distribución normal teórica gaussiana.
          </div>
          <div>
            <strong className="text-white block mb-1">3. Límites de Cobertura al 95%:</strong>
            Una banda al 95% no garantiza invulnerabilidad. Episodios como 2003 demuestran que las devaluaciones extremas requieren colchones de tesorería y coberturas reales.
          </div>
        </div>
      </div>
    </div>
  );
};
