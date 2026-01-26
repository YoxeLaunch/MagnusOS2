import React, { useState } from 'react';
import { SCENARIOS } from '../constants';
import { FlaskConical, AlertCircle, Check, X } from 'lucide-react';

export const Simulator: React.FC = () => {
    const [selectedScenarioId, setSelectedScenarioId] = useState(SCENARIOS[0].id);
    const [selectedOutcome, setSelectedOutcome] = useState<any | null>(null);

    const currentScenario = SCENARIOS.find(s => s.id === selectedScenarioId) || SCENARIOS[0];

    const handleResolution = (option: any) => {
        setSelectedOutcome(option.outcome);
    };

    const reset = () => {
        setSelectedOutcome(null);
    };

    return (
        <div className="p-6 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in h-full flex flex-col">
            <header>
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-widest uppercase">Laboratorio de Poder</h2>
                <p className="text-purple-500 dark:text-purple-400 font-mono text-xs mt-1 uppercase">Simulador de Causa y Efecto</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                {/* Control Panel */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-6 rounded-xl shadow-sm dark:shadow-none">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-3">Escenario Táctico</label>
                        <select
                            value={selectedScenarioId}
                            onChange={(e) => {
                                setSelectedScenarioId(e.target.value);
                                reset();
                            }}
                            className="w-full bg-slate-50 dark:bg-theme-dark border border-slate-200 dark:border-white/10 rounded p-4 text-slate-900 dark:text-white focus:outline-none focus:border-theme-gold transition-colors"
                        >
                            {SCENARIOS.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>

                        <div className="mt-6 p-4 bg-slate-100 dark:bg-white/5 border-l-2 border-purple-500 rounded text-slate-600 dark:text-slate-300 italic text-sm leading-relaxed">
                            "{currentScenario.description}"
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2">Elegir Respuesta:</h4>
                        {currentScenario.options.map((option, idx) => {
                            let borderClass = "border-slate-200 dark:border-white/10";
                            let bgClass = "bg-white dark:bg-theme-card";
                            let textClass = "text-slate-600 dark:text-slate-300";

                            if (option.type === 'emotional') {
                                borderClass = "hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/5";
                                textClass = "group-hover:text-red-500 dark:group-hover:text-red-400";
                            } else if (option.type === 'passive') {
                                borderClass = "hover:border-yellow-500/50 hover:bg-yellow-50 dark:hover:bg-yellow-500/5";
                                textClass = "group-hover:text-yellow-600 dark:group-hover:text-yellow-400";
                            } else {
                                borderClass = "hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/5";
                                textClass = "group-hover:text-emerald-600 dark:group-hover:text-emerald-400";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleResolution(option)}
                                    className={`w-full text-left p-4 rounded-lg border ${borderClass} ${bgClass} transition-all duration-200 group relative overflow-hidden shadow-sm dark:shadow-none`}
                                >
                                    <span className={`font-bold block text-sm mb-1 ${textClass} transition-colors`}>{option.label}</span>
                                    <span className="text-xs text-slate-500">{option.description}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Analysis Panel */}
                <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 rounded-xl p-8 relative flex items-center justify-center min-h-[400px] shadow-sm dark:shadow-none">
                    {!selectedOutcome ? (
                        <div className="text-center opacity-30">
                            <FlaskConical className="w-24 h-24 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                            <p className="text-sm font-mono uppercase tracking-widest text-slate-500">Esperando decisión...</p>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col animate-fade-in">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-white/5 pb-4">
                                <h3 className="font-serif font-bold text-2xl text-slate-900 dark:text-white">Análisis de Resultados</h3>
                                <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest">Reiniciar</button>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Efecto Inmediato</span>
                                    <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{selectedOutcome.immediate}</p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Impacto a Largo Plazo</span>
                                    <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{selectedOutcome.longTerm}</p>
                                </div>

                                <div className="mt-auto pt-6">
                                    <div className="bg-theme-gold/10 border border-theme-gold/20 p-4 rounded-lg">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-theme-gold block mb-1">Principio Aplicado</span>
                                        <p className="text-slate-900 dark:text-white text-sm italic font-serif">"{selectedOutcome.law}"</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};