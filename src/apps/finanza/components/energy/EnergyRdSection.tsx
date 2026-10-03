import React, { useState, useEffect } from 'react';
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
  Calendar,
  RotateCw,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Flame,
  ArrowUpRight,
  Droplets,
  DollarSign,
  Activity,
  Layers,
  AlertCircle
} from 'lucide-react';
import { FuelDetailModal, FuelItem } from './FuelDetailModal';

export const EnergyRdSection: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFuel, setSelectedFuel] = useState<FuelItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showSecondary, setShowSecondary] = useState<boolean>(false);

  const fetchEnergyData = async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const url = force ? '/api/markets/energy-rd?force=true' : '/api/markets/energy-rd';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.warn('[EnergyRdSection] Error al cargar combustibles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEnergyData(false);
  }, []);

  const handleOpenDetail = (fuel: FuelItem) => {
    setSelectedFuel(fuel);
    setIsModalOpen(true);
  };

  const fuels: FuelItem[] = data?.fuels || [];
  const primaryFuels = fuels.filter(f => f.category === 'PRIMARY');
  const secondaryFuels = fuels.filter(f => f.category === 'SECONDARY');
  const period = data?.period;
  const policy = data?.policy;
  const marketContext = data?.marketContext;
  const energyPressure = data?.energyPressure;

  const formatPeriodShort = (fromStr?: string, toStr?: string) => {
    if (!fromStr || !toStr) return 'Vigencia semanal';
    const [, mFrom, dFrom] = fromStr.split('-');
    const [, mTo, dTo] = toStr.split('-');
    return `${dFrom}–${dTo} ${getMonthAbbr(mTo)}`;
  };

  const getMonthAbbr = (mStr?: string) => {
    const months: Record<string, string> = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };
    return months[mStr || '10'] || 'Oct';
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Encabezado del Módulo Energía RD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 text-amber-500 dark:text-amber-400">
            <Fuel size={22} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold font-serif text-slate-900 dark:text-white tracking-tight">
                Energía RD
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-500/30">
                Oficial MICM
              </span>
              {period && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                  Vigente: {formatPeriodShort(period.validFrom, period.validTo)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Combustibles y mercado energético dominicano • Resoluciones oficiales Ley 112-00
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {data?.meta?.lastChecked && (
            <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
              Sync: {new Date(data.meta.lastChecked).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button
            onClick={() => fetchEnergyData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-50"
            title="Refrescar fuentes oficiales"
          >
            <RotateCw size={14} className={refreshing ? 'animate-spin text-amber-400' : ''} />
          </button>
        </div>
      </div>

      {/* Alerta de dato no vigente (Failsafe) */}
      {data?.stale && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            {data.fallbackWarning || 'Últimos precios disponibles. Nueva resolución del MICM no disponible temporalmente.'}
          </span>
        </div>
      )}

      {/* Síntesis Ejecutiva: Subsidio Semanal & Pulso de Mercado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Subsidio Semanal Total */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={12} />
              Subsidio Semanal Total
            </span>
            <div className="text-xl font-bold font-mono text-white">
              {policy?.formattedSubsidy || 'RD$ 1,490.9 MM'}
            </div>
            <p className="text-[10px] text-slate-400">
              Absorción fiscal del Estado para congelar precios en bomba
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">
              Semana Actual
            </span>
          </div>
        </div>

        {/* Card 2: Pulso Crudo & Divisa */}
        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="space-y-1 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Droplets size={12} className="text-cyan-400" />
              Mercado Global // Referencias
            </span>
            <div className="flex items-center justify-between text-xs font-mono pt-0.5">
              <div>
                <span className="text-slate-400 text-[10px] block">WTI Crude</span>
                <span className="text-slate-100 font-bold">${marketContext?.wti?.price?.toFixed(2) || '91.11'}</span>
                <span className={`text-[10px] ml-1 ${marketContext?.wti?.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {marketContext?.wti?.changePercent >= 0 ? '+' : ''}{marketContext?.wti?.changePercent?.toFixed(1) || '-1.9'}%
                </span>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <span className="text-slate-400 text-[10px] block">Brent Crude</span>
                <span className="text-slate-100 font-bold">${marketContext?.brent?.price?.toFixed(2) || '102.25'}</span>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <span className="text-slate-400 text-[10px] block">USD / DOP</span>
                <span className="text-slate-100 font-bold">RD${marketContext?.usdDop?.price?.toFixed(2) || '59.69'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Presión Energética (Magnus Derived) */}
        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-slate-200 dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Sparkles size={12} />
              Presión Energética
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              MAGNUS DERIVED
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-base font-bold text-white">
              {energyPressure?.status || 'ESTABLE'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              (Score: {energyPressure?.score ?? -0.94})
            </span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5" title={energyPressure?.insight}>
            {energyPressure?.insight || 'Precios internacionales y tipo de cambio en equilibrio.'}
          </p>
        </div>
      </div>

      {/* Grid de Combustibles Principales (Gasolinas, Gasoils, GLP, Gas Natural) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse border border-slate-200 dark:border-white/5" />
          ))
        ) : (
          primaryFuels.map(fuel => {
            const change = fuel.change || 0;
            const isUp = change > 0;
            const isDown = change < 0;
            const isFlat = change === 0;

            return (
              <div
                key={fuel.id}
                onClick={() => handleOpenDetail(fuel)}
                className="group relative bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer flex flex-col justify-between"
              >
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
                      {fuel.unit}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-400 transition-colors">
                      {fuel.name}
                    </h3>
                  </div>

                  {fuel.subsidyPerUnit && fuel.subsidyPerUnit > 0 ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                      <ShieldCheck size={11} />
                      -RD${fuel.subsidyPerUnit.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/5">
                      Vigente
                    </span>
                  )}
                </div>

                {/* Precio y Variación */}
                <div className="my-3 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                      RD$ {fuel.price.toFixed(2)}
                    </span>
                  </div>

                  <div className={`flex items-center gap-1 text-xs font-mono font-bold ${
                    isUp ? 'text-rose-500 dark:text-rose-400' : isDown ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'
                  }`}>
                    {isUp ? <TrendingUp size={14} /> : isDown ? <TrendingDown size={14} /> : <Minus size={14} />}
                    <span>
                      {isUp ? `+${change.toFixed(2)}` : isDown ? `-${Math.abs(change).toFixed(2)}` : '0.00'}
                    </span>
                  </div>
                </div>

                {/* Footer de la tarjeta con Vigencia & Botón de detalle */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-amber-500/70" />
                    {formatPeriodShort(fuel.validFrom, fuel.validTo)}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                    Detalle & Gráfico <ArrowUpRight size={12} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sección Plegable: Otros Hidrocarburos Secundarios (Avtur, Kerosene, Fuel Oil) */}
      {secondaryFuels.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-slate-400" />
              <span>Otros Hidrocarburos Regulados (Avtur, Kerosene, Fuel Oil)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {secondaryFuels.length}
              </span>
            </div>
            {showSecondary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showSecondary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 animate-fade-in">
              {secondaryFuels.map(fuel => {
                const change = fuel.change || 0;
                const isUp = change > 0;
                const isDown = change < 0;

                return (
                  <div
                    key={fuel.id}
                    onClick={() => handleOpenDetail(fuel)}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-800/30 border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>{fuel.shortName}</span>
                      <span>{fuel.unit}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                        RD$ {fuel.price.toFixed(2)}
                      </span>
                      <span className={`text-[11px] font-mono font-bold ${
                        isUp ? 'text-rose-400' : isDown ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {isUp ? `+${change.toFixed(2)}` : isDown ? `-${Math.abs(change).toFixed(2)}` : '0.00'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalle Profundo */}
      <FuelDetailModal
        fuel={selectedFuel}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        marketContext={marketContext}
        policy={policy}
        period={period}
      />
    </div>
  );
};
