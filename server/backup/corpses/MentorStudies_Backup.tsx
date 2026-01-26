import React, { useState } from 'react';
import { MENTOR_STUDIES } from '../constants';
import { Check, Star, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export const MentorStudies: React.FC = () => {
    // In a real app, this state would be persisted
    const [completedStudies, setCompletedStudies] = useState<string[]>([]);

    const toggleStudy = (id: string) => {
        if (completedStudies.includes(id)) {
            setCompletedStudies(prev => prev.filter(s => s !== id));
        } else {
            setCompletedStudies(prev => [...prev, id]);
        }
    };

    const progress = Math.round((completedStudies.length / MENTOR_STUDIES.length) * 100);

    return (
        <div className="bg-white dark:bg-theme-card rounded-xl border border-slate-200 dark:border-white/5 p-6 flex flex-col h-full min-h-[400px] shadow-sm dark:shadow-none relative overflow-hidden">
            {/* Header */}
            <div className="relative z-10 mb-6">
                <h2 className="font-serif text-lg font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2 mb-2">
                    <span className="w-1 h-4 bg-theme-gold rounded-sm"></span>
                    ESTUDIOS MENTORÍA 2026
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-theme-gold transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <span>{progress}% Completado</span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 space-y-3">
                {MENTOR_STUDIES.map((study) => {
                    const isCompleted = completedStudies.includes(study.id);

                    return (
                        <motion.div
                            key={study.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`
                                group relative p-3 rounded-lg border transition-all duration-300 cursor-pointer
                                ${isCompleted
                                    ? 'bg-theme-gold/10 border-theme-gold/30'
                                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-white/20'
                                }
                            `}
                            onClick={() => toggleStudy(study.id)}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`
                                    flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors mt-0.5
                                    ${isCompleted
                                        ? 'bg-theme-gold border-theme-gold text-black'
                                        : 'border-slate-300 dark:border-slate-600 group-hover:border-theme-gold/50'
                                    }
                                `}>
                                    {isCompleted && <Check size={12} strokeWidth={4} />}
                                </div>

                                <div className="flex-1">
                                    <h4 className={`text-sm font-medium transition-colors ${isCompleted ? 'text-theme-gold' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {study.title}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 flex items-center gap-1">
                                        <Star size={10} className={isCompleted ? 'text-theme-gold' : 'text-slate-600'} />
                                        {study.mentor}
                                    </p>
                                </div>

                                {study.locked && !isCompleted && (
                                    <Lock size={14} className="text-slate-400 opacity-50" />
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 text-center relative z-10">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Sistema de Progreso Activo
                </p>
            </div>

            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-theme-gold/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        </div>
    );
};
