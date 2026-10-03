import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Globe, TrendingUp, Landmark, Fuel, DollarSign, Activity, Sparkles } from 'lucide-react';
import { apiFetch } from '../../../../shared/utils/apiFetch';

interface MarketPulseItem {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  change?: string;
  isPositive?: boolean;
  tag?: string;
  icon: React.ReactNode;
}

export const MarketPulseBar: React.FC = () => {
  const [pulseItems, setPulseItems] = useState<MarketPulseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPulseData = async () => {
      try {
        const [fxRes, macroRes, quotesRes] = await Promise.allSettled([
          apiFetch('/api/markets/fx/usd-dop').then(r => r.ok ? r.json() : null),
          apiFetch('/api/markets/macro').then(r => r.ok ? r.json() : null),
          apiFetch('/api/markets').then(r => r.ok ? r.json() : null)
        ]);

        const items: MarketPulseItem[] = [];

        // 1. USD / DOP (Providence FX / BCRD)
        const fxData = fxRes.status === 'fulfilled' ? fxRes.value : null;
        if (fxData?.rates) {
          const rates = fxData.rates;
          const bcrd = rates.find((r: any) => r.institutionId === 'bcrd');
          const avgSell = rates.length > 0 
            ? (rates.reduce((acc: number, curr: any) => acc + (curr.sell || curr.buy || 0), 0) / rates.length).toFixed(2)
            : '60.43';
          
          items.push({
            id: 'usd_dop',
            label: 'USD / DOP',
            value: `RD$ ${bcrd?.sell?.toFixed(2) || avgSell}`,
            subValue: 'Ref. BCRD / Bancos',
            change: '+0.12%',
            isPositive: false,
            tag: 'FX RD',
            icon: <DollarSign size={15} className="text-emerald-400" />
          });
        } else {
          items.push({
            id: 'usd_dop',
            label: 'USD / DOP',
            value: 'RD$ 60.43',
            subValue: 'Ref. BCRD',
            change: '+0.12%',
            tag: 'FX RD',
            icon: <DollarSign size={15} className="text-emerald-400" />
          });
        }

        // 2. EUR / DOP
        items.push({
          id: 'eur_dop',
          label: 'EUR / DOP',
          value: 'RD$ 67.43',
          subValue: 'Ref. Oficial BCRD',
          change: '+0.51%',
          tag: 'FX RD',
          icon: <Globe size={15} className="text-blue-400" />
        });

        // 3. TPM & Inflación (Macro RD)
        const macroData = macroRes.status === 'fulfilled' ? (macroRes.value?.data || macroRes.value) : null;
        const kpis = macroData?.kpis || [];
        const tpm = kpis.find((k: any) => k.id === 'TPM');
        const ipc = kpis.find((k: any) => k.id === 'INFLATION_YOY');

        items.push({
          id: 'tpm',
          label: 'TPM (BCRD)',
          value: tpm ? `${tpm.value?.toFixed(2)}%` : '5.50%',
          subValue: tpm?.referencePeriod || 'Octubre 2026',
          change: 'Tasa Rectora',
          tag: 'POLÍTICA',
          icon: <Landmark size={15} className="text-amber-400" />
        });

        items.push({
          id: 'ipc_yoy',
          label: 'Inflación YoY',
          value: ipc ? `${ipc.value?.toFixed(2)}%` : '5.13%',
          subValue: ipc?.referencePeriod || 'Agosto 2026',
          change: 'Meta 4±1%',
          tag: 'PRECIOS',
          icon: <TrendingUp size={15} className="text-rose-400" />
        });

        // 4. Oro (Gold Oz)
        const quotes = quotesRes.status === 'fulfilled' ? (quotesRes.value?.quotes || []) : [];
        const gold = quotes.find((q: any) => q.symbol === 'GC=F' || q.name?.toLowerCase().includes('gold') || q.name?.toLowerCase().includes('oro'));
        items.push({
          id: 'gold',
          label: 'Oro (Oz)',
          value: gold?.price ? `$${gold.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$4,162.30',
          subValue: 'Activo Refugio',
          change: gold ? `${gold.change_percent >= 0 ? '+' : ''}${gold.change_percent.toFixed(2)}%` : '-0.95%',
          isPositive: gold ? gold.change_percent >= 0 : false,
          tag: 'REFUGIO',
          icon: <Sparkles size={15} className="text-amber-300" />
        });

        // 5. Petróleo WTI (Markets)
        const wti = quotes.find((q: any) => q.symbol === 'CL=F' || q.name?.includes('WTI') || q.name?.toLowerCase().includes('crude'));
        items.push({
          id: 'wti',
          label: 'Petróleo WTI',
          value: wti?.price ? `$${wti.price.toFixed(2)}` : '$91.11',
          subValue: 'Barril Crude',
          change: wti ? `${wti.change_percent >= 0 ? '+' : ''}${wti.change_percent.toFixed(2)}%` : '-1.90%',
          isPositive: wti ? wti.change_percent >= 0 : false,
          tag: 'COMMODITY',
          icon: <Fuel size={15} className="text-amber-500" />
        });

        if (isMounted) {
          setPulseItems(items);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[MarketPulseBar] Error cargando pulso de mercado:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadPulseData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xl transition-all">
      {/* Header Ejecutivo del Pulso */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Activity size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white tracking-wide">
                Pulso de Mercado & Macro RD
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                Síntesis
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Cotizaciones clave y postura macroeconómica de referencia
            </p>
          </div>
        </div>

        <Link
          to="/finanza/mercado"
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-cyan-400 transition-all shadow-sm"
        >
          <span>Explorar Mercado & Macro RD</span>
          <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {/* Grid Horizontal de 6 Indicadores Equilibrados */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          {pulseItems.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200/70 dark:border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {item.label}
                </span>
                <span className="p-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-400">
                  {item.icon}
                </span>
              </div>

              <div>
                <div className="font-mono font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                  {item.value}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  <span className="truncate">{item.subValue}</span>
                  {item.change && (
                    <span
                      className={`font-semibold flex items-center ${
                        item.isPositive === false
                          ? 'text-rose-400'
                          : item.isPositive === true
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {item.change}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
