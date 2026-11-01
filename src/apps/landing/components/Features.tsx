import React from 'react';

const Features: React.FC = () => {
  const featuresList = [
    {
      id: 'market-intel',
      icon: 'monitoring',
      badge: 'INTELIGENCIA DE MERCADO',
      badgeColor: 'text-theme-gold bg-theme-gold/10 border-theme-gold/30',
      title: 'Monitoreo de Mercado Financiero',
      desc: 'Seguimiento y benchmarking continuo de tasas de interés activas y pasivas del sistema financiero, diferenciales de rendimiento y tipos de cambio para optimizar la colocación de capital.',
      tags: ['Tasas Bancarias en Tiempo Real', 'Benchmarking de Rendimiento', 'Análisis de Inflación'],
      actionText: 'Explorar Mercado',
      href: '#dashboard',
    },
    {
      id: 'wealth-ledger',
      icon: 'account_balance',
      badge: 'CONTROL SOBERANO',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      title: 'Patrimonio & Contabilidad Doble Entrada',
      desc: 'Arquitectura contable de partida doble con conciliación matemática inmutable. Mapeo instantáneo de liquidez libre, capital colocado y cálculo automático de runway de solvencia.',
      tags: ['Libro Mayor Inmutable', 'Auditoría de Transacciones', 'Cálculo de Runway Real'],
      actionText: 'Ver Métricas',
      href: '#dashboard',
    },
    {
      id: 'monte-carlo',
      icon: 'query_stats',
      badge: 'MODELADO MATEMÁTICO',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      title: 'Simulación de Riesgo & Monte Carlo',
      desc: 'Motor estocástico para proyectar más de 10,000 iteraciones sobre su patrimonio. Evalúe escenarios adversos de estrés de liquidez y proyecte su crecimiento a 5 años con rigor estadístico.',
      tags: ['Proyección a 5 Años', 'Test de Estrés de Liquidez', 'Modelado Estocástico'],
      actionText: 'Simular Escenarios',
      href: '#pricing',
    },
  ];

  return (
    <section className="py-24 bg-surface-light dark:bg-surface-dark relative" id="features">
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-96 bg-theme-gold/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-mono font-bold tracking-widest text-theme-gold uppercase px-3 py-1 rounded-full bg-theme-gold/10 border border-theme-gold/20 inline-block mb-3">
            ARQUITECTURA DE CONTROL FINANCIERO
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Centro de Comando de Capital
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-base sm:text-lg font-light leading-relaxed">
            Herramientas diseñadas para la precisión patrimonial, el benchmarking de mercado y la toma de decisiones estratégicas.
          </p>
        </div>
        
        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuresList.map((f) => (
            <div 
              key={f.id}
              className="bg-white dark:bg-card-dark p-8 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-theme-gold/50 dark:hover:border-theme-gold/50 transition-all duration-300 group shadow-lg dark:shadow-none flex flex-col justify-between"
            >
              <div>
                {/* Top Badge & Icon */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-theme-gold group-hover:text-black transition-colors text-theme-gold shadow-sm">
                    <span className="material-symbols-outlined text-3xl">{f.icon}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border uppercase tracking-wider font-semibold ${f.badgeColor}`}>
                    {f.badge}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {f.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6 font-light">
                  {f.desc}
                </p>

                {/* Feature Tags */}
                <ul className="space-y-2 mb-6">
                  {f.tags.map((tag, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-theme-gold"></span>
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>

              <a 
                href={f.href} 
                className="inline-flex items-center text-theme-gold text-xs font-bold uppercase tracking-wider hover:text-theme-gold-dark transition-colors pt-4 border-t border-gray-100 dark:border-gray-800/80 group-hover:border-theme-gold/30"
              >
                {f.actionText} <span className="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </a>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;