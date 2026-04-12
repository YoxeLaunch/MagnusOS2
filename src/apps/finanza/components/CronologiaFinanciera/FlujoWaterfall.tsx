import React from 'react';

interface FlujoWaterfallProps {
    entradas: number;
    gastos: number;
    invertido: number;
    ahorro: number;
}

export const FlujoWaterfall: React.FC<FlujoWaterfallProps> = ({ entradas, gastos, invertido, ahorro }) => {
    // Evitar división por cero
    const base = entradas > 0 ? entradas : 1;
    
    // Calcular anchos relativos (hasta 100%)
    // Incluso si hay más gastos que entradas, limitamos visualmente
    const gastoPct = Math.min((gastos / base) * 100, 100);
    const invertidoPct = Math.min((invertido / base) * 100, 100);
    // Ahorro puede ser negativo, en ese caso la barra será roja o 0% visual
    const ahorroPct = Math.max((ahorro / base) * 100, 0);

    return (
        <div className="flex flex-col gap-3 py-4 w-full">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Flujo del Dinero</h4>
            
            {/* Row 1: Entradas */}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-green-600 dark:text-green-400">+ Entradas</span>
                    <span>${entradas.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-r-md rounded-l-sm overflow-hidden">
                    <div className="h-full bg-green-500 rounded-r-md transition-all duration-700" style={{ width: '100%' }} />
                </div>
            </div>

            {/* Row 2: Gastos */}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-red-500">− Gastos</span>
                    <span>${gastos.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-r-md rounded-l-sm overflow-hidden">
                    <div className="h-full bg-red-400 rounded-r-md transition-all duration-700" style={{ width: `${gastoPct}%` }} />
                </div>
            </div>

            {/* Row 3: Invertido */}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-purple-500">− Invertido</span>
                    <span>${invertido.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-r-md rounded-l-sm overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-r-md transition-all duration-700" style={{ width: `${invertidoPct}%` }} />
                </div>
            </div>

            {/* Row 4: Ahorro (Destacado) */}
            <div className="flex flex-col gap-1 mt-2 p-3 bg-teal-50 dark:bg-teal-900/10 rounded-lg border border-teal-100 dark:border-teal-900/30">
                <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-teal-600 dark:text-teal-400">= Ahorro del Mes</span>
                    <span className={ahorro >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'}>
                        ${ahorro.toLocaleString()}
                    </span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-r-md overflow-hidden mt-1 shadow-inner">
                    <div 
                        className={`h-full rounded-r-md transition-all duration-700 ${ahorro >= 0 ? 'bg-teal-500' : 'bg-red-500'}`} 
                        style={{ width: `${Math.abs(ahorroPct)}%` }} 
                    />
                </div>
            </div>
        </div>
    );
};
