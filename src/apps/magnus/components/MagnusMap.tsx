import React, { useState } from 'react';
import { ZoomIn, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MagnusMap: React.FC = () => {
    const [isInternalZoomed, setIsInternalZoomed] = useState(false); // For small toggle
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden group bg-slate-900 border border-slate-200 dark:border-white/5">
                {/* Background Image Container */}
                <div
                    className="w-full h-full cursor-pointer overflow-hidden"
                    onClick={() => setIsModalOpen(true)}
                >
                    <img
                        src="/images/plan-maestro-2026-landscape.png"
                        alt="Plan Maestro 2026"
                        className={`w-full h-full object-contain bg-slate-950 transition-transform duration-700 ease-in-out ${isInternalZoomed ? 'scale-110' : 'scale-100'}`}
                    />
                </div>

                {/* Overlay UI */}
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <h3 className="text-white font-serif font-bold tracking-wider text-xl flex items-center gap-2 drop-shadow-lg">
                        <span className="w-2 h-2 bg-theme-gold rounded-full animate-pulse shadow-[0_0_10px_#D4AF37]"></span>
                        PLAN MAESTRO 2026
                    </h3>
                </div>

                {/* Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                        className="p-3 bg-black/60 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-theme-gold/20 hover:border-theme-gold/50 transition-all shadow-lg group-hover:scale-105"
                        title="Ver Pantalla Completa"
                    >
                        <Maximize2 size={20} />
                    </button>
                </div>

                {/* Interaction hint */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 text-white flex items-center gap-3 shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <ZoomIn size={18} className="text-theme-gold" />
                        <span className="text-xs font-bold tracking-widest uppercase">Ampliar Plan</span>
                    </div>
                </div>
            </div>

            {/* Full Screen Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-10"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src="/images/plan-maestro-2026-landscape.png"
                                alt="Plan Maestro 2026 Full"
                                className="w-full h-full object-contain rounded-lg shadow-2xl"
                            />

                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute -top-4 -right-4 md:top-4 md:right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors border border-white/10"
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
