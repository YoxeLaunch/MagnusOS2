import React, { useState, useMemo } from 'react';
import {
  Layers,
  Activity,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode2,
  Database,
  ArrowUpDown,
  Filter,
  Shield,
  HelpCircle,
  Clock,
  Hash
} from 'lucide-react';
import { FxCurrency, FxModelCatalogItem, FxBenchmarkExperiment } from '../types';

interface FxResearchLabProps {
  activeCurrency: FxCurrency;
  models: FxModelCatalogItem[];
  experiments: FxBenchmarkExperiment[];
  experimentsLoading: boolean;
  benchmarkRunning: boolean;
  onRunBenchmark: (horizon: number, stepSize: number) => Promise<any>;
}

export const FxResearchLab: React.FC<FxResearchLabProps> = ({
  activeCurrency,
  models,
  experiments,
  experimentsLoading,
  benchmarkRunning,
  onRunBenchmark
}) => {
  const [sortField, setSortField] = useState<'rmse' | 'mae' | 'theilU' | 'coverageRate95Pct'>('rmse');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [selectedExperiment, setSelectedExperiment] = useState<FxBenchmarkExperiment | null>(null);

  // Formulario de ejecución administrativa
  const [execHorizon, setExecHorizon] = useState<number>(1);
  const [execStepSize, setExecStepSize] = useState<number>(3); // 3 for safe resource consumption
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [execSuccessMsg, setExecSuccessMsg] = useState<string | null>(null);
  const [execErrorMsg, setExecErrorMsg] = useState<string | null>(null);

  // Sorted experiments
  const sortedExperiments = useMemo(() => {
    const list = [...experiments];
    list.sort((a, b) => {
      let valA: number = Infinity;
      let valB: number = Infinity;
      if (sortField === 'theilU') {
        valA = a.metrics?.benchmark?.theilU ?? Infinity;
        valB = b.metrics?.benchmark?.theilU ?? Infinity;
      } else if (sortField === 'rmse') {
        valA = a.metrics?.rmse ?? Infinity;
        valB = b.metrics?.rmse ?? Infinity;
      } else if (sortField === 'mae') {
        valA = a.metrics?.mae ?? Infinity;
        valB = b.metrics?.mae ?? Infinity;
      } else if (sortField === 'coverageRate95Pct') {
        valA = a.metrics?.coverageRate95Pct ?? Infinity;
        valB = b.metrics?.coverageRate95Pct ?? Infinity;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [experiments, sortField, sortAsc]);

  const handleSort = (field: 'rmse' | 'mae' | 'theilU' | 'coverageRate95Pct') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleTriggerExecute = async () => {
    try {
      setExecErrorMsg(null);
      setExecSuccessMsg(null);
      setConfirmModalOpen(false);
      const res = await onRunBenchmark(execHorizon, execStepSize);
      setExecSuccessMsg(`Suite completada con éxito. ${res?.benchmarkLeaderboard?.length || 6} modelos evaluados.`);
    } catch (err: any) {
      setExecErrorMsg(err.message || 'Error al ejecutar benchmark');
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Laboratorio */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Layers size={18} className="text-cyan-400" />
            <span>Laboratorio Econométrico Cuantitativo (Nivel 3.1)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Espacio científico para benchmarking multi-modelo con validación Walk-Forward sin sesgo temporal (*Zero Lookahead*).
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-slate-300">
            PostgreSQL Read-Only
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-800 text-cyan-300">
            Inmutabilidad Garantizada
          </span>
        </div>
      </div>

      {/* Catálogo de Modelos */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <FileCode2 size={16} className="text-blue-400" />
            <span>Catálogo Canónico de Modelos de Series Temporales</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">6 modelos activos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {models.map(m => {
            const isApproved = m.category === 'BASELINE';
            const isExperimental = m.category === 'AUTOREGRESSIVE' || m.category === 'VOLATILITY';
            const statusLabel = isApproved ? 'APROBADO PARA CONSULTA' : isExperimental ? 'EXPERIMENTAL (FASE 3)' : 'INDICADOR DESCRIPTIVO';
            const statusColor = isApproved ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : isExperimental ? 'bg-cyan-950 text-cyan-300 border-cyan-800' : 'bg-neutral-900 text-slate-400 border-neutral-800';

            return (
              <div key={m.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-white truncate">{m.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${statusColor} shrink-0`}>
                    {m.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed min-h-[38px]">{m.description}</p>
                <div className="border-t border-neutral-800 pt-2 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Estado:</span>
                  <span className="font-mono text-slate-300">{statusLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla Comparativa de Backtesting */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              <span>Resultados de Validación Walk-Forward Out-of-Sample ({activeCurrency}/DOP)</span>
            </h4>
            <p className="text-xs text-slate-400">
              Evaluación estrictamente fuera de muestra. Haz clic en las columnas para ordenar por métrica.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Dataset Oficial: BCRD USD/DOP
          </div>
        </div>

        {experimentsLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            Consultando experimentos registrados...
          </div>
        ) : sortedExperiments.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400">
            No hay experimentos registrados para {activeCurrency}. Puedes ejecutar una suite de benchmark abajo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-slate-400 border-b border-neutral-800 font-mono">
                <tr>
                  <th className="p-3">Modelo</th>
                  <th className="p-3">Horizonte</th>
                  <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('mae')}>
                    <div className="flex items-center gap-1">
                      <span>MAE (DOP)</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('rmse')}>
                    <div className="flex items-center gap-1">
                      <span>RMSE (DOP)</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3">Sesgo (Bias)</th>
                  <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('coverageRate95Pct')}>
                    <div className="flex items-center gap-1">
                      <span>Cobertura 95%</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('theilU')}>
                    <div className="flex items-center gap-1">
                      <span>Theil's U</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3">¿Supera RW?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono">
                {sortedExperiments.map((exp, idx) => {
                  const m = exp.metrics;
                  const theil = m?.benchmark?.theilU ?? 1.0;
                  const beats = m?.benchmark?.beatsRandomWalk;
                  const isLeader = idx === 0 && sortField === 'rmse' && sortAsc;

                  return (
                    <tr
                      key={exp.experimentId || idx}
                      onClick={() => setSelectedExperiment(exp)}
                      className={`hover:bg-neutral-800/40 cursor-pointer transition-colors ${
                        isLeader ? 'bg-cyan-950/20 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 text-white font-sans flex items-center gap-2">
                        <span>{exp.modelName}</span>
                        {isLeader && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 font-mono">
                            LÍDER
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300">+{exp.horizon}d</td>
                      <td className="p-3 text-slate-200">{m?.mae?.toFixed(4) ?? '--'}</td>
                      <td className="p-3 text-cyan-300 font-bold">{m?.rmse?.toFixed(4) ?? '--'}</td>
                      <td className="p-3 text-slate-400">{m?.bias ? `${m.bias > 0 ? '+' : ''}${m.bias.toFixed(4)}` : '--'}</td>
                      <td className="p-3 text-emerald-400">{m?.coverageRate95Pct?.toFixed(2) ?? '--'}%</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded ${
                          theil < 1.0 ? 'bg-emerald-950 text-emerald-300 font-bold' : 'text-slate-400'
                        }`}>
                          {theil.toFixed(4)}
                        </span>
                      </td>
                      <td className="p-3">
                        {beats ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={13} /> SÍ
                          </span>
                        ) : (
                          <span className="text-slate-500">NO</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de Experimentos Persistidos y Consola de Ejecución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial de Experimentos Persistidos */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Database size={16} className="text-purple-400" />
              <span>Registro de Experimentos Persistidos</span>
            </h4>
            <span className="text-xs text-slate-400 font-mono">{experiments.length} experimentos</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {experiments.map(exp => (
              <div
                key={exp.experimentId}
                onClick={() => setSelectedExperiment(exp)}
                className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-colors cursor-pointer text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-white font-bold truncate max-w-[200px]">{exp.modelName}</span>
                  <span className="text-cyan-400">h={exp.horizon}d</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>ID: {exp.experimentId.slice(0, 18)}...</span>
                  <span>RMSE: {exp.metrics?.rmse?.toFixed(4)}</span>
                </div>
                {exp.datasetHash && (
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Hash size={10} />
                    <span>Hash SHA-256: {exp.datasetHash.slice(0, 16)}...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Consola Administrativa de Ejecución Controlada */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Play size={16} className="text-emerald-400" />
              <span>Ejecución Experimental Bajo Demanda (Admin)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Dispara el cálculo walk-forward completo en el backend con protección de CPU y memoria.
            </p>
          </div>

          <div className="space-y-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Horizonte a Evaluar:</label>
              <select
                value={execHorizon}
                onChange={e => setExecHorizon(parseInt(e.target.value, 10))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={1}>h = 1 día hábil (Diario)</option>
                <option value={5}>h = 5 días hábiles (Semanal)</option>
                <option value={20}>h = 20 días hábiles (Mensual)</option>
                <option value={60}>h = 60 días hábiles (Trimestral)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Paso de Ventana (Step Size):</label>
              <select
                value={execStepSize}
                onChange={e => setExecStepSize(parseInt(e.target.value, 10))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={1}>Paso 1 (Exhaustivo ~180 ventanas - Alto cómputo)</option>
                <option value={3}>Paso 3 (Recomendado ~60 ventanas - Cómputo balanceado)</option>
                <option value={5}>Paso 5 (Rápido ~36 ventanas - Cómputo ultra-ligero)</option>
              </select>
            </div>

            <div className="p-2.5 bg-neutral-900/70 border border-neutral-800 rounded-lg text-[11px] text-slate-400">
              <Shield size={13} className="text-emerald-400 inline mr-1" />
              Requiere rol de Administrador. Protegido contra ejecuciones concurrentes.
            </div>

            {execSuccessMsg && (
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded-lg text-emerald-300 text-[11px]">
                {execSuccessMsg}
              </div>
            )}

            {execErrorMsg && (
              <div className="p-2.5 bg-rose-950/50 border border-rose-800/60 rounded-lg text-rose-300 text-[11px]">
                {execErrorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={benchmarkRunning}
              onClick={() => setConfirmModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-sans transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {benchmarkRunning ? (
                <>
                  <RotateCcw size={14} className="animate-spin" />
                  <span>Ejecutando Benchmark...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Ejecutar Benchmark Walk-Forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Ejecución */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 max-w-md w-full p-5 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle size={20} />
              </div>
              <h4 className="font-bold text-sm text-white">Confirmar Ejecución Experimental</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Vas a ejecutar el benchmarking out-of-sample para <strong>{activeCurrency}/DOP</strong> con horizonte <strong>h={execHorizon}d</strong> y paso <strong>{execStepSize}</strong>. Esta operación evalúa los 6 modelos econométricos y actualiza la tabla de líderes.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-300 text-xs cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTriggerExecute}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-950"
              >
                Confirmar y Ejecutar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Experimento */}
      {selectedExperiment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 max-w-lg w-full p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white">{selectedExperiment.modelName}</h4>
                <span className="text-[11px] font-mono text-cyan-400">Horizonte h = {selectedExperiment.horizon} días</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExperiment(null)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-slate-400 block text-[10px]">MAE (ERROR ABSOLUTO)</span>
                <span className="font-bold text-white text-sm">{selectedExperiment.metrics?.mae?.toFixed(4) || '--'} DOP</span>
              </div>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-slate-400 block text-[10px]">RMSE (RAÍZ ERROR CUADRÁTICO)</span>
                <span className="font-bold text-cyan-400 text-sm">{selectedExperiment.metrics?.rmse?.toFixed(4) || '--'} DOP</span>
              </div>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-slate-400 block text-[10px]">COEFICIENTE U DE THEIL</span>
                <span className="font-bold text-emerald-400 text-sm">{selectedExperiment.metrics?.benchmark?.theilU?.toFixed(4) || '1.0000'}</span>
              </div>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-slate-400 block text-[10px]">COBERTURA 95%</span>
                <span className="font-bold text-white text-sm">{selectedExperiment.metrics?.coverageRate95Pct?.toFixed(2) || '--'}%</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] font-mono text-slate-400 space-y-1">
              <p>ID: {selectedExperiment.experimentId}</p>
              <p>Tiempo de ejecución: {selectedExperiment.runtimeMs} ms</p>
              <p>Pronósticos evaluados: {selectedExperiment.forecastCount}</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedExperiment(null)}
                className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
