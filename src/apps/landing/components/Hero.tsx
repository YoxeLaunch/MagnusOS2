import React, { useState } from 'react';
import DashboardPreview from './DashboardPreview';
import DemoModal from './DemoModal';

const Hero: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);

  // Live market metrics representation
  const marketTickers = [
    { label: 'TASA PASIVA REF.', value: '9.85%', delta: '+0.25%', positive: true },
    { label: 'TASA ACTIVA PREF.', value: '13.20%', delta: '-0.10%', positive: true },
    { label: 'USD / DOP REF.', value: '60.18', delta: '+0.04%', positive: false },
    { label: 'INFLACIÓN INTERANUAL', value: '3.42%', delta: '-0.15%', positive: true },
    { label: 'RENDIMIENTO MEDIO TESORERÍA', value: '11.45%', delta: '+0.80%', positive: true },
  ];

  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden bg-neural">
      {/* Background Cosmic Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-16 right-10 w-80 h-80 bg-theme-gold/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div 
          className="absolute inset-0 opacity-20 dark:opacity-10" 
          style={{ 
            backgroundImage: 'radial-gradient(#6b7280 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* System & Ecosystem Badge */}
        <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-theme-gold/10 border border-theme-gold/30 text-theme-gold text-xs font-mono tracking-widest uppercase mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-theme-gold animate-ping"></span>
          <span>SISTEMA FINANCIERO SOBERANO // V2.0 · ECOSISTEMA PROVIDENCE</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold text-white leading-tight mb-6 tracking-tight">
          Controle su{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-gold via-yellow-200 to-amber-500 drop-shadow-md">
            Patrimonio
          </span>
        </h1>

        {/* Subtitle with market intelligence & strategic capital */}
        <p className="mt-4 max-w-3xl mx-auto text-lg sm:text-xl text-gray-300 font-light leading-relaxed">
          Inteligencia de mercado en tiempo real, proyecciones de flujo de caja a 5 años y gestión soberana de liquidez en una arquitectura financiera unificada.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <a 
            href="#pricing" 
            className="px-8 py-4 bg-gradient-to-r from-theme-gold to-theme-gold-dark text-black font-bold rounded-xl shadow-lg shadow-theme-gold/25 hover:shadow-theme-gold/40 transform hover:-translate-y-1 transition-all duration-300 text-center"
          >
            Ver Planes (Beta Privada)
          </a>
          <button 
            onClick={() => setShowDemo(true)} 
            className="px-8 py-4 bg-white/5 dark:bg-card-dark/80 backdrop-blur-sm border border-gray-300/20 dark:border-gray-700/60 text-white font-medium rounded-xl hover:bg-white/10 dark:hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2 hover:border-theme-gold/40"
          >
            <span className="material-symbols-outlined text-theme-gold">play_circle</span>
            Ver Terminal en Vivo
          </button>
        </div>

        {/* Live Market Pulse Strip */}
        <div className="mt-12 max-w-5xl mx-auto overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-3 select-none">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-gray-400 mb-2 px-3 border-b border-white/5 pb-1.5">
            <span className="flex items-center gap-2 text-theme-gold">
              <span className="material-symbols-outlined text-sm">candlestick_chart</span>
              Monitor de Mercado Financiero // Tiempo Real
            </span>
            <span className="text-[10px] text-gray-500">PROVIDENCE INTEL FEED</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-left">
            {marketTickers.map((item, idx) => (
              <div key={idx} className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:border-theme-gold/30 transition-colors">
                <div className="text-[10px] text-gray-400 tracking-wider font-mono truncate">{item.label}</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-white font-mono">{item.value}</span>
                  <span className={`text-[10px] font-mono ${item.positive ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {item.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Redesigned Rich Dashboard Preview */}
        <DashboardPreview />

        {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
      </div>
    </section>
  );
};

export default Hero;