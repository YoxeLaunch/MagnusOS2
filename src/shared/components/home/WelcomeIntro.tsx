import React, { useState, useEffect } from 'react';
import { Crown, ArrowRight, X, Bell, Star, Bug, Zap, Calendar, ChevronDown, ChevronUp, Sparkles, Image } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WelcomeIntroProps {
    onClose: () => void;
    userName: string;
}

interface Update {
    id: string;
    date: string;
    title: string;
    description: string;
    type: 'feature' | 'bugfix' | 'announcement' | 'improvement';
}

const TYPE_CONFIG = {
    feature:      { icon: Star,  color: 'text-theme-gold',   bg: 'bg-theme-gold/10',   label: 'Nueva Función' },
    bugfix:       { icon: Bug,   color: 'text-red-400',       bg: 'bg-red-400/10',       label: 'Corrección'    },
    announcement: { icon: Bell,  color: 'text-blue-400',      bg: 'bg-blue-400/10',      label: 'Anuncio'       },
    improvement:  { icon: Zap,   color: 'text-emerald-400',   bg: 'bg-emerald-400/10',   label: 'Mejora'        },
};

export const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onClose, userName }) => {
    const [visible, setVisible]     = useState(false);
    const [step, setStep]           = useState(0);
    const [banners, setBanners]     = useState({ banner1: '', banner2: '' });
    const [updates, setUpdates]     = useState<Update[]>([]);
    const [activeTab, setActiveTab] = useState<'banners' | 'updates'>('banners');
    const [expanded, setExpanded]   = useState(false);

    useEffect(() => {
        const t0 = setTimeout(() => setVisible(true), 80);
        const t1 = setTimeout(() => setStep(1), 700);
        const t2 = setTimeout(() => setStep(2), 1400);
        const t3 = setTimeout(() => setStep(3), 2100);
        const t4 = setTimeout(() => setStep(4), 2700);

        // Parallel fetch — lightweight, no heavy processing
        apiFetch('/api/settings/banners')
            .then(r => r.json())
            .then(d => setBanners({ banner1: d.banner1 || '', banner2: d.banner2 || '' }))
            .catch(() => {});

        apiFetch('/api/updates')
            .then(r => r.ok ? r.json() : [])
            .then(d => {
                const list = Array.isArray(d) ? d : [];
                setUpdates(list);
                if (list.length > 0) {
                    setTimeout(() => setActiveTab('updates'), 3000);
                }
            })
            .catch(() => {});

        return () => { [t0,t1,t2,t3,t4].forEach(clearTimeout); };
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 400);
    };

    const latestUpdate    = updates[0];
    const previousUpdates = updates.slice(1);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}
        >
            {/* Close */}
            <button
                onClick={handleClose}
                className="absolute top-6 right-6 z-50 text-slate-500 hover:text-white p-2 rounded-full bg-white/5 transition-colors"
            >
                <X size={22} />
            </button>

            <div className="w-full h-full max-w-[1500px] flex flex-col md:flex-row overflow-hidden">

                {/* ── LEFT: Welcome content ── */}
                <div className="w-full md:w-[45%] h-full flex flex-col items-center md:items-start justify-center p-12 md:p-20 text-center md:text-left gap-8">

                    {/* Icon */}
                    <div
                        className="p-5 rounded-full border border-theme-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.15)]"
                        style={{
                            background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)',
                            opacity: step >= 1 ? 1 : 0,
                            transform: step >= 1 ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.9)',
                            transition: 'opacity 0.8s ease, transform 0.8s ease'
                        }}
                    >
                        <Crown size={38} className="text-theme-gold" strokeWidth={1.5} />
                    </div>

                    {/* Title */}
                    <h1
                        className="text-5xl md:text-7xl font-serif font-bold tracking-tight leading-[1.1]"
                        style={{
                            background: 'linear-gradient(135deg, #D4AF37, #fef3c7, #D4AF37)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            opacity: step >= 2 ? 1 : 0,
                            transform: step >= 2 ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s'
                        }}
                    >
                        Hola, <br /> {userName}
                    </h1>

                    {/* Subtitle */}
                    <div
                        style={{
                            opacity: step >= 3 ? 1 : 0,
                            transform: step >= 3 ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s'
                        }}
                        className="space-y-4 max-w-md"
                    >
                        <p className="text-2xl text-slate-300 font-light">
                            Bienvenido al <span className="font-serif text-theme-gold/90">Sistema Magnus</span>
                        </p>
                        <div className="h-px w-20 bg-gradient-to-r from-theme-gold/40 to-transparent" />
                        <p className="text-xs text-slate-500 font-mono tracking-[0.2em] uppercase leading-loose">
                            ARQUITECTURA MENTAL &bull; ESTRATEGIA FINANCIERA &bull; SOBERANÍA
                        </p>
                    </div>

                    {/* Button */}
                    <div
                        style={{
                            opacity: step >= 4 ? 1 : 0,
                            transform: step >= 4 ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s'
                        }}
                    >
                        <button
                            onClick={handleClose}
                            className="group px-10 py-4 rounded-xl border border-theme-gold/30 hover:border-theme-gold hover:bg-theme-gold/10 transition-all duration-300"
                        >
                            <span className="flex items-center gap-4 text-theme-gold font-bold tracking-widest uppercase text-xs">
                                Continuar al Panel <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>

                {/* ── RIGHT: Tabbed panel ── */}
                <div
                    className="hidden md:flex w-[55%] h-full p-8 pl-0 flex-col"
                    style={{
                        opacity: step >= 1 ? 1 : 0,
                        transform: step >= 1 ? 'translateX(0)' : 'translateX(40px)',
                        transition: 'opacity 0.9s ease 0.4s, transform 0.9s ease 0.4s'
                    }}
                >
                    {/* Tab bar */}
                    <div className="flex items-center gap-1 mb-4 self-start bg-white/5 border border-white/10 rounded-xl p-1">
                        <button
                            onClick={() => setActiveTab('banners')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                                activeTab === 'banners' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <Image size={12} />
                            Secciones
                        </button>
                        <button
                            onClick={() => setActiveTab('updates')}
                            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                                activeTab === 'updates' ? 'bg-theme-gold/15 text-theme-gold' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <Sparkles size={12} />
                            Novedades
                            {updates.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-theme-gold rounded-full flex items-center justify-center text-black text-[8px] font-black">
                                    {updates.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Content area — CSS transition instead of framer-motion */}
                    <div className="flex-1 relative overflow-hidden">

                        {/* BANNERS TAB */}
                        <div
                            className="absolute inset-0 flex gap-6 items-center justify-center"
                            style={{
                                opacity: activeTab === 'banners' ? 1 : 0,
                                transform: activeTab === 'banners' ? 'translateX(0)' : 'translateX(-24px)',
                                transition: 'opacity 0.3s ease, transform 0.3s ease',
                                pointerEvents: activeTab === 'banners' ? 'auto' : 'none'
                            }}
                        >
                            {/* Banner 1 */}
                            <div className="w-1/2 h-[85%] relative rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl group translate-y-10">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
                                {banners.banner1
                                    ? <img src={banners.banner1} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="" />
                                    : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-700 font-mono text-xs uppercase tracking-widest border border-dashed border-white/5">[Banner 1]</div>
                                }
                                <div className="absolute bottom-8 right-8 z-20 text-right">
                                    <span className="text-xs font-mono text-theme-gold tracking-widest uppercase mb-2 block">Sección 01</span>
                                    <h3 className="text-2xl font-serif text-white">Mentalidad</h3>
                                </div>
                            </div>

                            {/* Banner 2 */}
                            <div className="w-1/2 h-[85%] relative rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl group -translate-y-10">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
                                {banners.banner2
                                    ? <img src={banners.banner2} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="" />
                                    : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-700 font-mono text-xs uppercase tracking-widest border border-dashed border-white/5">[Banner 2]</div>
                                }
                                <div className="absolute bottom-8 right-8 z-20 text-right">
                                    <span className="text-xs font-mono text-blue-400 tracking-widest uppercase mb-2 block">Sección 02</span>
                                    <h3 className="text-2xl font-serif text-white">Finanzas</h3>
                                </div>
                            </div>
                        </div>

                        {/* NOVEDADES TAB */}
                        <div
                            className="absolute inset-0 flex items-center justify-center px-4"
                            style={{
                                opacity: activeTab === 'updates' ? 1 : 0,
                                transform: activeTab === 'updates' ? 'translateX(0)' : 'translateX(24px)',
                                transition: 'opacity 0.3s ease, transform 0.3s ease',
                                pointerEvents: activeTab === 'updates' ? 'auto' : 'none'
                            }}
                        >
                            <div className="w-full max-w-lg h-[88%] bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-xl">

                                {/* Header */}
                                <div className="px-6 py-5 border-b border-white/[0.07] flex items-center gap-3 flex-shrink-0">
                                    <div className="p-2 rounded-lg bg-theme-gold/10">
                                        <Sparkles size={15} className="text-theme-gold" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Historial de Novedades</h4>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Sistema Magnus · Changelog</p>
                                    </div>
                                    {updates.length > 0 && (
                                        <span className="ml-auto text-[10px] font-bold text-theme-gold bg-theme-gold/10 border border-theme-gold/20 rounded-full px-2.5 py-1">
                                            {updates.length} {updates.length === 1 ? 'entrada' : 'entradas'}
                                        </span>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                    {updates.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-slate-600 text-xs text-center gap-2">
                                            <Bell size={20} className="opacity-20" />
                                            Sin novedades registradas
                                        </div>
                                    ) : (
                                        <>
                                            {/* Latest — highlighted */}
                                            {latestUpdate && (() => {
                                                const cfg  = TYPE_CONFIG[latestUpdate.type] || TYPE_CONFIG.feature;
                                                const Icon = cfg.icon;
                                                return (
                                                    <div className="p-5 rounded-2xl border border-theme-gold/20 relative overflow-hidden"
                                                         style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(255,255,255,0.01) 100%)' }}>
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-0.5 p-2 rounded-xl ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                                                                <Icon size={14} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${cfg.color} ${cfg.bg} px-2 py-0.5 rounded-md`}>
                                                                        {cfg.label}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                        <Calendar size={9} />
                                                                        {format(new Date(latestUpdate.date), "d 'de' MMMM, yyyy", { locale: es })}
                                                                    </span>
                                                                </div>
                                                                <h5 className="text-sm font-bold text-white mb-1.5">{latestUpdate.title}</h5>
                                                                <p className="text-xs text-slate-400 leading-relaxed">{latestUpdate.description}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Previous — collapsible, no framer-motion */}
                                            {previousUpdates.length > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => setExpanded(e => !e)}
                                                        className="w-full flex items-center justify-between px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                                                    >
                                                        <span>Anteriores ({previousUpdates.length})</span>
                                                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                    </button>

                                                    {expanded && (
                                                        <div className="space-y-2">
                                                            {previousUpdates.map((u, i) => {
                                                                const cfg  = TYPE_CONFIG[u.type] || TYPE_CONFIG.feature;
                                                                const Icon = cfg.icon;
                                                                return (
                                                                    <div key={u.id || i} className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                                                                        <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                                                                            <Icon size={11} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-baseline gap-2 mb-0.5">
                                                                                <span className="text-xs font-bold text-slate-200 truncate">{u.title}</span>
                                                                                <span className="text-[9px] text-slate-600 flex-shrink-0">{format(new Date(u.date), "dd/MM/yy")}</span>
                                                                            </div>
                                                                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{u.description}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-3 border-t border-white/[0.05] flex items-center justify-between flex-shrink-0">
                                    <p className="text-[10px] text-slate-700 font-mono tracking-widest uppercase">Magnus S.O. v2.0</p>
                                    <button
                                        onClick={() => setActiveTab('banners')}
                                        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-wider font-bold flex items-center gap-1"
                                    >
                                        <Image size={9} /> Ver secciones
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
