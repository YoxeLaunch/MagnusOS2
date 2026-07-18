import React from 'react';

const Simulation: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50 dark:bg-background-dark border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex items-center gap-12">
          
          {/* Text Content */}
          <div className="lg:w-1/2 mb-10 lg:mb-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-xs font-bold uppercase mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-purple"></span>
              </span>
              Simulación Monte Carlo
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">Proyección 2026: El Futuro es Predecible</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
              Hemos integrado modelos estocásticos para simular 2,000 futuros posibles basados en su volatilidad histórica. Nuestro modelo predice qué tan probables son ciertos resultados financieros.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-accent-green mt-1">check_circle</span>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Análisis de Riesgo</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Identifique probabilidades de déficit antes de que ocurran.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-accent-purple mt-1">query_stats</span>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Escenarios Optimistas vs Pesimistas</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Rango de confianza del 95% para su patrimonio futuro.</p>
                </div>
              </li>
            </ul>
            <button className="bg-gray-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
              Probar Simulador
            </button>
          </div>

          {/* Visualization Component */}
          <div className="lg:w-1/2">
            <div className="bg-surface-light dark:bg-[#15181E] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent-purple">show_chart</span>
                  Simulación de Riesgo
                </h3>
                <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">v2.4.1</div>
              </div>
              
              {/* CSS Art Chart */}
              <div className="relative h-64 w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800 mb-6">
                {/* Grid Background */}
                <div 
                  className="absolute inset-0" 
                  style={{ 
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', 
                    backgroundSize: '40px 40px' 
                  }}
                ></div>
                
                {/* Gradient Fill */}
                <div 
                  className="absolute bottom-0 left-0 right-0 top-10" 
                  style={{ 
                    background: 'linear-gradient(180deg, rgba(98, 0, 234, 0.2) 0%, rgba(98, 0, 234, 0) 100%)', 
                    clipPath: 'polygon(0 80%, 20% 75%, 40% 60%, 60% 55%, 80% 30%, 100% 20%, 100% 100%, 0 100%)' 
                  }}
                ></div>
                
                {/* Line Graph */}
                <div 
                  className="absolute bottom-0 left-0 right-0 top-10" 
                  style={{ 
                    background: 'linear-gradient(90deg, #6200EA, #00C853)', 
                    height: '2px', 
                    clipPath: 'polygon(0 80%, 20% 75%, 40% 60%, 60% 55%, 80% 30%, 100% 20%, 100% 21%, 0 81%)', 
                    marginTop: '-1px' 
                  }}
                ></div>
                
                {/* Security Limit */}
                <div className="absolute bottom-10 left-0 right-0 border-b border-dotted border-red-500 opacity-50"></div>
                <div className="absolute bottom-12 right-2 text-[10px] text-red-500">Límite de Seguridad</div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg text-center">
                  <div className="text-[10px] uppercase text-gray-500 mb-1">Pesimista (10%)</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">$43,777</div>
                </div>
                <div className="bg-accent-purple/10 border border-accent-purple/30 p-3 rounded-lg text-center">
                  <div className="text-[10px] uppercase text-accent-purple mb-1 font-bold">Mediana (50%)</div>
                  <div className="text-lg font-bold text-accent-purple">$48,734</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg text-center">
                  <div className="text-[10px] uppercase text-gray-500 mb-1">Optimista (90%)</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">$53,807</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Simulation;