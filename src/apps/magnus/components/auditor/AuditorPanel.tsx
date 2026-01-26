import React from 'react';
import { RecordsTable } from './RecordsTable';
import { MOCK_RECORDS } from './data';
import { ShieldCheck, Calendar, Filter, Download } from 'lucide-react';

export const AuditorPanel: React.FC = () => {
    return (
        <div className="p-6 lg:p-12 max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-24">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-widest uppercase flex items-center gap-4">
                        <ShieldCheck className="w-8 h-8 text-theme-gold" />
                        Registro de Expedientes
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-xs mt-2 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Sistema de Auditoría Médica v2.0
                    </p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4" />
                        Diciembre 2025
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-theme-gold text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-theme-gold/90 transition-colors shadow-lg shadow-theme-gold/20">
                        <Download className="w-4 h-4" />
                        Exportar Reporte
                    </button>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-theme-gold/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShieldCheck className="w-24 h-24 text-theme-gold" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Expedientes Procesados</p>
                    <h3 className="text-4xl font-serif text-slate-900 dark:text-white">{MOCK_RECORDS.length}</h3>
                    <div className="mt-4 text-xs text-emerald-500 font-mono flex items-center gap-1">
                        +2 esta semana
                    </div>
                </div>

                <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-theme-gold/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Filter className="w-24 h-24 text-blue-500" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Tasa de Aprobación</p>
                    <h3 className="text-4xl font-serif text-slate-900 dark:text-white">96.4%</h3>
                    <div className="mt-4 text-xs text-slate-400 font-mono">
                        Promedio mensual
                    </div>
                </div>

                <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-theme-gold/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Calendar className="w-24 h-24 text-emerald-500" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Cierre Contable</p>
                    <h3 className="text-4xl font-serif text-slate-900 dark:text-white">5 Días</h3>
                    <div className="mt-4 text-xs text-amber-500 font-mono">
                        Próximo corte: 15 Ene
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Buscar por paciente o NAP..."
                        className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:border-theme-gold transition-colors text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    />
                    <button className="p-2 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <RecordsTable data={MOCK_RECORDS} />
        </div>
    );
};
