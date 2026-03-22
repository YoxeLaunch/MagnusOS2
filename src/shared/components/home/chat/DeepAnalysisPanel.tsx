import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../../../utils/apiFetch';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
interface SnapshotMetrics {
    totalIncome?: string | number;
    totalExpenses?: string | number;
    balance?: string | number;
    savingsRate?: number;
    topCategories?: { name: string; amount: string }[];
    txCount?: number;
    currency?: string;
    totalIncomeUSD?: string | number;
    totalExpensesUSD?: string | number;
    balanceUSD?: string | number;
    exchangeRate?: number;
}

interface AIStructuredResponse {
    analisis_ejecutivo: string;
    alertas_criticas: string[];
    recomendaciones: string[];
    distribucion_gastos: { categoria: string; porcentaje: number; comentario: string }[];
}

interface AnalysisData {
    response: string;
    structured?: AIStructuredResponse;
    cached: boolean;
    period: string;
    tokens_used?: number;
    offline?: boolean;
    metrics?: SnapshotMetrics;
}

interface AvailableSnapshot {
    id: number;
    period: string;
    tokens_used: number;
    created_at: string;
    computed_metrics: SnapshotMetrics;
}

interface DeepAnalysisPanelProps {
    userId: string;
    onClose: () => void;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
const fmtDOP = (val?: string | number): string => {
    if (val === undefined || val === null || val === '') return 'N/A';
    const n = parseFloat(String(val));
    if (isNaN(n)) return 'N/A';
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(n);
};

const fmtUSD = (val?: string | number): string => {
    if (val === undefined || val === null || val === '') return '';
    const n = parseFloat(String(val));
    if (isNaN(n) || n === 0) return '';
    return `≈ US$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const fmtPeriod = (p: string) => {
    if (!p) return '';
    const d = new Date(p);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
};

// ──────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────
const SkeletonLine: React.FC<{ width?: string }> = ({ width = 'w-full' }) => (
    <div className={`h-3 ${width} rounded-full bg-gradient-to-r from-slate-700/80 via-slate-600/30 to-slate-700/80 animate-pulse`} />
);

const AnalysisSkeleton = () => (
    <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-3 rounded-xl bg-slate-800/50 space-y-2">
                    <SkeletonLine width="w-1/2" />
                    <SkeletonLine width="w-3/4" />
                    <SkeletonLine width="w-1/3" />
                </div>
            ))}
        </div>
        <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <SkeletonLine key={i} width={i % 3 === 0 ? 'w-4/5' : i % 2 === 0 ? 'w-full' : 'w-5/6'} />
            ))}
        </div>
    </div>
);

const MetricCard: React.FC<{
    label: string;
    dop: string;
    usd?: string;
    icon: string;
    colorClass: string;
    sub?: string;
}> = ({ label, dop, usd, icon, colorClass, sub }) => (
    <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:border-slate-600/60 transition-colors`}
    >
        <div className="flex items-center gap-1.5 mb-1.5">
            <span>{icon}</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">{label}</span>
        </div>
        <div className={`text-base font-black ${colorClass} leading-tight`}>{dop}</div>
        {usd && <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{usd}</div>}
        {sub && <div className="text-[9px] text-slate-600 mt-0.5">{sub}</div>}
    </motion.div>
);

const StructuredReport: React.FC<{ data?: AIStructuredResponse; fallbackResponse?: string }> = ({ data, fallbackResponse }) => {
    if (!data) {
        return (
            <div className="rounded-xl bg-slate-800/30 border border-violet-500/15 p-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none text-slate-300 text-[12.5px]">
                    {fallbackResponse || ''}
                </ReactMarkdown>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Executive Summary */}
            <div className="rounded-xl bg-slate-800/30 border border-violet-500/15 overflow-hidden shadow-lg shadow-violet-900/5">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 bg-violet-900/10">
                    <span className="text-violet-400 text-xs">✦</span>
                    <span className="text-[9px] text-violet-400 uppercase tracking-wider font-bold">Resumen Ejecutivo</span>
                </div>
                <div className="p-3.5">
                    <p className="text-slate-300 text-[13px] leading-relaxed font-medium">{data.analisis_ejecutivo}</p>
                </div>
            </div>

            {/* Critical Alerts */}
            {data.alertas_criticas?.length > 0 && (
                <div className="rounded-xl bg-red-900/5 border border-red-500/20 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-red-500/10 bg-red-900/20">
                        <span className="text-red-400 text-xs">⚠️</span>
                        <span className="text-[9px] text-red-400 uppercase tracking-wider font-bold text-shadow-sm">Alertas Críticas</span>
                    </div>
                    <div className="p-3 space-y-2.5">
                        {data.alertas_criticas.map((alert: string, i: number) => (
                            <div key={i} className="flex gap-2.5 text-xs text-red-200/90 leading-snug">
                                <span className="text-red-500/60 font-black mt-0.5 font-mono">•</span>
                                <p>{alert}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {data.recomendaciones?.length > 0 && (
                <div className="rounded-xl bg-emerald-900/5 border border-emerald-500/20 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-emerald-500/10 bg-emerald-900/20">
                        <span className="text-emerald-400 text-xs">✅</span>
                        <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold">Recomendaciones</span>
                    </div>
                    <div className="p-3 space-y-2.5">
                        {data.recomendaciones.map((rec: string, i: number) => (
                            <div key={i} className="flex gap-2.5 text-xs text-emerald-200/90 leading-snug">
                                <span className="text-emerald-500 font-black">→</span>
                                <p>{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI distribution check */}
            {data.distribucion_gastos?.length > 0 && (
                <div className="rounded-xl bg-slate-900/40 border border-slate-700/30 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 bg-slate-800/30">
                        <span className="text-amber-400 text-xs">📊</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Insights de IA por Categoría</span>
                    </div>
                    <div className="p-3 space-y-4">
                        {data.distribucion_gastos.map((item: any, i: number) => (
                            <div key={i} className="group">
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-slate-200 font-bold group-hover:text-violet-300 transition-colors">{item.categoria}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-mono font-bold text-[10px]">{item.porcentaje}%</span>
                                </div>
                                <div className="relative p-2.5 rounded-lg bg-slate-800/30 border border-slate-700/20 group-hover:border-violet-500/20 transition-all">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-600/30 group-hover:bg-violet-600 transition-colors rounded-l-lg" />
                                    <p className="text-[10px] text-slate-400 leading-relaxed italic last:mb-0">
                                        "{item.comentario}"
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ──────────────────────────────────────────
// Main Panel
// ──────────────────────────────────────────
export const DeepAnalysisPanel: React.FC<DeepAnalysisPanelProps> = ({ userId, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [snapshots, setSnapshots] = useState<AvailableSnapshot[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [error, setError] = useState<string | null>(null);
    // 'main' = main view, 'history' = full report manager
    const [panelView, setPanelView] = useState<'main' | 'history'>('main');
    const [viewingSnap, setViewingSnap] = useState<AvailableSnapshot | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadSnapshots = useCallback(async () => {
        try {
            const res = await apiFetch('/api/ai/snapshots');
            const data = await res.json();
            if (data.snapshots) setSnapshots(data.snapshots);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

    const runAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        setAnalysisData(null);

        const now = new Date();
        const period = selectedPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        try {
            const res = await apiFetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Análisis financiero completo del período ${period}. Incluye resumen ejecutivo, métricas DOP con equivalente USD, análisis por categoría, patrones, alertas y recomendaciones.`,
                    userId, mode: 'deep', period
                })
            });

            if (res.status === 429) { setError('🚫 Límite diario (10/día) alcanzado. Vuelve mañana.'); return; }
            const data = await res.json();
            if (data.error) { setError(data.error); return; }
            setAnalysisData(data);
            await loadSnapshots();
        } catch (err: any) {
            setError('Error de conexión: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, selectedPeriod, loadSnapshots]);

    // Load a saved snapshot into the main view
    const loadSnapshot = async (snap: AvailableSnapshot) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch(`/api/ai/snapshots/${snap.id}`);
            const data = await res.json();
            if (data.snapshot) {
                const s = data.snapshot;
                const metrics = s.computed_metrics || {};
                
                // Extract structured data from metrics if available, or try to reconstruct
                const structured: AIStructuredResponse = {
                    analisis_ejecutivo: s.gemini_narrative || '',
                    alertas_criticas: s.gemini_alerts || [],
                    recomendaciones: s.gemini_recommendations || [],
                    distribucion_gastos: metrics.distribution || []
                };

                setAnalysisData({
                    response: s.gemini_narrative || '',
                    structured,
                    cached: true,
                    period: s.period,
                    metrics,
                    tokens_used: s.tokens_used
                });
                setSelectedPeriod(s.period);
                setPanelView('main');
            }
        } catch (err: any) {
            setError('Error al cargar reporte: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Delete a snapshot
    const deleteSnapshot = async (id: number) => {
        setDeletingId(id);
        try {
            const res = await apiFetch(`/api/ai/snapshots/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.ok) {
                await loadSnapshots();
                if (viewingSnap?.id === id) setViewingSnap(null);
                // If we're showing this one, clear it
                if (analysisData?.period === snapshots.find(s => s.id === id)?.period) {
                    setAnalysisData(null);
                }
            } else {
                setError(data.error || 'Error al eliminar.');
            }
        } catch (err: any) {
            setError('Error al eliminar: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const currentMetrics: SnapshotMetrics | null =
        analysisData?.metrics ||
        (analysisData?.cached ? snapshots.find(s => s.period === analysisData.period)?.computed_metrics ?? null : null);

    const hasMetrics = currentMetrics && (
        currentMetrics.totalIncome !== undefined && currentMetrics.totalIncome !== null
    );

    // ─── HISTORY VIEW ───
    if (panelView === 'history') {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-violet-500/20 shadow-2xl overflow-hidden"
                style={{ minHeight: 0 }}
            >
                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate-800/30">
                    <button onClick={() => setPanelView('main')} className="text-slate-400 hover:text-white transition-colors text-sm">←</button>
                    <div className="flex-1">
                        <h3 className="text-xs font-bold text-white">Gestión de Reportes</h3>
                        <p className="text-[9px] text-slate-400">{snapshots.length} reporte(s) guardado(s)</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white text-xs transition-colors">✕</button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 0 }}>
                    {snapshots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center space-y-2">
                            <span className="text-3xl opacity-30">📭</span>
                            <p className="text-xs text-slate-500">No hay reportes guardados aún.</p>
                        </div>
                    ) : snapshots.map(snap => (
                        <motion.div
                            key={snap.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 hover:border-violet-500/30 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-white capitalize">{fmtPeriod(snap.period)}</span>
                                        {snap.tokens_used > 0 && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
                                                {snap.tokens_used}t
                                            </span>
                                        )}
                                    </div>
                                    {snap.computed_metrics && (
                                        <div className="text-[10px] text-slate-400 space-y-0.5">
                                            {snap.computed_metrics.totalIncome !== undefined && (
                                                <p>💰 {fmtDOP(snap.computed_metrics.totalIncome)} <span className="text-slate-600">{fmtUSD(snap.computed_metrics.totalIncomeUSD)}</span></p>
                                            )}
                                            {snap.computed_metrics.totalExpenses !== undefined && (
                                                <p>💸 {fmtDOP(snap.computed_metrics.totalExpenses)} <span className="text-slate-600">{fmtUSD(snap.computed_metrics.totalExpensesUSD)}</span></p>
                                            )}
                                            {snap.computed_metrics.savingsRate !== undefined && (
                                                <p>📈 Ahorro: {snap.computed_metrics.savingsRate}%</p>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-[9px] text-slate-600 mt-1">
                                        Generado: {new Date(snap.created_at).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    <button
                                        onClick={() => loadSnapshot(snap)}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-violet-700/40 text-violet-300 hover:bg-violet-700/70 transition-colors border border-violet-600/30"
                                    >
                                        Cargar
                                    </button>
                                    <button
                                        onClick={() => deleteSnapshot(snap.id)}
                                        disabled={deletingId === snap.id}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-red-900/30 text-red-400 hover:bg-red-900/60 transition-colors border border-red-800/30 disabled:opacity-50"
                                    >
                                        {deletingId === snap.id ? '...' : 'Borrar'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {error && (
                    <div className="shrink-0 mx-3 mb-3 p-2 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-xs">
                        {error}
                    </div>
                )}
            </motion.div>
        );
    }

    // ─── MAIN VIEW ───
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-violet-500/20 shadow-2xl overflow-hidden"
            style={{ minHeight: 0 }}
        >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-violet-900/25 to-teal-900/10">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-teal-600 flex items-center justify-center shadow-lg shrink-0">
                        <span className="text-sm">📊</span>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-white leading-tight">Análisis Profundo</h3>
                        <p className="text-[9px] text-slate-400">Motor mensual · Gemini 2.5 Flash · RD$/USD</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPanelView('history')}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-violet-300 text-xs"
                        title="Gestionar reportes"
                    >
                        📋
                        {snapshots.length > 0 && (
                            <span className="ml-0.5 text-[9px] text-violet-400">{snapshots.length}</span>
                        )}
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white text-xs">✕</button>
                </div>
            </div>

            {/* Controls */}
            <div className="shrink-0 px-3 py-2.5 border-b border-white/5 flex items-center gap-2 bg-slate-900/30">
                <select
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="flex-1 text-xs bg-slate-800 border border-slate-700/80 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500/70 transition-colors"
                >
                    <option value="">Mes actual</option>
                    {snapshots.map(s => (
                        <option key={s.id} value={s.period}>
                            ✓ {fmtPeriod(s.period)}
                        </option>
                    ))}
                </select>
                <motion.button
                    onClick={runAnalysis}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white
                        bg-gradient-to-r from-violet-700 to-teal-600
                        hover:from-violet-600 hover:to-teal-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200 shrink-0 border border-white/10"
                    style={{ boxShadow: '0 2px 10px rgba(139,92,246,0.3)' }}
                >
                    {loading ? (
                        <motion.div
                            className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                    ) : <span>✦</span>}
                    {loading ? 'Analizando...' : 'Generar'}
                </motion.button>
            </div>

            {/* Status badges */}
            {analysisData && !loading && (
                <div className="shrink-0 px-3 py-1.5 flex items-center gap-1.5 flex-wrap border-b border-white/5 bg-slate-900/20">
                    {analysisData.cached
                        ? <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">⚡ Caché · 0 tokens</span>
                        : <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/30">🔮 {analysisData.tokens_used ?? 0} tokens</span>
                    }
                    {analysisData.offline && <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">⚠️ Offline</span>}
                    {analysisData.period && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
                            📅 {fmtPeriod(analysisData.period)}
                        </span>
                    )}
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">🇩🇴 RD$ + US$</span>
                </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <div className="p-3 space-y-4">
                    <AnimatePresence mode="wait">

                        {loading && (
                            <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <AnalysisSkeleton />
                            </motion.div>
                        )}

                        {error && !loading && (
                            <motion.div key="err" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-xs leading-relaxed">
                                {error}
                                <button onClick={() => setError(null)} className="ml-2 underline hover:text-red-200">Cerrar</button>
                            </motion.div>
                        )}

                        {analysisData && !loading && (
                            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                                {/* Metrics grid */}
                                {hasMetrics && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <MetricCard
                                            label="Ingresos"
                                            dop={fmtDOP(currentMetrics!.totalIncome)}
                                            usd={fmtUSD(currentMetrics!.totalIncomeUSD)}
                                            icon="💰"
                                            colorClass="text-emerald-400"
                                            sub={currentMetrics!.txCount ? `${currentMetrics!.txCount} transacciones` : undefined}
                                        />
                                        <MetricCard
                                            label="Gastos"
                                            dop={fmtDOP(currentMetrics!.totalExpenses)}
                                            usd={fmtUSD(currentMetrics!.totalExpensesUSD)}
                                            icon="💸"
                                            colorClass="text-red-400"
                                        />
                                        <MetricCard
                                            label="Balance"
                                            dop={fmtDOP(currentMetrics!.balance)}
                                            usd={fmtUSD(currentMetrics!.balanceUSD)}
                                            icon="⚖️"
                                            colorClass={parseFloat(String(currentMetrics!.balance ?? '0')) >= 0 ? 'text-amber-400' : 'text-red-500'}
                                        />
                                        <MetricCard
                                            label="Ahorro"
                                            dop={currentMetrics!.savingsRate !== undefined ? `${currentMetrics!.savingsRate}%` : 'N/A'}
                                            icon="📈"
                                            colorClass="text-teal-400"
                                        />
                                    </div>
                                )}

                                {/* Top categories */}
                                {currentMetrics?.topCategories && currentMetrics.topCategories.length > 0 && (
                                    <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-2.5 flex items-center gap-1">
                                            🏷️ Top Categorías de Gasto
                                        </p>
                                        <div className="space-y-2">
                                            {currentMetrics.topCategories.map((cat, i) => {
                                                const total = parseFloat(String(currentMetrics.totalExpenses ?? '1')) || 1;
                                                const pct = Math.min((parseFloat(cat.amount) / total) * 100, 100);
                                                return (
                                                    <div key={i}>
                                                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                                                            <span className="text-slate-300 truncate max-w-[55%]">{cat.name}</span>
                                                            <div className="text-right">
                                                                <span className="text-slate-300 font-mono">{fmtDOP(cat.amount)}</span>
                                                                {currentMetrics.exchangeRate && (
                                                                    <span className="text-slate-600 ml-1 text-[9px]">{fmtUSD((parseFloat(cat.amount) * (currentMetrics.exchangeRate ?? 0.01695)).toFixed(2))}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-violet-600 to-teal-600 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {analysisData.response && (
                                    <StructuredReport 
                                        data={analysisData.structured} 
                                        fallbackResponse={analysisData.response} 
                                    />
                                )}

                            </motion.div>
                        )}

                        {!loading && !analysisData && !error && (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-300">Sin análisis cargado</p>
                                    <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed mt-1">
                                        Pulsa <strong className="text-violet-400">Generar</strong> o carga un reporte anterior desde <span className="text-violet-400">📋</span>.
                                    </p>
                                </div>
                                {snapshots.length > 0 && (
                                    <button
                                        onClick={() => setPanelView('history')}
                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 underline transition-colors"
                                    >
                                        ✓ {snapshots.length} reporte(s) guardado(s) disponibles →
                                    </button>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
