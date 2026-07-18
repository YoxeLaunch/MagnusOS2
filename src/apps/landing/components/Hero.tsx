import React, { useState } from 'react';
import DashboardPreview from './DashboardPreview';
import DemoModal from './DemoModal';

const Hero: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-neural">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 right-10 w-64 h-64 bg-theme-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl"></div>
        <div 
          className="absolute inset-0 opacity-20 dark:opacity-10" 
          style={{ 
            backgroundImage: 'radial-gradient(#6b7280 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block py-1 px-3 rounded-full bg-theme-gold/10 border border-theme-gold/20 text-theme-gold text-xs font-bold tracking-widest uppercase mb-6 animate-float">
          Sistema Migrado v2.0
        </span>
        <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
          Controle <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-gold via-yellow-100 to-theme-gold-dark drop-shadow-sm">Su Vida</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-300 font-light">
          Gestión integral de finanzas, mentorías educativas y herramientas de salud y nutrición en una sola plataforma unificada.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <a href="#pricing" className="px-8 py-4 bg-gradient-to-r from-theme-gold to-theme-gold-dark text-black font-bold rounded-xl shadow-lg shadow-theme-gold/25 hover:shadow-theme-gold/40 transform hover:-translate-y-1 transition-all duration-300 text-center">
            Ver Planes
          </a>
          <button onClick={() => setShowDemo(true)} className="px-8 py-4 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-theme-gold">play_circle</span> Ver Demo
          </button>
        </div>

        <DashboardPreview />

        {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
      </div>
    </section>
  );
};

export default Hero;