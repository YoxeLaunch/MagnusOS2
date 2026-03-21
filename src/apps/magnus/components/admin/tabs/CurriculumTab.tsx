import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Save, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../../../../shared/utils/apiFetch';

interface CurriculumTabProps {
    isSoberano: boolean;
}

export const CurriculumTab: React.FC<CurriculumTabProps> = ({ isSoberano }) => {
    const [curriculum, setCurriculum] = useState<any[]>([]);
    const [openModuleId, setOpenModuleId] = useState<string | null>(null);

    useEffect(() => {
        if (isSoberano) loadCurriculum();
    }, [isSoberano]);

    const loadCurriculum = async () => {
        try {
            const res = await apiFetch(`/api/curriculum`);
            const data = await res.json();
            setCurriculum(data);
            if (data.length > 0 && !openModuleId) {
                setOpenModuleId(data[0].id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const createMission = async (moduleId: string, text: string, week: number) => {
        try {
            await apiFetch(`/api/curriculum/mission`, {
                method: 'POST',
                body: JSON.stringify({ moduleId, text, week })
            });
            loadCurriculum();
        } catch (e) {
            console.error(e);
        }
    };

    const updateMission = async (id: string, text: string, week: number) => {
        try {
            await apiFetch(`/api/curriculum/mission`, {
                method: 'PUT',
                body: JSON.stringify({ id, text, week })
            });
        } catch (e) {
            console.error(e);
        }
    };

    const deleteMission = async (id: string) => {
        if (!confirm('¿Eliminar esta misión?')) return;
        try {
            await apiFetch(`/api/curriculum/mission`, {
                method: 'DELETE',
                body: JSON.stringify({ id })
            });
            loadCurriculum();
        } catch (e) {
            console.error(e);
        }
    };

    if (!isSoberano) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <BookOpen size={32} />
                </div>
                <p>Acceso restringido al Pensum</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="text-theme-gold" />
                        Editor del Pensum
                    </h3>
                    <p className="text-sm text-slate-500">Gestiona las misiones mensuales y su contenido</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-10">
                {curriculum.map((mod: any) => {
                    const isOpen = openModuleId === mod.id;
                    return (
                        <div
                            key={mod.id}
                            className={`bg-white dark:bg-slate-800 rounded-xl border transition-all duration-300 overflow-hidden ${isOpen
                                ? 'border-theme-gold/50 shadow-md ring-1 ring-theme-gold/20'
                                : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                                }`}
                        >
                            {/* Header / Accordion Toggle */}
                            <button
                                onClick={() => setOpenModuleId(isOpen ? null : mod.id)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-theme-gold text-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-theme-gold mb-0.5">{mod.month}</div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">{mod.title}</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <span className="text-[10px] uppercase text-slate-400 block">Mentor</span>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{mod.mentor || 'N/A'}</span>
                                    </div>
                                    {isOpen ? <ChevronDown className="text-theme-gold" /> : <ChevronRight className="text-slate-400" />}
                                </div>
                            </button>

                            {/* Content */}
                            {isOpen && (
                                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-white/5 animate-in slide-in-from-top-2 duration-200">
                                    <p className="text-sm text-slate-500 mb-6 italic border-l-2 border-theme-gold pl-3 py-1">
                                        {mod.description}
                                    </p>

                                    <div className="space-y-3">
                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Misiones Activas</h5>

                                        {mod.missions && mod.missions.map((mis: any) => (
                                            <div key={mis.id} className="flex gap-3 items-start group">
                                                <div className="w-12 shrink-0 pt-2">
                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded text-[10px] font-mono font-bold text-slate-500">W{mis.week}</span>
                                                </div>
                                                <div className="flex-1 relative">
                                                    <textarea
                                                        className="w-full bg-slate-50 dark:bg-black/20 text-sm text-slate-700 dark:text-slate-300 p-3 rounded-lg border border-transparent focus:border-theme-gold/50 focus:ring-1 focus:ring-theme-gold/20 focus:outline-none resize-none transition-all"
                                                        rows={2}
                                                        defaultValue={mis.text}
                                                        onBlur={(e) => updateMission(mis.id, e.target.value, mis.week)}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => deleteMission(mis.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 mt-1"
                                                    title="Eliminar Misión"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        {(!mod.missions || mod.missions.length === 0) && (
                                            <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 dark:border-white/5 rounded-lg">
                                                No hay misiones configuradas para este módulo
                                            </div>
                                        )}

                                        {/* Add Mission */}
                                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex gap-3 items-center">
                                                <div className="w-8 h-8 rounded-full bg-theme-gold/10 text-theme-gold flex items-center justify-center shrink-0">
                                                    <Plus size={16} />
                                                </div>
                                                <span className="text-xs font-bold text-theme-gold uppercase">Nueva Misión</span>
                                            </div>

                                            <div className="flex gap-3 items-start mt-3 pl-11">
                                                <input
                                                    id={`new-mission-week-${mod.id}`}
                                                    placeholder="Semana (#)"
                                                    type="number"
                                                    className="w-24 bg-slate-50 dark:bg-black/20 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 focus:border-theme-gold/50 focus:outline-none"
                                                />
                                                <input
                                                    id={`new-mission-text-${mod.id}`}
                                                    placeholder="Descripción de la misión..."
                                                    className="flex-1 bg-slate-50 dark:bg-black/20 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 focus:border-theme-gold/50 focus:outline-none"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const weekInput = document.getElementById(`new-mission-week-${mod.id}`) as HTMLInputElement;
                                                            if (e.currentTarget.value && weekInput.value) {
                                                                createMission(mod.id, e.currentTarget.value, parseInt(weekInput.value));
                                                                e.currentTarget.value = '';
                                                                weekInput.value = '';
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const textInput = document.getElementById(`new-mission-text-${mod.id}`) as HTMLInputElement;
                                                        const weekInput = document.getElementById(`new-mission-week-${mod.id}`) as HTMLInputElement;
                                                        if (textInput.value && weekInput.value) {
                                                            createMission(mod.id, textInput.value, parseInt(weekInput.value));
                                                            textInput.value = '';
                                                            weekInput.value = '';
                                                        }
                                                    }}
                                                    className="bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-theme-gold hover:text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                                                >
                                                    Agregar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
