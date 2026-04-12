import React from 'react';
import { ArrowRight, Minus, Pause, Equal } from 'lucide-react';

interface FormulaStripProps {
    entradas: number;
    gastos: number;
    invertido: number;
    ahorro: number;
}

export const FormulaStrip: React.FC<FormulaStripProps> = ({ entradas, gastos, invertido, ahorro }) => {
    return (
        <div className="flex flex-col items-center w-full mt-6 py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/50">
            <h5 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3">Ecuación de Cierre</h5>
            
            <div className="flex flex-wrap items-center justify-center gap-2">
                {/* Entradas */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-semibold text-sm shadow-sm">
                    <span>${entradas.toLocaleString()}</span>
                </div>
                
                <Minus size={14} className="text-slate-400 font-bold" />
                
                {/* Gastos */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full font-semibold text-sm shadow-sm">
                    <span>${gastos.toLocaleString()}</span>
                </div>
                
                <Minus size={14} className="text-slate-400 font-bold" />
                
                {/* Invertido */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-semibold text-sm shadow-sm">
                    <span>${invertido.toLocaleString()}</span>
                </div>
                
                <Equal size={14} className="text-slate-400 font-bold" />
                
                {/* Ahorro */}
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm shadow-md ${ahorro >= 0 ? 'bg-teal-500 text-white' : 'bg-red-500 text-white'}`}>
                    <span>${ahorro.toLocaleString()}</span>
                </div>
                
                <ArrowRight size={14} className="text-slate-400 mx-1" />
                
                <span className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                    Suma al Cash Global
                </span>
            </div>
        </div>
    );
};
