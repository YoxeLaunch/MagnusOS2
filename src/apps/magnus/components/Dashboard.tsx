import React from 'react';
import { DAILY_QUOTE } from '../constants';
import { MagnusMap } from './MagnusMap';
import { MentorStudies } from './MentorStudies';

import { ViewState } from '../types';

interface DashboardProps {
  onNavigate?: (view: ViewState) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="px-6 lg:px-12 pb-6 lg:pb-12 pt-0 lg:pt-2 max-w-7xl mx-auto space-y-10 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            BIENVENIDO, ESTRATEGA.
          </h1>
          <p className="text-slate-500 dark:text-slate-400 italic font-display text-lg">
            "El hombre que intenta ser bueno todo el tiempo labra su propia ruina." — Nicolás Maquiavelo
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-4">

          <div className="px-4 py-2 border border-theme-gold/30 text-theme-gold bg-theme-gold/5 rounded text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(212,175,55,0.1)] backdrop-blur-sm">
            Fase Actual: Planificación 2026
          </div>
        </div>
      </header>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          {
            title: 'BRIAN TRACY',
            subtitle: 'Auto-Concepto',
            status: 'Integrado',
            image: '/mentors/brian-tracy-landscape.png',
            color: 'text-blue-500'
          },
          {
            title: 'ROB. GREENE',
            subtitle: 'Poder Social',
            status: '48 Leyes',
            image: '/mentors/robert-greene-landscape.png',
            color: 'text-purple-500'
          },
          {
            title: 'MELINKA BARRERA',
            subtitle: 'Magnetismo',
            status: 'Activo',
            image: '/mentors/melinka-barrera-landscape.png',
            color: 'text-pink-500'
          },
          {
            title: 'IRENE ALBACETE',
            subtitle: 'Inteligencia Emocional',
            status: 'Gestión',
            image: '/mentors/irene-albacete-landscape.png',
            color: 'text-emerald-500'
          }
        ].map((card, idx) => (
          <div key={idx} className="relative h-48 rounded-xl overflow-hidden group shadow-lg transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 border border-slate-200 dark:border-white/10 hover:border-theme-gold/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] cursor-pointer">
            {/* Background Image */}
            <div className="absolute inset-0 bg-slate-900">
              <img src={card.image} alt={card.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-50 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end relative z-10">
              <span className="text-[10px] font-bold tracking-[0.2em] text-theme-gold uppercase mb-1">{card.subtitle}</span>
              <h3 className="font-serif text-xl font-bold text-white mb-2">{card.title}</h3>
              <div className="w-full h-[1px] bg-white/20 mb-2"></div>
              <p className="text-xs text-slate-300">
                Estado: <span className="text-white font-medium">{card.status}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* World Map & Exchange Rate */}
        <div className="lg:col-span-2 h-[500px]">
          <MagnusMap />
        </div>

        {/* Mentor Studies */}
        <div className="lg:col-span-1 h-[600px] lg:h-[800px]">
          <MentorStudies />
        </div>
      </div>

      {/* Quote / Directive (Moved below) */}
      <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/5 p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group shadow-sm dark:shadow-none hover:border-theme-gold/40 transition-all duration-500 hover:shadow-2xl hover:shadow-theme-gold/10 hover:scale-[1.005]">
        <div className="absolute inset-0 bg-gradient-to-r from-theme-gold/5 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl">
          <h2 className="font-serif text-sm font-bold text-theme-gold mb-4 flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-theme-gold rounded-full shadow-[0_0_10px_#D4AF37]"></span>
            DIRECTRIZ DEL DÍA
          </h2>
          <blockquote className="text-xl italic text-slate-700 dark:text-slate-300 leading-relaxed font-display">
            "{DAILY_QUOTE.text}"
          </blockquote>
        </div>

        <div className="relative z-10 flex flex-col items-end min-w-[200px]">
          <cite className="not-italic text-theme-gold font-bold text-sm tracking-widest uppercase mb-4">
            — {DAILY_QUOTE.author}
          </cite>
          <div className="flex gap-2">
            {['Silencio', 'Estrategia', 'Poder'].map(tag => (
              <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-black rounded text-[10px] text-slate-500 border border-slate-200 dark:border-white/10 uppercase tracking-wider transition-colors">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};