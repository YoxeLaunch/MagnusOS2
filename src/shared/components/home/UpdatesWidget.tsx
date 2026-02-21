import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Star, Zap, Bug, Construction, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiFetch } from '../../../../shared/utils/apiFetch';

interface Update {
    id: string;
    date: string;
    title: string;
    description: string;
    type: 'feature' | 'bugfix' | 'announcement' | 'improvement';
}

const TYPE_CONFIG = {
    feature: { icon: Star, color: 'text-theme-gold', bg: 'bg-theme-gold/10', label: 'Nueva Función' },
    bugfix: { icon: Bug, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Corrección' },
    announcement: { icon: Bell, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Anuncio' },
    improvement: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Mejora' },
};

export const UpdatesWidget = () => {
    const [updates, setUpdates] = useState<Update[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Use relative path to leverage Vite proxy
        apiFetch('/api/updates')
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                setUpdates(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch updates", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-center opacity-50">Cargando novedades...</div>;

    // Fallback if no updates found
    if (updates.length === 0) {
        return (
            <div className="w-full max-w-4xl mx-auto mt-12 mb-20 p-6 bg-card-light dark:bg-card-dark rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
                No hay novedades registradas.
            </div>
        );
    }

    const latestUpdate = updates[0];
    const previousUpdates = updates.slice(1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto mt-12 mb-20"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-theme-gold/10 text-theme-gold">
                    <Construction size={20} />
                </div>
                <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
                    Historial de Novedades
                </h3>
            </div>

            <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">

                {/* HEADLINE / LATEST UPDATE */}
                <div className="p-6 md:p-8 bg-gradient-to-r from-theme-gold/5 to-transparent relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${TYPE_CONFIG[latestUpdate.type]?.bg || 'bg-slate-500/10'} ${TYPE_CONFIG[latestUpdate.type]?.color || 'text-slate-500'}`}>
                                        {TYPE_CONFIG[latestUpdate.type]?.label || latestUpdate.type}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <Calendar size={12} />
                                        {format(new Date(latestUpdate.date), "d 'de' MMMM, yyyy", { locale: es })}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    {latestUpdate.title}
                                </h4>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {latestUpdate.description}
                                </p>
                            </div>

                            {/* Decorative Icon */}
                            {(() => {
                                const Icon = TYPE_CONFIG[latestUpdate.type]?.icon || Star;
                                return (
                                    <div className={`hidden md:flex p-3 rounded-xl ${TYPE_CONFIG[latestUpdate.type]?.bg} ${TYPE_CONFIG[latestUpdate.type]?.color}`}>
                                        <Icon size={24} />
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                </div>

                {/* PREVIOUS UPDATES (COLLAPSIBLE) */}
                {previousUpdates.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-white/5">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full px-6 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                            <span>Actualizaciones Anteriores ({previousUpdates.length})</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 pb-6 space-y-4">
                                        {previousUpdates.map((update, idx) => {
                                            const Icon = TYPE_CONFIG[update.type]?.icon || Star;
                                            return (
                                                <div key={idx} className="flex gap-4 pt-4 border-t border-slate-100 dark:border-white/5 first:border-0 first:pt-2">
                                                    <div className={`mt-1 p-2 rounded-lg h-fit ${TYPE_CONFIG[update.type]?.bg} ${TYPE_CONFIG[update.type]?.color}`}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">{update.title}</h5>
                                                            <span className="text-[10px] text-slate-400">
                                                                {format(new Date(update.date), "dd/MM/yy")}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                                            {update.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

            </div>
        </motion.div>
    );
};
