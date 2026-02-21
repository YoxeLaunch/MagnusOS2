import React, { useState, useEffect } from 'react';
import { Crown, ArrowRight, X } from 'lucide-react';
import { apiFetch } from '../../../../shared/utils/apiFetch';

interface WelcomeIntroProps {
    onClose: () => void;
    userName: string;
}

export const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onClose, userName }) => {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);
    const [banners, setBanners] = useState({ banner1: '', banner2: '' });

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setVisible(true), 100);

        // Sequence steps
        const step1 = setTimeout(() => setStep(1), 800);  // Show Icon
        const step2 = setTimeout(() => setStep(2), 1600); // Show Title
        const step3 = setTimeout(() => setStep(3), 2400); // Show Subtitle
        const step4 = setTimeout(() => setStep(4), 3000); // Show Button

        // Load banners from API
        apiFetch('/api/settings/banners')
            .then(res => res.json())
            .then(data => {
                setBanners({
                    banner1: data.banner1 || '/images/backgrounds/machiavelli.png',
                    banner2: data.banner2 || '/images/themes/luxury.png'
                });
            })
            .catch(err => console.error('Error loading banners:', err));

        return () => {
            clearTimeout(timer);
            clearTimeout(step1);
            clearTimeout(step2);
            clearTimeout(step3);
            clearTimeout(step4);
        };
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 500); // Wait for exit animation
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
            <button
                onClick={handleClose}
                className="absolute top-6 right-6 z-50 text-slate-500 hover:text-white transition-colors p-2 bg-black/20 rounded-full backdrop-blur-sm"
            >
                <X size={24} />
            </button>

            <div className="w-full h-full max-w-[1600px] flex flex-col md:flex-row overflow-hidden relative">

                {/* LEFT COLUMN: CONTENT */}
                <div className="w-full md:w-[45%] h-full flex flex-col items-center md:items-start justify-center p-12 md:p-24 text-center md:text-left relative z-10 gap-8">

                    {/* Step 1: Icon */}
                    <div
                        className={`p-5 rounded-full bg-gradient-to-br from-theme-gold/20 to-transparent border border-theme-gold/30 shadow-[0_0_40px_rgba(251,191,36,0.2)] transform transition-all duration-1000 ${step >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90'}`}
                    >
                        <Crown size={40} className="text-theme-gold animate-pulse-slow" strokeWidth={1.5} />
                    </div>

                    {/* Step 2: Title */}
                    <h1
                        className={`text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-theme-gold via-yellow-200 to-theme-gold tracking-tight leading-[1.1] transition-all duration-1000 delay-100 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        Hola, <br /> {userName}
                    </h1>

                    {/* Step 3: Subtitle */}
                    <div
                        className={`space-y-6 max-w-lg transition-all duration-1000 delay-200 ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        <p className="text-2xl text-slate-300 font-light leading-relaxed">
                            Bienvenido al <span className="font-serif text-theme-gold/90">Sistema Magnus</span>
                        </p>

                        <div className="h-px w-24 bg-gradient-to-r from-theme-gold/50 to-transparent my-4 md:ml-0 md:mr-auto mx-auto"></div>

                        <p className="text-xs text-slate-500 font-mono tracking-[0.2em] uppercase leading-loose">
                            ARQUITECTURA MENTAL &bull; ESTRATEGIA FINANCIERA &bull; SOBERANÍA
                        </p>
                    </div>

                    {/* Step 4: Button */}
                    <div
                        className={`mt-4 transition-all duration-1000 delay-300 ${step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        <button
                            onClick={handleClose}
                            className="group relative px-10 py-4 bg-transparent overflow-hidden rounded-xl border border-theme-gold/30 hover:border-theme-gold transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-theme-gold/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <span className="relative flex items-center gap-4 text-theme-gold group-hover:text-white font-bold tracking-widest uppercase text-xs">
                                Continuar al Panel <ArrowRight size={14} />
                            </span>
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: IMAGES */}
                <div className={`hidden md:flex w-[55%] h-full p-8 pl-0 gap-6 items-center justify-center transition-all duration-1000 delay-500 ${step >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}>

                    {/* Image Slot 1 */}
                    <div className="w-1/2 h-[85%] relative rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl group transform translate-y-12">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
                        {banners.banner1 ? (
                            <img src={banners.banner1} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 hover:scale-105" alt="Banner 1" />
                        ) : (
                            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-700 font-mono text-xs uppercase tracking-widest border border-dashed border-white/5">
                                [Banner 1: Configurar en Admin]
                            </div>
                        )}
                        <div className="absolute bottom-8 right-8 z-20 text-right">
                            <span className="text-xs font-mono text-theme-gold tracking-widest uppercase mb-2 block">Sección 01</span>
                            <h3 className="text-2xl font-serif text-white">Mentalidad</h3>
                        </div>
                    </div>

                    {/* Image Slot 2 */}
                    <div className="w-1/2 h-[85%] relative rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl group transform -translate-y-12">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
                        {banners.banner2 ? (
                            <img src={banners.banner2} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 hover:scale-105" alt="Banner 2" />
                        ) : (
                            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-700 font-mono text-xs uppercase tracking-widest border border-dashed border-white/5">
                                [Banner 2: Configurar en Admin]
                            </div>
                        )}
                        <div className="absolute bottom-8 right-8 z-20 text-right">
                            <span className="text-xs font-mono text-blue-400 tracking-widest uppercase mb-2 block">Sección 02</span>
                            <h3 className="text-2xl font-serif text-white">Finanzas</h3>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};
