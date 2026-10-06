import React, { useState } from 'react';
import {
    Building2,
    TrendingUp,
    Percent,
    MapPin,
    Clock,
    Landmark,
    ShieldCheck,
    Calendar,
    Info,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { ResumenTab } from './tabs/ResumenTab';
import { RendimientosTab } from './tabs/RendimientosTab';
import { InstitucionesTab } from './tabs/InstitucionesTab';
import { DolarizacionTab } from './tabs/DolarizacionTab';
import { GeografiaTab } from './tabs/GeografiaTab';
import { HistoricoTab } from './tabs/HistoricoTab';

export type BankingSubTab =
    | 'RESUMEN'
    | 'RENDIMIENTOS'
    | 'INSTITUCIONES'
    | 'DOLARIZACION'
    | 'GEOGRAFIA'
    | 'HISTORICO';

interface BankingSectionProps {
    defaultTab?: BankingSubTab;
    initialEntity?: string;
}

export const BankingSection: React.FC<BankingSectionProps> = ({
    defaultTab = 'RESUMEN',
    initialEntity = 'BANRESERVAS'
}) => {
    const [activeTab, setActiveTab] = useState<BankingSubTab>(defaultTab);
    const [selectedEntityForDetail, setSelectedEntityForDetail] = useState<string>(initialEntity);

    // Navegar directamente a la ficha de una entidad desde cualquier subpestaña
    const handleSelectEntity = (entityName: string) => {
        setSelectedEntityForDetail(entityName);
        setActiveTab('INSTITUCIONES');
    };

    const tabsConfig = [
        { id: 'RESUMEN', label: 'Resumen', icon: Building2 },
        { id: 'RENDIMIENTOS', label: 'Rendimientos', icon: TrendingUp },
        { id: 'INSTITUCIONES', label: 'Instituciones', icon: Landmark },
        { id: 'DOLARIZACION', label: 'Dolarización', icon: Percent },
        { id: 'GEOGRAFIA', label: 'Geografía', icon: MapPin },
        { id: 'HISTORICO', label: 'Histórico', icon: Clock }
    ];

    return (
        <div className="space-y-4">
            {/* Top Regulatory Banner & Section Header */}
            <div className="bg-[#0b1329] border border-cyan-950/80 rounded-xl p-4 md:p-5 relative overflow-hidden shadow-xl">
                {/* Background ambient subtle glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-start md:items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shadow-inner">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
                                    Sistema Bancario Dominicano
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                                    <ShieldCheck className="w-3 h-3" />
                                    SB v2 Conectado
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Monitor analítico institucional de captaciones, tasas pasivas, concentración y dolarización del ahorro financiero
                            </p>
                        </div>
                    </div>

                    {/* Temporal Distinction & Source Metadata (FASE 3) */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-right">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider justify-end">
                                <Calendar className="w-3 h-3 text-cyan-400" />
                                <span>Período Estadístico Oficial</span>
                            </div>
                            <div className="text-xs font-bold text-cyan-300 font-mono mt-0.5">
                                Cierre Agosto 2026 (SB)
                            </div>
                        </div>

                        <div className="px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800">
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                                Régimen de Actualización
                            </div>
                            <div className="text-xs font-mono text-amber-300 mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Regulatorio Mensual
                            </div>
                        </div>
                    </div>
                </div>

                {/* Factual Temporal Guidance Note */}
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
                    <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>
                            Distinción: Los datos cambiarios de <strong>Providence FX</strong> se actualizan de forma intradía/diaria, mientras que los saldos y tasas de la <strong>Superintendencia de Bancos (SB)</strong> reflejan cortes contables mensuales consolidados.
                        </span>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                        Fuente: SB RD v2 API
                    </span>
                </div>
            </div>

            {/* Sub-Tabs Navigation Bar */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-1.5 flex items-center gap-1 overflow-x-auto">
                {tabsConfig.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as BankingSubTab)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-mono uppercase tracking-wider font-semibold transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Active Sub-Tab View */}
            <div className="min-h-[500px]">
                {activeTab === 'RESUMEN' && (
                    <ResumenTab onSelectInstitution={handleSelectEntity} />
                )}

                {activeTab === 'RENDIMIENTOS' && (
                    <RendimientosTab onSelectInstitution={handleSelectEntity} />
                )}

                {activeTab === 'INSTITUCIONES' && (
                    <InstitucionesTab initialEntity={selectedEntityForDetail} />
                )}

                {activeTab === 'DOLARIZACION' && (
                    <DolarizacionTab />
                )}

                {activeTab === 'GEOGRAFIA' && (
                    <GeografiaTab />
                )}

                {activeTab === 'HISTORICO' && (
                    <HistoricoTab />
                )}
            </div>
        </div>
    );
};
