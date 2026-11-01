/**
 * ============================================================================
 * BANKING CONTEXT CARD // PROVIDENCE FX COMPACT WIDGET
 * Provides regulatory banking context (DSI, USD deposits, yields) within FX Hub
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Landmark,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar
} from 'lucide-react';
import { apiFetch } from '../../../../shared/utils/apiFetch';
import { formatMoneyCompact, formatPercent, formatPeriodLong } from '../../utils/bankingFormatters';

interface BankingContextCardProps {
  onNavigateToBanking?: () => void;
}

export const BankingContextCard: React.FC<BankingContextCardProps> = ({ onNavigateToBanking }) => {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadContext = async () => {
      try {
        const [sumRes, trendRes] = await Promise.all([
          apiFetch('/api/markets/banking/summary').then(r => r.json()),
          apiFetch('/api/markets/banking/dollarization-trend').then(r => r.json())
        ]);

        if (isMounted) {
          if (sumRes?.success && sumRes?.data) setSummaryData(sumRes.data);
          if (trendRes?.success && trendRes?.data) setTrendData(trendRes.data);
        }
      } catch (err) {
        console.warn('[BankingContextCard] Error cargando contexto bancario:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadContext();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 p-4 animate-pulse flex items-center justify-between">
        <div className="h-4 bg-slate-200 dark:bg-neutral-700 rounded w-48" />
        <div className="h-4 bg-slate-200 dark:bg-neutral-700 rounded w-24" />
      </div>
    );
  }

  if (!summaryData) return null;

  // Extraer datos calculados (sin sustituciones silenciosas)
  const dsi = summaryData.dollarizationIndex?.dsiPct ?? null;
  const timeSeries = trendData?.timeSeries || [];
  const curPoint = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1] : null;
  const prevPoint = timeSeries.length > 1 ? timeSeries[timeSeries.length - 2] : null;

  // Variación mensual DSI (puntos porcentuales)
  const dsiDiff = (curPoint?.dsiPct != null && prevPoint?.dsiPct != null)
    ? Number((curPoint.dsiPct - prevPoint.dsiPct).toFixed(2))
    : null;
  const isDsiUp = dsiDiff !== null && dsiDiff > 0;
  const isDsiDown = dsiDiff !== null && dsiDiff < 0;

  // Variación mensual depósitos USD
  let usdGrowthMoM: number | null = null;
  if (curPoint?.totalUsd && prevPoint?.totalUsd && prevPoint.totalUsd > 0) {
    usdGrowthMoM = Number((((curPoint.totalUsd - prevPoint.totalUsd) / prevPoint.totalUsd) * 100).toFixed(2));
  }

  const usdYield = summaryData.currencies?.USD?.weightedYieldPct ?? curPoint?.usdYieldPct ?? null;
  const dopYield = summaryData.currencies?.DOP?.weightedYieldPct ?? curPoint?.dopYieldPct ?? null;
  const refPeriod = summaryData.meta?.referencePeriod || summaryData.periodo;
  const periodLabel = refPeriod ? formatPeriodLong(refPeriod) : 'Dato no disponible';
  const freshness = summaryData.meta?.freshness || 'CURRENT';

  return (
    <div className="border-t border-slate-100 dark:border-white/5 bg-gradient-to-r from-slate-50/90 via-blue-50/20 to-slate-50/90 dark:from-white/[0.01] dark:via-blue-950/10 dark:to-white/[0.01] px-5 py-3.5 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Lado izquierdo: Identificador y Cierre oficial */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Landmark size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Contexto Bancario
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold border border-blue-500/20">
                SB RD
              </span>
              <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                freshness === 'CURRENT'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20'
                  : freshness === 'PARTIAL'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-500/20'
                  : freshness === 'STALE'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-500/20'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-500/20'
              }`}>
                {freshness === 'CURRENT' ? 'Vigente' : freshness === 'PARTIAL' ? 'Parcial' : freshness === 'STALE' ? 'Desactualizado' : 'N/D'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Calendar size={11} />
              <span>Cierre Oficial: <strong className="text-slate-700 dark:text-slate-300 font-medium">{periodLabel}</strong></span>
              <span className="text-slate-300 dark:text-neutral-700">•</span>
              <span className="text-[10px] text-slate-400">Frecuencia mensual</span>
            </div>
          </div>
        </div>

        {/* Centro: Métricas compactas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6 py-1">
          {/* Métrica 1: DSI */}
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-tight">
              Dolarización (DSI)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {dsi !== null ? formatPercent(dsi) : <span className="text-xs font-normal text-slate-400">Dato no disponible</span>}
              </span>
              {dsiDiff !== null && (
                <span className={`text-[10px] font-mono font-semibold flex items-center ${isDsiUp ? 'text-amber-600 dark:text-amber-400' : isDsiDown ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {isDsiUp ? <TrendingUp size={11} className="mr-0.5" /> : isDsiDown ? <TrendingDown size={11} className="mr-0.5" /> : <Minus size={11} className="mr-0.5" />}
                  {dsiDiff > 0 ? `+${dsiDiff.toFixed(2)}` : dsiDiff.toFixed(2)} pp
                </span>
              )}
            </div>
          </div>

          {/* Métrica 2: Depósitos USD */}
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-tight">
              Depósitos USD (Equiv.)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {summaryData.dollarizationIndex?.usdDepositsEquivDop != null
                  ? formatMoneyCompact(summaryData.dollarizationIndex.usdDepositsEquivDop)
                  : <span className="text-xs font-normal text-slate-400">Dato no disponible</span>}
              </span>
              {usdGrowthMoM !== null && (
                <span className={`text-[10px] font-mono font-semibold ${usdGrowthMoM >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {usdGrowthMoM >= 0 ? `+${usdGrowthMoM}%` : `${usdGrowthMoM}%`}
                </span>
              )}
            </div>
          </div>

          {/* Métrica 3: Tasa Pasiva USD */}
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-tight">
              Tasa Pasiva USD
            </span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 block mt-0.5">
              {usdYield !== null ? formatPercent(usdYield) : <span className="text-xs font-normal text-slate-400">Dato no disponible</span>}
            </span>
          </div>

          {/* Métrica 4: Tasa Pasiva DOP */}
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-tight">
              Tasa Pasiva DOP
            </span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 block mt-0.5">
              {dopYield !== null ? formatPercent(dopYield) : <span className="text-xs font-normal text-slate-400">Dato no disponible</span>}
            </span>
          </div>
        </div>

        {/* Lado derecho: Botón discreto que navega a Análisis Bancario */}
        {onNavigateToBanking && (
          <button
            onClick={onNavigateToBanking}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-white/10 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer whitespace-nowrap self-start md:self-center"
          >
            <span>Ver Análisis Bancario</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
