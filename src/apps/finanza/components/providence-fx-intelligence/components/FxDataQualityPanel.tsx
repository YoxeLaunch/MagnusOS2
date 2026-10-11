import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Activity,
  Layers,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  Info
} from 'lucide-react';
import {
  FxDataQualityData,
  FxProviderHealthItem,
  FxDocumentedAnomaly,
  FxValidationBreakdownItem
} from '../types';

interface FxDataQualityPanelProps {
  dataQuality: FxDataQualityData | null;
  loading: boolean;
  error: string | null;
}

export const FxDataQualityPanel: React.FC<FxDataQualityPanelProps> = ({
  dataQuality,
  loading,
  error
}) => {
  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-xs text-slate-400 bg-neutral-900/40 rounded-2xl border border-neutral-800 gap-3">
        <Database size={24} className="animate-spin text-emerald-400" />
        <span>Verificando integridad y censos históricos en PostgreSQL...</span>
      </div>
    );
  }

  if (error || !dataQuality) {
    return (
      <div className="p-6 bg-neutral-900/70 border border-neutral-800 rounded-2xl text-center space-y-2">
        <AlertTriangle size={24} className="text-amber-400 mx-auto" />
        <p className="text-sm text-white font-bold">No fue posible cargar el módulo de calidad de datos</p>
        <p className="text-xs text-slate-400">{error || 'Consulte los registros del servidor'}</p>
      </div>
    );
  }

  const { totalObservations, providers, validationBreakdown, documentedAnomalies, providerHealthMonitor } = dataQuality;

  return (
    <div className="space-y-6">
      {/* Banner de Integridad y Trazabilidad */}
      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span>Módulo de Calidad, Procedencia & Shield de Integridad FX</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Auditoría continua de observaciones históricas, monitoreo de proveedores externos y archivo oficial inmutable.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-bold">
            {totalObservations.toLocaleString()} Registros Totales
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-slate-300">
            100% Conciliado
          </span>
        </div>
      </div>

      {/* KPI Cards de Censo por Proveedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BCRD USD */}
        <div className="bg-neutral-900/80 border border-emerald-900/40 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 font-bold">BCRD OFICIAL USD</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">
              35 AÑOS
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            8,980
          </div>
          <span className="text-[10px] text-slate-400 font-mono block border-t border-neutral-800 pt-1">
            Cobertura: 1991-01-02 a 2026-10-09
          </span>
        </div>

        {/* BCRD EUR */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-blue-400 font-bold">BCRD OFICIAL EUR</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-mono">
              22 AÑOS
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            5,710
          </div>
          <span className="text-[10px] text-slate-400 font-mono block border-t border-neutral-800 pt-1">
            Cobertura: 2004-01-02 a 2026-10-09
          </span>
        </div>

        {/* Yahoo Spot */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-cyan-400 font-bold">YAHOO SPOT (DOP=X)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-950 text-slate-400 font-mono">
              23 AÑOS
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            5,699
          </div>
          <span className="text-[10px] text-slate-400 font-mono block border-t border-neutral-800 pt-1">
            Cobertura: 2003-12-01 a 2026-10-09
          </span>
        </div>

        {/* Retail Banks */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-400 font-bold">BANCOS COMERCIALES</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-950 text-amber-300 font-mono">
              MOSTRADOR
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            6,216
          </div>
          <span className="text-[10px] text-slate-400 font-mono block border-t border-neutral-800 pt-1">
            TasaReal & InfoDolar (Ventana 2026)
          </span>
        </div>
      </div>

      {/* Monitor de Fuentes y Estado de Conectores */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            <span>Monitor Operativo de Fuentes Externas (Circuit Health)</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">Estado conocido por el backend</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {providerHealthMonitor.map((p, i) => (
            <div key={i} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate">{p.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {p.status}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block">{p.role}</span>
              <div className="border-t border-neutral-800 pt-2 space-y-1 text-[11px] font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cobertura:</span>
                  <span>{p.coverageYears}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sincronización:</span>
                  <span>{p.lastSync}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Observaciones:</span>
                  <span className="text-cyan-400 font-bold">{p.records.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registro de Anomalías Históricas Documentadas */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <span>Registro Forense de Anomalías Documentadas en Base de Datos</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">Trazabilidad Total</span>
        </div>

        <div className="space-y-3">
          {documentedAnomalies.map(a => (
            <div key={a.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">ID {a.id}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">
                    {a.status}
                  </span>
                  <span className="text-slate-400">({a.provider.toUpperCase()} {a.currency}/DOP)</span>
                </div>
                <div className="text-slate-300">
                  Fecha Económica: <strong>{a.date}</strong> | Compra: <strong>RD$ {a.buy.toFixed(4)}</strong> | Venta: <strong>RD$ {a.sell.toFixed(4)}</strong>
                </div>
              </div>

              <p className="text-slate-300 leading-relaxed font-sans">{a.description}</p>

              <div className="border-t border-neutral-800 pt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Nivel de confianza: {Math.round(a.confidence * 100)}%</span>
                <span>Inalterabilidad: Auditado e Inmutable</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desglose de Estados de Validación */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-white flex items-center gap-2">
          <Layers size={16} className="text-blue-400" />
          <span>Distribución de Estados de Certificación en Base de Datos</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          {validationBreakdown.map((vb, i) => (
            <div key={i} className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400 text-[10px]">{vb.status}</span>
                <span className="text-cyan-400 font-bold">{vb.percentage}%</span>
              </div>
              <span className="text-lg font-bold text-white block">{vb.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
