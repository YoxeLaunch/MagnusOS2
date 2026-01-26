import React, { useState } from 'react';
import { ViewState } from '../types';
import { ArrowLeft, Check, Crown, Terminal, Box, Columns, Type, Shield, Zap, Eye, MousePointer2 } from 'lucide-react';

interface StyleLabProps {
    onBack: () => void;
}

const STYLES = [
    {
        id: 'sovereign',
        name: 'Sovereign Gold',
        desc: 'Identidad Actual Refinada',
        theme: {
            bg: 'bg-[#0f172a]',
            card: 'bg-[#1e293b]',
            border: 'border-[#D4AF37]',
            text: 'text-white',
            accent: 'text-[#D4AF37]',
            btn: 'bg-[#D4AF37] text-black hover:bg-[#F3C856]',
            fontHead: 'font-serif',
            radius: 'rounded-lg'
        },
        icon: Crown
    },
    {
        id: 'tactical',
        name: 'Tactical Ops',
        desc: 'Militar / HUD Futurista',
        theme: {
            bg: 'bg-[#050505]',
            card: 'bg-[#111] border border-[#00FF41]',
            border: 'border-[#00FF41]',
            text: 'text-[#00FF41]',
            accent: 'text-[#00FF41]',
            btn: 'bg-[#003300] text-[#00FF41] border border-[#00FF41] hover:bg-[#00FF41] hover:text-black uppercase tracking-widest',
            fontHead: 'font-mono',
            radius: 'rounded-none clip-path-polygon-[0_0,100%_0,100%_80%,90%_100%,0_100%]' // Conceptual
        },
        icon: Terminal
    },
    {
        id: 'glass',
        name: 'Glassmorphism 3.0',
        desc: 'Etéreo / Moderno / Fluido',
        theme: {
            bg: 'bg-gradient-to-br from-indigo-900 to-purple-900',
            card: 'bg-white/10 backdrop-blur-xl border border-white/20',
            border: 'border-white/10',
            text: 'text-white',
            accent: 'text-purple-300',
            btn: 'bg-white/20 hover:bg-white/30 backdrop-blur border border-white/40 text-white shadow-lg',
            fontHead: 'font-sans',
            radius: 'rounded-3xl'
        },
        icon: Box
    },
    {
        id: 'imperial',
        name: 'Imperial Classic',
        desc: 'Institucional / Mármol / Serio',
        theme: {
            bg: 'bg-[#f8fafc]',
            card: 'bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            border: 'border-slate-900',
            text: 'text-slate-900',
            accent: 'text-slate-900',
            btn: 'bg-slate-900 text-white hover:bg-slate-700 border-2 border-transparent',
            fontHead: 'font-serif',
            radius: 'rounded-sm'
        },
        icon: Columns
    },
    {
        id: 'neobrutal',
        name: 'Neo-Brutalism',
        desc: 'Alto Contraste / Crudo',
        theme: {
            bg: 'bg-[#FFDEE9]',
            card: 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
            border: 'border-black',
            text: 'text-black font-bold',
            accent: 'text-black',
            btn: 'bg-[#FF6B6B] border-4 border-black text-white font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            fontHead: 'font-sans',
            radius: 'rounded-none'
        },
        icon: Zap
    }
];

export const StyleLab: React.FC<StyleLabProps> = ({ onBack }) => {
    const [selected, setSelected] = useState('sovereign');

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={onBack} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold font-serif text-theme-gold">MAGNUS DESIGN LAB</h1>
                        <p className="text-slate-400">Prototipado de Identidad Visual v2.0</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Style Selector */}
                    <div className="lg:col-span-3 space-y-4">
                        {STYLES.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setSelected(style.id)}
                                className={`w-full p-4  text-left transition-all duration-300 border ${selected === style.id
                                        ? 'bg-theme-gold text-black border-theme-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                                    } ${style.theme.radius}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <style.icon size={18} />
                                        <span className="font-bold">{style.name}</span>
                                    </div>
                                    {selected === style.id && <Check size={16} />}
                                </div>
                                <p className={`text-xs ${selected === style.id ? 'text-black/70' : 'text-slate-600'}`}>
                                    {style.desc}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-9">
                        {STYLES.map(style => {
                            if (style.id !== selected) return null;
                            const t = style.theme;

                            return (
                                <div key={style.id} className={`w-full min-h-[600px] ${t.bg} p-8 border ${t.border} transition-all duration-500 relative overflow-hidden`}>

                                    {/* Abstract Sidebar Concept */}
                                    <div className={`absolute top-0 left-0 bottom-0 w-64 ${t.card} border-r ${t.border} p-6 hidden md:flex flex-col gap-6`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 ${t.btn} flex items-center justify-center`}>M</div>
                                            <span className={`${t.fontHead} ${t.text} font-bold tracking-widest`}>MAGNUS</span>
                                        </div>
                                        <div className="space-y-2">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className={`h-10 w-full ${i === 1 ? 'bg-black/10 dark:bg-white/10' : ''} rounded flex items-center px-3 gap-3 ${t.text} opacity-${i === 1 ? '100' : '60'}`}>
                                                    <div className="w-5 h-5 bg-current opacity-20 rounded-sm"></div>
                                                    <div className="h-2 w-20 bg-current opacity-20 rounded-sm"></div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-auto flex gap-3 items-center">
                                            <div className="w-10 h-10 rounded-full bg-slate-500"></div>
                                            <div>
                                                <div className={`h-3 w-24 bg-current opacity-50 mb-1`}></div>
                                                <div className={`h-2 w-16 bg-current opacity-30`}></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="md:ml-72 space-y-12">

                                        {/* Header Section */}
                                        <div>
                                            <h2 className={`text-4xl ${t.fontHead} ${t.text} mb-2`}>Bienvenido, Soberano.</h2>
                                            <p className={`${t.text} opacity-70`}>Este es el sistema visual "{style.name}".</p>
                                        </div>

                                        {/* UI Components Showcase */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                            {/* Cards */}
                                            <div className={`${t.card} p-8 ${t.radius}`}>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Shield className={t.accent} />
                                                    <h3 className={`${t.fontHead} ${t.text} text-xl font-bold`}>Estado de Defensa</h3>
                                                </div>
                                                <div className={`h-2 w-full bg-current opacity-10 rounded-full mb-4 overflow-hidden`}>
                                                    <div className={`h-full w-3/4 ${t.btn}`}></div>
                                                </div>
                                                <p className={`${t.text} opacity-60 text-sm mb-6`}>
                                                    El sistema está operando a máxima capacidad. No se detectan intrusiones.
                                                </p>
                                                <button className={`w-full py-3 px-6 ${t.btn} ${t.radius} font-bold transition-transform active:scale-95`}>
                                                    EJECUTAR PROTOCOLO
                                                </button>
                                            </div>

                                            {/* Typography & Elements */}
                                            <div className="space-y-6">
                                                <div className={`${t.card} p-6 ${t.radius} flex items-center justify-between`}>
                                                    <div>
                                                        <h4 className={`${t.text} font-bold`}>Notificación</h4>
                                                        <p className={`${t.text} text-xs opacity-60`}>Nueva alerta del sistema</p>
                                                    </div>
                                                    <div className={`w-8 h-8 ${t.btn} ${t.radius} flex items-center justify-center`}>!</div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <button className={`py-3 ${t.btn} ${t.radius} opacity-80 text-xs`}>Secundario</button>
                                                    <button className={`py-3 bg-red-500/20 text-red-500 border border-red-500/50 ${t.radius} text-xs font-bold hover:bg-red-500 hover:text-white transition-colors`}>PELIGRO</button>
                                                </div>

                                                <div className={`${t.card} p-4 ${t.radius} flex gap-3`}>
                                                    <div className="mt-1"><Eye size={16} className={t.accent} /></div>
                                                    <p className={`${t.text} text-sm opacity-80 italic`}>
                                                        "El diseño no es solo lo que se ve y se siente. El diseño es cómo funciona."
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
