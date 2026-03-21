import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../../../utils/apiFetch';

interface SnapshotMetrics {
    totalIncome?: string;
    totalExpenses?: string;
    balance?: string;
    savingsRate?: number;
    topCategories?: { name: string; amount: string }[];
    txCount?: number;
}

interface AnalysisData {
    response: string;
    cached: boolean;
    period: string;
    tokens_used?: number;
    offline?: boolean;
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
// Skeleton shimmer loader
// ──────────────────────────────────────────
const SkeletonLine: React.FC<{ width?: string }> = ({ width = 'w-full' }) => (
    <div className={`h-4 ${width} rounded bg-gradient-to-r from-slate-700/60 via-slate-600/40 to-slate-700/60 animate-pulse`} />
);

const AnalysisSkeleton: React.FC = () => (
    <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-3 rounded-xl bg-slate-800/50 space-y-2">
                    <SkeletonLine width="w-2/3" />
                    <SkeletonLine width="w-1/2" />
                </div>
            ))}
        </div>
        <div className="space-y-2">
            <SkeletonLine />
            <SkeletonLine width="w-5/6" />
            <SkeletonLine width="w-4/5" />
        </div>
    </div>
);

// ──────────────────────────────────────────
// Metric Card
// ──────────────────────────────────────────
const MetricCard: React.FC<{ label: string; value: string; icon: string; color: string; sub?: string }> = ({
    label, value, icon, color, sub
}) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-${color}/40 transition-all`}
    >
        <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <div className={`text-lg font-bold text-${color}`}>{value}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </motion.div>
);

// ──────────────────────────────────────────
// Main Panel
// ──────────────────────────────────────────
export const DeepAnalysisPanel: React.FC<DeepAnalysisPanelProps> = ({ userId, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [availableSnapshots, setAvailableSnapshots] = useState<AvailableSnapshot[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Fetch available snapshot periods for the period selector
    useEffect(() => {
        const loadSnapshots = async () => {
            try {
                const res = await apiFetch('/api/ai/snapshots');
                const data = await res.json();
                if (data.snapshots) {
                    setAvailableSnapshots(data.snapshots);
                }
            } catch {
                // Silently fail — list will be empty
            }
        };
        loadSnapshots();
    }, []);

    const runDeepAnalysis = useCallback(async () => {
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
                    message: `Genera un análisis financiero completo del período ${period}`,
                    userId,
                    mode: 'deep',
                    period
                })
            });

            if (res.status === 429) {
                setError('🚫 Límite diario de análisis profundos alcanzado (10/día). Vuelve mañana.');
                return;
            }

            const data = await res.json();
            if (data.error) {
                setError(data.error);
                return;
            }

            setAnalysisData(data);
            // Reload snapshot list after new analysis
            const snapRes = await apiFetch('/api/ai/snapshots');
            const snapData = await snapRes.json();
            if (snapData.snapshots) setAvailableSnapshots(snapData.snapshots);
        } catch (err: any) {
            setError('Error al conectar con el servidor: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, selectedPeriod]);

    // Format period display
    const formatPeriod = (p: string) => {
        if (!p) return '';
        const d = new Date(p);
        return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    const currentMetrics = analysisData?.cached && availableSnapshots.find(s => s.period === analysisData.period)?.computed_metrics;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-violet-500/20 shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-violet-900/20 to-teal-900/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-teal-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <span className="text-sm">📊</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Análisis Profundo</h3>
                        <p className="text-[10px] text-slate-400">Motor mensual · Gemini 2.5 Flash</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                    ✕
                </button>
            </div>

            {/* Controls */}
            <div className="p-3 border-b border-white/5 flex items-center gap-2">
                {availableSnapshots.length > 0 && (
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(e.target.value)}
                        className="flex-1 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500"
                    >
                        <option value="">Mes actual</option>
                        {availableSnapshots.map(s => (
                            <option key={s.id} value={s.period}>
                                {formatPeriod(s.period)}
                            </option>
                        ))}
                    </select>
                )}
                <motion.button
                    onClick={runDeepAnalysis}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white
                        bg-gradient-to-r from-violet-700 to-teal-600 
                        hover:from-violet-600 hover:to-teal-500
                        shadow-lg shadow-violet-500/20
                        disabled:opacity-60 disabled:cursor-not-allowed
                        transition-all duration-200
                        border border-white/10"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 4px 12px rgba(139,92,246,0.3)' }}
                >
                    {loading ? (
                        <motion.div
                            className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                    ) : (
                        <span>✦</span>
                    )}
                    {loading ? 'Analizando...' : 'Generar Análisis'}
                </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                <AnimatePresence mode="wait">
                    {loading && (
                        <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <AnalysisSkeleton />
                        </motion.div>
                    )}

                    {error && !loading && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    {analysisData && !loading && (
                        <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            {/* Status badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {analysisData.cached && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                                        ⚡ Desde caché · 0 tokens
                                    </span>
                                )}
                                {analysisData.offline && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-medium">
                                        ⚠️ Modo Offline
                                    </span>
                                )}
                                {analysisData.tokens_used ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/30">
                                        🔮 {analysisData.tokens_used} tokens
                                    </span>
                                ) : null}
                                {analysisData.period && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
                                        📅 {formatPeriod(analysisData.period)}
                                    </span>
                                )}
                            </div>

                            {/* Metrics grid (if available from cache) */}
                            {currentMetrics && (
                                <div className="grid grid-cols-2 gap-2">
                                    <MetricCard
                                        label="Ingresos"
                                        value={currentMetrics.totalIncome ? `$${Number(currentMetrics.totalIncome).toLocaleString()}` : 'N/A'}
                                        icon="💰"
                                        color="emerald-400"
                                    />
                                    <MetricCard
                                        label="Gastos"
                                        value={currentMetrics.totalExpenses ? `$${Number(currentMetrics.totalExpenses).toLocaleString()}` : 'N/A'}
                                        icon="💸"
                                        color="red-400"
                                    />
                                    <MetricCard
                                        label="Balance"
                                        value={currentMetrics.balance ? `$${Number(currentMetrics.balance).toLocaleString()}` : 'N/A'}
                                        icon="⚖️"
                                        color="yellow-400"
                                    />
                                    <MetricCard
                                        label="Ahorro"
                                        value={currentMetrics.savingsRate ? `${currentMetrics.savingsRate}%` : 'N/A'}
                                        icon="📈"
                                        color="teal-400"
                                    />
                                </div>
                            )}

                            {/* AI Narrative (markdown) */}
                            <div className="rounded-xl bg-slate-800/40 border border-violet-500/10 p-4">
                                <div className="text-[10px] text-violet-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                                    <span>✦</span> Análisis Gemini
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none
                                    prose-p:leading-relaxed prose-p:my-1.5 prose-p:text-slate-200
                                    prose-headings:text-violet-300 prose-headings:font-bold prose-headings:my-2
                                    prose-strong:text-yellow-300 prose-strong:font-semibold
                                    prose-ul:text-slate-300 prose-ol:text-slate-300
                                    prose-li:my-0.5">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {analysisData.response}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {!loading && !analysisData && !error && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-32 text-center"
                        >
                            <div className="text-3xl mb-2">📊</div>
                            <p className="text-sm text-slate-400">
                                Pulsa <strong className="text-violet-300">Generar Análisis</strong> para obtener un informe detallado de tu situación financiera.
                            </p>
                            <p className="text-xs text-slate-600 mt-1">Si existe un análisis reciente, se servirá sin consumir tokens.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
