import React from 'react';
import { User, Award, ExternalLink, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface CreatorProps {
    onClose: () => void;
}

export const Creator: React.FC<CreatorProps> = ({ onClose }) => {
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const images = ['/images/creator/main1.jpg', '/images/creator/main2.jpg'];

    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 5000); // Rotate every 5 seconds

        return () => clearInterval(timer);
    }, []);

    // Close on escape key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-background-light dark:bg-background-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-red-500 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-6 lg:p-10 space-y-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-white/10">
                        <div>
                            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">
                                Acerca del <span className="text-theme-gold">Creador</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                                La mente maestra detrás de la metodología Magnus.
                            </p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Biography Section */}
                        <div className="lg:col-span-7 space-y-8">
                            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed text-justify">

                                {/* Highlights Section */}
                                <div className="mb-8 border-l-4 border-theme-gold pl-6 py-2">
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                                        Lic. José Osvaldo de la Cruz
                                    </h3>
                                    <p className="text-lg font-medium text-theme-gold uppercase tracking-wider">
                                        Licenciado en Administración de Empresas
                                    </p>
                                </div>

                                <p className="text-lg">
                                    Nacido en San Francisco de Macorís, su trayectoria académica abarca profundos estudios en Finanzas, Mercadeo, Inteligencia Emocional y Auditoría, disciplinas que forman los pilares fundamentales de su visión profesional.
                                </p>
                                <p>
                                    No se limitó a adquirir conocimientos técnicos, sino que buscó integrar la lógica financiera con la psicología humana, entendiendo que el verdadero liderazgo nace del equilibrio entre el capital económico y el capital emocional.
                                </p>
                                <p>
                                    A lo largo de su carrera, ha observado que el éxito no es solo una cuestión de recursos, sino de estrategia y mentalidad. Esta comprensión lo llevó a construir la <strong className="text-theme-gold">Filosofía Magnus</strong>: un sistema que extrapola los principios de la auditoría y las finanzas hacia la arquitectura de la vida personal.
                                </p>
                                <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mt-6 mb-4">La Visión Magnus</h3>
                                <p>
                                    Lo que ha construido con el proyecto Magnus es más que una plataforma; es un manifiesto de soberanía. Al igual que en una auditoría, se busca la verdad transparente; como en las finanzas, se busca la maximización del valor; y con la inteligencia emocional, se busca la resiliencia inquebrantable. Magnus representa la fusión de estas fuerzas para crear un camino hacia la excelencia y la libertad integral.
                                </p>
                            </div>

                            {/* Social / Contact Links (Optional) */}
                            <div className="flex flex-wrap gap-4 pt-4">
                                <button className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-theme-gold/10 hover:text-theme-gold transition-colors font-medium">
                                    <ExternalLink size={18} />
                                    <span>Contactar</span>
                                </button>
                                <button className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-theme-gold/10 hover:text-theme-gold transition-colors font-medium">
                                    <User size={18} />
                                    <span>Perfil Profesional</span>
                                </button>
                            </div>
                        </div>

                        {/* Image / Gallery Section */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="relative group rounded-2xl overflow-hidden shadow-2xl bg-slate-200 dark:bg-white/5 aspect-[3/4]">
                                {/* Carousel Image */}
                                {images.map((src, index) => (
                                    <img
                                        key={src}
                                        src={src}
                                        alt={`José Osvaldo - Img ${index + 1}`}
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                                            }`}
                                    />
                                ))}

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 pointer-events-none" />
                                <div className="absolute bottom-6 left-6 right-6 text-white z-10">
                                    <h3 className="text-3xl font-serif font-bold mb-1 text-theme-gold drop-shadow-md">
                                        José Osvaldo de la Cruz
                                    </h3>
                                    <div className="flex items-center gap-2 text-white/90">
                                        <Award className="w-4 h-4 text-theme-gold" />
                                        <span className="text-sm font-medium tracking-wide uppercase">
                                            Fundador
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Images Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="aspect-square rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden flex items-center justify-center text-slate-400/50 border-2 border-dashed border-slate-300 dark:border-white/10 group hover:border-theme-gold/30 transition-colors">
                                    <div className="text-center">
                                        <span className="text-xs font-mono block mb-1">Galería 1</span>
                                        <span className="text-[10px] opacity-60">Próximamente</span>
                                    </div>
                                </div>
                                <div className="aspect-square rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden flex items-center justify-center text-slate-400/50 border-2 border-dashed border-slate-300 dark:border-white/10 group hover:border-theme-gold/30 transition-colors">
                                    <div className="text-center">
                                        <span className="text-xs font-mono block mb-1">Galería 2</span>
                                        <span className="text-[10px] opacity-60">Próximamente</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
