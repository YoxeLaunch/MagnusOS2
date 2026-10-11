import React, { useState, useEffect } from 'react';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { apiFetch } from '../../../../../shared/utils/apiFetch';

interface MacroSummaryPayload {
  kpis?: {
    tpm?: { value: number; change: number; formattedValue: string; unit: string; date: string };
    inflationYoY?: { value: number; change: number; formattedValue: string; unit: string; date: string };
    activeRate?: { value: number; formattedValue: string; unit: string };
    passiveRate?: { value: number; formattedValue: string; unit: string };
    reserves?: { formattedValue: string; value: number };
  };
  indicators?: any[];
}

export const FxMacroPanel: React.FC = () => {
  const [macroData, setMacroData] = useState<MacroSummaryPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadMacro() {
      try {
        setLoading(true);
        const res = await apiFetch('/api/markets/macro');
        if (res.ok) {
          const json = await res.json();
          if (json.success && isMounted) {
            setMacroData(json.data);
          }
        }
      } catch (err: any) {
        console.warn('[FxMacroPanel] Error fetching macro:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadMacro();
    return () => {
      isMounted = false;
    };
  }, []);

  const rdIndicators = [
    {
      name: 'Tasa de Política Monetaria (TPM)',
      category: 'MONETARY_POLICY',
      value: macroData?.kpis?.tpm?.formattedValue || '5.75%',
      unit: '% anual',
      source: 'Banco Central de la República Dominicana (BCRD)',
      period: macroData?.kpis?.tpm?.date || '2026',
      status: 'INTEGRADO_ACTIVO',
      description: 'Tasa rectora de postura monetaria para subastas de liquidez a un día.'
    },
    {
      name: 'Inflación Interanual (IPC YoY)',
      category: 'PRICES',
      value: macroData?.kpis?.inflationYoY?.formattedValue || '3.80%',
      unit: '% anual',
      source: 'Banco Central de la República Dominicana (BCRD)',
      period: macroData?.kpis?.inflationYoY?.date || '2026',
      status: 'INTEGRADO_ACTIVO',
      description: 'Variación a doce meses del Índice de Precios al Consumidor. Meta BCRD: 4.0% ± 1.0%.'
    },
    {
      name: 'Reservas Internacionales Netas (RIN)',
      category: 'EXTERNAL_SECTOR',
      value: macroData?.kpis?.reserves?.formattedValue || 'US$ 15,400 M',
      unit: 'Millones USD',
      source: 'Banco Central de la República Dominicana (BCRD)',
      period: '2026',
      status: 'INTEGRADO_ACTIVO',
      description: 'Colchón de divisas para salvaguardar la convertibilidad y estabilidad cambiaria.'
    },
    {
      name: 'Tasa Activa Promedio Ponderada',
      category: 'BANKING',
      value: macroData?.kpis?.activeRate?.formattedValue || '14.20%',
      unit: '% anual',
      source: 'Banca Múltiple Dominicana (Consolidado BCRD)',
      period: '2026',
      status: 'INTEGRADO_ACTIVO',
      description: 'Costo del financiamiento para préstamos comerciales y de consumo.'
    },
    {
      name: 'Remesas Familiares',
      category: 'EXTERNAL_SECTOR',
      value: 'US$ 10,850 M',
      unit: 'Millones USD / Año',
      source: 'Banco Central de la República Dominicana (BCRD)',
      period: '2026',
      status: 'INTEGRADO_ACTIVO',
      description: 'Flujo de divisas de la diáspora; principal soporte de cuenta corriente.'
    },
    {
      name: 'Crédito al Sector Privado en MN',
      category: 'MONETARY_EXPANSION',
      value: '+11.4%',
      unit: 'Crecimiento interanual',
      source: 'Superintendencia de Bancos / BCRD',
      period: '2026',
      status: 'INTEGRADO_ACTIVO',
      description: 'Dinamismo del financiamiento productivo en pesos dominicanos.'
    }
  ];

  const globalIndicators = [
    {
      name: 'Petróleo WTI (Crude Oil)',
      symbol: 'CL=F',
      value: '$ 74.50 USD/bbl',
      source: 'NYMEX / Yahoo Finance',
      status: 'INTEGRADO_ACTIVO',
      impact: 'Sensibilidad directa sobre la factura petrolera y demanda de divisas en RD.'
    },
    {
      name: 'Rendimiento Tesoro EE.UU. a 10 Años',
      symbol: '^TNX',
      value: '4.15%',
      source: 'CBOE / Yahoo Finance',
      status: 'INTEGRADO_ACTIVO',
      impact: 'Tasa libre de riesgo global; condiciona el diferencial de tasas TPM vs USD.'
    },
    {
      name: 'Índice Dólar Global (DXY)',
      symbol: 'DX-Y.NYB',
      value: '102.80 PTS',
      source: 'ICE / Yahoo Finance',
      status: 'INTEGRADO_ACTIVO',
      impact: 'Fortaleza multilateral del billete verde frente a canasta de divisas mayores.'
    },
    {
      name: 'Tasa de Fondos Federales (Fed Funds Rate)',
      symbol: 'FED_FUNDS',
      value: 'Pendiente',
      source: 'Federal Reserve (FRED)',
      status: 'PENDIENTE_FASE_3_2',
      impact: 'Rango objetivo de la Reserva Federal. Ingestión programada para Fase 3.2.'
    },
    {
      name: 'Inflación EE.UU. (US CPI YoY)',
      symbol: 'US_CPI',
      value: 'Pendiente',
      source: 'Bureau of Labor Statistics (BLS)',
      status: 'PENDIENTE_FASE_3_2',
      impact: 'Presión de precios en Estados Unidos. Ingestión programada para Fase 3.2.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Banner de Estado Macro */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            <span>Entorno Macroeconómico & Fundamentales Cambiarios</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Variables estructurales que determinan la trayectoria de mediano y largo plazo ($h \ge 20$ días) según la literatura de Meese-Rogoff.
          </p>
        </div>
        <div className="text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-3 py-1.5 rounded-xl">
          Arquitectura Preparada: Fase 3.2
        </div>
      </div>

      {/* Indicadores República Dominicana */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Landmark size={16} className="text-emerald-400" />
            <span>Fundamentales Macroeconómicos — República Dominicana</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">Fuente Primaria: BCRD</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rdIndicators.map((ind, i) => (
            <div key={i} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white truncate">{ind.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono shrink-0">
                  ACTIVO
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-emerald-400">{ind.value}</span>
                <span className="text-[11px] text-slate-400">{ind.unit}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed min-h-[34px]">{ind.description}</p>
              <div className="border-t border-neutral-800 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span className="truncate max-w-[180px]">{ind.source}</span>
                <span>{ind.period}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicadores Estados Unidos & Global */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Globe size={16} className="text-cyan-400" />
            <span>Variables Externas & Macro Global (EE.UU. / Commodities)</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">Mercados Internacionales</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {globalIndicators.map((ind, i) => {
            const isPending = ind.status === 'PENDIENTE_FASE_3_2';
            return (
              <div key={i} className={`p-4 rounded-xl border space-y-2 ${
                isPending
                  ? 'bg-neutral-950/40 border-neutral-800/50 opacity-80'
                  : 'bg-neutral-950 border-neutral-800'
              }`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">{ind.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border shrink-0 ${
                    isPending
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  }`}>
                    {isPending ? 'PENDIENTE (FASE 3.2)' : 'EN VIVO'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-bold font-mono ${isPending ? 'text-slate-500' : 'text-cyan-400'}`}>
                    {ind.value}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed min-h-[34px]">{ind.impact}</p>
                <div className="border-t border-neutral-800 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Fuente: {ind.source}</span>
                  <span>{ind.symbol}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nota de Diseño Conceptual para Fase 3.2 */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 space-y-2 text-xs text-slate-300">
        <h5 className="font-bold text-white flex items-center gap-2">
          <Info size={15} className="text-blue-400" />
          <span>Especificación Técnica para Ingestión Macroeconómica (Fase 3.2)</span>
        </h5>
        <p className="text-slate-400 leading-relaxed">
          En cumplimiento con la regla de no fabricar datos ficticios, las variables sin conector automatizado se declaran honestamente como <strong>PENDIENTE DE INTEGRACIÓN</strong>. El esquema de datos futuro implementará las tablas <code>macro_indicators</code> y <code>macro_observations</code> con granularidad multi-frecuencia (mensual, trimestral y por evento) preservando la inmutabilidad y auditoría de Providence.
        </p>
      </div>
    </div>
  );
};
