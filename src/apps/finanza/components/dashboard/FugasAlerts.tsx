import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, X, MessageSquare } from 'lucide-react';
import { apiFetch } from '../../../../shared/utils/apiFetch';
import { useAuth } from '../../../../shared/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Anomaly {
    id: string;
    date: string;
    category: string;
    amountActual: number;
    amountExpected: number;
    residual: number;
    zScore: number;
    description: string;
    status: 'pending' | 'justified';
    justification?: string;
}

/**
 * FugasAlerts — Dashboard widget showing statistically detected spending anomalies.
 * Allows users to justify/dismiss anomalies with an explanation.
 */
export const FugasAlerts: React.FC = () => {
    const { user } = useAuth();
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [justifyingId, setJustifyingId] = useState<string | null>(null);
    const [justifyText, setJustifyText] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);

    const fetchAnomalies = useCallback(async () => {
        if (!user?.username) return;
        try {
            const res = await apiFetch(`/api/econometrics/anomalies?userId=${user.username}&status=pending`);
            const data = await res.json();
            setAnomalies(data.anomalies || []);
        } catch (err) {
            console.error('[FugasAlerts] Error fetching anomalies');
        } finally {
            setIsLoading(false);
        }
    }, [user?.username]);

    useEffect(() => {
        fetchAnomalies();
    }, [fetchAnomalies]);

    const handleDetect = async () => {
        if (!user?.username) return;
        setIsDetecting(true);
        try {
            await apiFetch('/api/econometrics/detect-anomalies', {
                method: 'POST',
                body: JSON.stringify({ userId: user.username })
            });
            await fetchAnomalies();
        } catch (err) {
            console.error('[FugasAlerts] Detection error');
        } finally {
            setIsDetecting(false);
        }
    };

    const handleJustify = async (id: string) => {
        if (!justifyText.trim()) return;
        try {
            await apiFetch(`/api/econometrics/anomalies/${id}/justify`, {
                method: 'POST',
                body: JSON.stringify({ justification: justifyText.trim() })
            });
            setJustifyingId(null);
            setJustifyText('');
            await fetchAnomalies();
        } catch (err) {
            console.error('[FugasAlerts] Justify error');
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="text-amber-500" size={20} />
                    Fugas Financieras
                </h3>
                <button
                    id="btn-detect-anomalies"
                    onClick={handleDetect}
                    disabled={isDetecting}
                    className="text-xs px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors font-bold disabled:opacity-50"
                >
                    {isDetecting ? 'Analizando...' : 'Escanear'}
                </button>
            </div>

            {anomalies.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl">
                    <CheckCircle size={18} />
                    <span className="font-medium">Sin anomalías detectadas. Tu gasto sigue la tendencia estadística.</span>
                </div>
            ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                    <AnimatePresence mode="popLayout">
                        {anomalies.slice(0, 5).map((anomaly) => (
                            <motion.div
                                key={anomaly.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {anomaly.category}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {anomaly.date} &bull; Desviación: {Math.abs(anomaly.zScore).toFixed(1)}σ
                                            </p>
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                Real: RD${anomaly.amountActual.toLocaleString()} vs Esperado: RD${anomaly.amountExpected.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setJustifyingId(justifyingId === anomaly.id ? null : anomaly.id)}
                                        className="shrink-0 p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                                        title="Justificar"
                                    >
                                        {justifyingId === anomaly.id
                                            ? <X size={14} className="text-slate-400" />
                                            : <MessageSquare size={14} className="text-slate-400" />
                                        }
                                    </button>
                                </div>

                                {/* Justify Input */}
                                <AnimatePresence>
                                    {justifyingId === anomaly.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-3 overflow-hidden"
                                        >
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={justifyText}
                                                    onChange={(e) => setJustifyText(e.target.value)}
                                                    placeholder="Ej: Gasto médico imprevisto..."
                                                    maxLength={500}
                                                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                />
                                                <button
                                                    onClick={() => handleJustify(anomaly.id)}
                                                    disabled={!justifyText.trim()}
                                                    className="text-xs px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-bold disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    Justificar
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {anomalies.length > 5 && (
                        <p className="text-xs text-slate-400 text-center pt-1">
                            +{anomalies.length - 5} anomalías más
                        </p>
                    )}
                </div>
            )}

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 leading-relaxed">
                Detectadas mediante análisis de residuos estadísticos (z-score &gt; 2σ sobre regresión por categoría).
            </p>
        </div>
    );
};
