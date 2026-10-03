import React from 'react';
import { X, Calendar, ArrowRight } from 'lucide-react';

interface Update {
    id: string;
    title: string;
    date: string;
    description: string;
    imageUrl?: string;
    tag?: string;
}

interface UpdatesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MOCK_UPDATES: Update[] = [
    {
        id: 'fx-usd-dop',
        title: 'Providence FX: Mercado Cambiario USD/DOP',
        date: '3 de Octubre, 2026',
        description: 'Nuevo motor institucional en /finanza/mercado. Monitorea cotizaciones en tiempo real de más de 20 bancos de República Dominicana, referencias oficiales del Banco Central (BCRD), arbitraje inteligente (dónde comprar o vender al mejor precio) y gráficos históricos escalonados.',
        tag: 'Finanza'
    },
    {
        id: 'market-tradingview',
        title: 'Mercado Financiero en Vivo & Gráficos TradingView',
        date: '27 de Septiembre, 2026',
        description: 'Módulo de inteligencia de mercado en /finanza/mercado con cotizaciones en tiempo real, índices bursátiles, materias primas, criptomonedas y gráficos técnicos estilo TradingView.',
        tag: 'Finanza'
    },
    {
        id: 'backups-hud',
        title: 'Torre de Control: Sistema de Backups & Telemetría HUD',
        date: '16 de Agosto, 2026',
        description: 'Consola de administración del sistema con gestión de copias de seguridad automatizadas, descarga y restauración de snapshots y monitor HUD con indicadores visuales de hardware.',
        tag: 'Sistema'
    },
    {
        id: 'cashflow-redesign',
        title: 'Rediseño de Gestión de Flujo y Categorías Expandidas',
        date: '16 de Agosto, 2026',
        description: 'Nueva experiencia visual en flujo de caja con versionado histórico de ingresos y gastos, categorización granular y análisis de distribución porcentual optimizado.',
        tag: 'Finanza'
    },
    {
        id: 'landing-services',
        title: 'Puerta de Entrada MagnusServices & Visualizador Financiero',
        date: '18 de Julio, 2026',
        description: 'Integración de la landing institucional MagnusServices como portal de bienvenida unificado y sustitución del diagrama de flujo por un nuevo visualizador de dona de distribución.',
        tag: 'Estrategia'
    },
    {
        id: 'sabiduria-magnus',
        title: 'Evolución a Sabiduría Magnus & Centro de Publicaciones',
        date: '12 de Julio, 2026',
        description: 'Transformación del módulo de mentorías en Sabiduría Magnus, incorporación de un blog interno de publicaciones estratégicas y optimización de impresión de balances.',
        tag: 'Sabiduría'
    },
    {
        id: '1',
        title: 'Nueva Interfaz de Usuario',
        date: '5 de Enero, 2026',
        description: 'Hemos rediseñado completamente la experiencia de usuario para hacerla más personal y fluida.',
        tag: 'Diseño',
        // Placeholder for vertical image support
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop'
    },
    {
        id: '2',
        title: 'Módulo de Presupuesto Mejorado',
        date: '1 de Enero, 2026',
        description: 'Nuevas herramientas de proyección financiera y categorización automática de gastos.',
        tag: 'Finanza'
    },
    {
        id: '3',
        title: 'Integración con Gemini',
        date: '28 de Diciembre, 2025',
        description: 'La inteligencia artificial ahora potencia tus análisis estratégicos en Sabiduría Magnus.',
        tag: 'IA'
    }
];

export const UpdatesModal: React.FC<UpdatesModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z[9999] flex justify-end pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Panel */}
            <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-white/10 shadow-2xl transform transition-transform duration-300 pointer-events-auto overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/50 backdrop-blur">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-white">Novedades</h2>
                        <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Historial de Cambios</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {MOCK_UPDATES.map((update) => (
                        <div key={update.id} className="group">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-theme-gold/10 text-theme-gold border border-theme-gold/20">
                                    {update.tag}
                                </span>
                                <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                    <Calendar size={10} />
                                    {update.date}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-theme-gold transition-colors">
                                {update.title}
                            </h3>

                            <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                {update.description}
                            </p>

                            {update.imageUrl && (
                                <div className="rounded-lg overflow-hidden border border-white/5 mb-4 relative aspect-[3/4] w-full max-w-[200px]">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                                    <img
                                        src={update.imageUrl}
                                        alt={update.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute bottom-3 left-3 z-20">
                                        <span className="text-[10px] text-white/80 uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">
                                            Visualizar
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent mt-8 group-last:hidden"></div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-slate-900/50 text-center">
                    <button className="text-xs text-slate-500 hover:text-theme-gold transition-colors flex items-center justify-center gap-2 w-full py-2">
                        Ver todo el historial <ArrowRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};
