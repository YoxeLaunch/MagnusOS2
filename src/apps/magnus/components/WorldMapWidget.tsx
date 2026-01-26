import React from 'react';

export const WorldMapWidget: React.FC = () => {
    return (
        <div className="w-full h-full bg-slate-100 dark:bg-theme-card rounded-xl border border-slate-200 dark:border-white/5 p-4 flex items-center justify-center">
            <div className="text-center">
                <p className="text-slate-500 font-bold mb-2">MAPA GLOBAL DE ACTIVOS</p>
                <div className="text-xs text-slate-400">Visualización temporalmente deshabilitada por mantenimiento</div>
            </div>
        </div>
    );
};
