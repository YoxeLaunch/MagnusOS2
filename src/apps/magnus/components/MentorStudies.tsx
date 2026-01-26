import React, { useState } from 'react';
import { CURRICULUM_2026 } from '../constants';
import { Check, Lock, ChevronDown, Trophy, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModuleModal } from './ModuleModal';
import { CurriculumModule } from '../types';

export const MentorStudies: React.FC = () => {
    const [selectedModule, setSelectedModule] = useState<CurriculumModule | null>(null);

    // In a real app, this should be in DB/Context
    // Mocking progress state:
    const [moduleProgress, setModuleProgress] = useState<{ [moduleId: string]: { reading: boolean; habit: boolean; mission: boolean } }>({
        'm1': { reading: false, habit: false, mission: false },
        'm2': { reading: false, habit: false, mission: false },
        'm3': { reading: false, habit: false, mission: false }
    });

    const handleToggleItem = (moduleId: string, item: 'reading' | 'habit' | 'mission') => {
        setModuleProgress(prev => ({
            ...prev,
            [moduleId]: {
                ...prev[moduleId] || { reading: false, habit: false, mission: false },
                [item]: !prev[moduleId]?.[item]
            }
        }));
    };

    const getProgress = (id: string) => moduleProgress[id] || { reading: false, habit: false, mission: false };

    const calculateTotalProgress = () => {
        let totalItems = 0;
        let completedItems = 0;

        CURRICULUM_2026.forEach(module => {
            if (module.status !== 'locked') {
                totalItems += 3; // reading, habit, mission
                const progress = getProgress(module.id);
                if (progress.reading) completedItems++;
                if (progress.habit) completedItems++;
                if (progress.mission) completedItems++;
            }
        });

        if (totalItems === 0) return 0;
        return Math.round((completedItems / totalItems) * 100);
    };

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col h-full shadow-2xl relative overflow-hidden transition-colors duration-300">

            {/* Header */}
            <div className="p-6 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 z-10">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="text-theme-gold" size={24} />
                        EL CAMINO DEL SOBERANO
                    </h2>
                    <div className="px-3 py-1 rounded-full bg-theme-gold/10 border border-theme-gold/20 text-theme-gold text-xs font-bold uppercase tracking-wider">
                        Pensum 2026
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest">
                    <span>Progreso Anual</span>
                    <span>{calculateTotalProgress()}% Completado</span>
                </div>
                {/* Progress Bar */}
                <div className="mt-2 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-theme-gold via-yellow-400 to-theme-gold shadow-[0_0_10px_rgba(212,175,55,0.3)] transition-all duration-1000"
                        style={{ width: `${calculateTotalProgress()}%` }}
                    ></div>
                </div>
            </div>

            {/* Timeline Scroll Area */}
            <div className="flex-1 overflow-y-auto relative p-6 custom-scrollbar">
                {/* Connecting Line */}
                <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-white/10 z-0"></div>

                <div className="space-y-8 relative z-10">
                    {CURRICULUM_2026.map((module, index) => {
                        const isLocked = module.status === 'locked';
                        const isCompleted = module.status === 'completed';
                        const isActive = module.status === 'active';

                        const currentModuleProgress = getProgress(module.id);
                        const progressPercent =
                            (Number(currentModuleProgress.reading) + Number(currentModuleProgress.habit) + Number(currentModuleProgress.mission)) / 3 * 100;

                        return (
                            <div
                                key={module.id}
                                onClick={() => !isLocked && setSelectedModule(module)}
                                className={`
                                    group relative pl-16 transition-all duration-300
                                    ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:translate-x-1'}
                                `}
                            >
                                {/* Node */}
                                <div className={`
                                    absolute left-0 w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 bg-white dark:bg-slate-900 transition-all duration-300
                                    ${isCompleted
                                        ? 'border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                        : isActive
                                            ? 'border-theme-gold text-theme-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-110'
                                            : 'border-slate-300 dark:border-slate-700 text-slate-300 dark:text-slate-700'
                                    }
                                `}>
                                    {isCompleted ? <Check size={16} strokeWidth={3} /> : isLocked ? <Lock size={14} /> : <span className="text-xs font-bold">{index + 1}</span>}
                                </div>

                                {/* Card content */}
                                <div className={`
                                    p-4 rounded-xl border transition-all duration-300
                                    ${isActive
                                        ? 'bg-gradient-to-r from-theme-gold/10 to-transparent border-theme-gold/30'
                                        : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-theme-gold/20'
                                    }
                                `}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-theme-gold' : 'text-slate-400'}`}>
                                            {module.month}
                                        </span>
                                        {!isLocked && (
                                            <ChevronRight size={16} className={`transition-transform duration-300 ${isActive ? 'text-theme-gold translate-x-1' : 'text-slate-600 dark:text-slate-500 group-hover:text-theme-gold'}`} />
                                        )}
                                    </div>

                                    <h3 className={`font-serif font-bold text-lg mb-0.5 ${isLocked ? 'text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                                        {module.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{module.mentor}</p>

                                    {/* Mini Progress Bars for Module */}
                                    {!isLocked && (
                                        <div className="flex gap-1 h-1">
                                            <div className={`flex-1 rounded-full ${currentModuleProgress.reading ? 'bg-green-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                                            <div className={`flex-1 rounded-full ${currentModuleProgress.habit ? 'bg-green-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                                            <div className={`flex-1 rounded-full ${currentModuleProgress.mission ? 'bg-green-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedModule && (
                    <ModuleModal
                        module={selectedModule}
                        onClose={() => setSelectedModule(null)}
                        progress={getProgress(selectedModule.id)}
                        onToggleItem={(item) => handleToggleItem(selectedModule.id, item)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
