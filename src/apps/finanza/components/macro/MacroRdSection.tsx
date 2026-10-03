import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Sparkles,
  ShieldCheck,
  Scale,
  Percent,
  Landmark,
  Coins,
  ArrowUpRight
} from 'lucide-react';
import { MacroDetailModal, MacroKpiItem } from './MacroDetailModal';

export const MacroRdSection: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedIndicator, setSelectedIndicator] = useState<MacroKpiItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showExpanded, setShowExpanded] = useState<boolean>(false);

  const fetchMacroData = async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const url = force ? '/api/markets/macro?force=true' : '/api/markets/macro';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.warn('[MacroRdSection] Error al cargar indicadores macro:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMacroData(false);
  }, []);

  const handleOpenDetail = (kpi: MacroKpiItem) => {
    setSelectedIndicator(kpi);
    setIsModalOpen(true);
  };

  // 8 KPIs prioritarios para la fila principal
  const priorityIds = [
    'INFLATION_YOY',
    'TPM',
    'RATE_ACTIVE',
    'RATE_PASSIVE',
    'IMAE_YOY',
    'PRIVATE_CREDIT_YOY',
    'RESERVES_NET',
    'USD_DOP_BCRD'
  ];

  const allKpis: MacroKpiItem[] = data?.kpis || [];
  const primaryKpis = allKpis.filter(k => priorityIds.includes(k.id));
  const secondaryKpis = allKpis.filter(k => !priorityIds.includes(k.id));
  const derived = data?.derivedMetrics || {};

  return (
    <div className="space-y-4 pt-2">
      {/* Encabezado del Módulo Macro RD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
            <Landmark size={22} className="text-cyan-500 dark:text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold font-serif text-slate-900 dark:text-white tracking-tight">
                Contexto Macro RD
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-500/30">
                Oficial BCRD
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Indicadores económicos fundamentales de República Dominicana con frecuencias oficiales de publicación
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {data?.sourceHealth?.lastChecked && (
            <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
              Sincronizado: {new Date(data.sourceHealth.lastChecked).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button
            onClick={() => fetchMacroData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50"
            title="Sincronizar fuentes oficiales BCRD"
          >
            <RotateCw size={15} className={refreshing ? 'animate-spin text-cyan-500' : ''} />
          </button>
        </div>
      </div>

      {/* Skeletons de Carga */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white/40 dark:bg-neutral-800/20 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 h-36 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-2/3"></div>
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/3"></div>
              </div>
              <div className="h-8 bg-slate-200 dark:bg-white/10 rounded w-1/2"></div>
              <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Grid de los 8 KPIs Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {primaryKpis.map((kpi) => {
              const hasChange = typeof kpi.changeAbsolute === 'number' && Number.isFinite(kpi.changeAbsolute);
              const isUp = hasChange && kpi.changeAbsolute! > 0;
              const isDown = hasChange && kpi.changeAbsolute! < 0;

              return (
                <div
                  key={kpi.id}
                  onClick={() => handleOpenDetail(kpi)}
                  className="bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-cyan-500/40 dark:hover:border-cyan-500/40 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                        {kpi.name}
                      </span>
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                        {kpi.frequency}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Calendar size={12} className="text-slate-500" />
                      <span>{kpi.referencePeriod}</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-serif text-slate-900 dark:text-white tracking-tight">
                        {kpi.value.toLocaleString('es-DO', { maximumFractionDigits: 4 })}
                      </span>
                      <span className="text-xs font-semibold text-cyan-500 dark:text-cyan-400">{kpi.unit}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                      {isUp ? (
                        <TrendingUp size={14} className="text-emerald-500" />
                      ) : isDown ? (
                        <TrendingDown size={14} className="text-rose-500" />
                      ) : (
                        <Minus size={14} className="text-slate-400" />
                      )}

                      <span className={isUp ? 'text-emerald-500' : isDown ? 'text-rose-500' : 'text-slate-400'}>
                        {hasChange ? (
                          `${kpi.changeAbsolute! > 0 ? '+' : ''}${kpi.changeAbsolute} ${kpi.unit}`
                        ) : (
                          'Oficial'
                        )}
                      </span>

                      {kpi.previousValue !== null && kpi.previousValue !== undefined && (
                        <span className="text-slate-400 text-[11px] font-normal">
                          (ant. {kpi.previousValue})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-mono text-slate-500">
                      <Building2 size={11} /> {kpi.source}
                    </span>

                    <span className="text-cyan-500 dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                      Detalle <Maximize2 size={11} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Métricas Derivadas Transparentes (Magnus Insights) */}
          {(derived.realRateSimple?.value !== null || derived.bankingSpread?.value !== null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {derived.realRateSimple?.value !== null && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        DERIVED // MAGNUS
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {derived.realRateSimple.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{derived.realRateSimple.formula} ({derived.realRateSimple.note})</p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-bold font-serif text-amber-400">
                      {derived.realRateSimple.value > 0 ? '+' : ''}{derived.realRateSimple.value}%
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block">Ex-post</span>
                  </div>
                </div>
              )}

              {derived.bankingSpread?.value !== null && (
                <div className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        DERIVED // MAGNUS
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {derived.bankingSpread.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{derived.bankingSpread.formula} (Margen de intermediación)</p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-bold font-serif text-cyan-400">
                      {derived.bankingSpread.value} pp
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block">Spread</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expansión de Indicadores Secundarios (Subyacente, Mensual, Interbancaria) */}
          {secondaryKpis.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowExpanded(!showExpanded)}
                className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors mx-auto p-2"
              >
                <span>{showExpanded ? 'Ocultar indicadores complementarios' : `Ver ${secondaryKpis.length} indicadores adicionales (Subyacente, Mensual, Interbancaria)`}</span>
                {showExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 animate-in fade-in duration-300">
                  {secondaryKpis.map((kpi) => (
                    <div
                      key={kpi.id}
                      onClick={() => handleOpenDetail(kpi)}
                      className="bg-white/60 dark:bg-neutral-800/30 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm hover:border-cyan-500/30 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                            {kpi.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-400">
                            {kpi.referencePeriod}
                          </span>
                        </div>
                      </div>

                      <div className="my-2">
                        <span className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                          {kpi.value.toLocaleString('es-DO', { maximumFractionDigits: 4 })}
                        </span>
                        <span className="text-xs font-semibold text-cyan-500 ml-1">{kpi.unit}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{kpi.source}</span>
                        <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">Ver</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Detallado */}
      <MacroDetailModal
        indicator={selectedIndicator}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
