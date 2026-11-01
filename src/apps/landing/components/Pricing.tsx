import React from 'react';
import { useNavigate } from 'react-router-dom';

const Pricing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-surface-light dark:bg-surface-dark relative" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-mono font-bold tracking-widest text-theme-gold uppercase px-3 py-1 rounded-full bg-theme-gold/10 border border-theme-gold/20 inline-block mb-3">
            FASE BETA PRIVADA // CONTROL DE ACCESO
          </span>
          <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Planes de Acceso Estratégico
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-base font-light">
            Plataforma en fase de despliegue exclusivo dentro del ecosistema Providence. Seleccione su modalidad de acceso.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          
          {/* Free Tier */}
          <div className="bg-white dark:bg-card-dark rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="absolute top-0 right-0 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg tracking-wider">
                BETA ABIERTA
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Beta Standard</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Acceso a la terminal base y gestión de tesorería personal.
              </p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-display font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-xs font-mono text-gray-500 ml-2">/ sin costo en beta</span>
              </div>

              <ul className="space-y-3.5 mb-8">
                <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <span className="material-symbols-outlined text-emerald-400 mr-2 text-lg">check_circle</span>
                  Registro contable y flujo de caja diario
                </li>
                <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <span className="material-symbols-outlined text-emerald-400 mr-2 text-lg">check_circle</span>
                  Dashboard ejecutivo mensual y cálculo de runway
                </li>
                <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <span className="material-symbols-outlined text-emerald-400 mr-2 text-lg">check_circle</span>
                  Monitor de tasas y mercado financiero referencial
                </li>
                <li className="flex items-center text-sm text-gray-400 opacity-60">
                  <span className="material-symbols-outlined mr-2 text-lg">cancel</span>
                  Simulaciones estocásticas Monte Carlo avanzadas
                </li>
                <li className="flex items-center text-sm text-gray-400 opacity-60">
                  <span className="material-symbols-outlined mr-2 text-lg">cancel</span>
                  Proyecciones patrimoniales multiescenario a 5 años
                </li>
              </ul>
            </div>

            <button 
              onClick={() => navigate('/register')} 
              className="w-full py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors uppercase tracking-wider text-xs font-mono"
            >
              Unirse a la Beta
            </button>
          </div>

          {/* VIP Tier */}
          <div className="bg-[#0b1120] rounded-2xl p-8 border-2 border-theme-gold relative transform md:-translate-y-2 shadow-2xl shadow-theme-gold/15 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="absolute top-0 right-0 bg-theme-gold text-black text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg tracking-wider">
                ACCESO INSTITUCIONAL
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2 text-theme-gold flex items-center gap-2">
                <span>Soberano VIP</span>
                <span className="text-xs px-2 py-0.5 rounded bg-theme-gold/20 text-theme-gold font-mono">PROVIDENCE</span>
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Acceso total al motor financiero, simulador y análisis integral.
              </p>

              <div className="flex items-baseline mb-6">
                <span className="text-2xl font-display font-bold text-white">Invitación / Admin</span>
              </div>

              <ul className="space-y-3.5 mb-8">
                <li className="flex items-center text-sm text-gray-200">
                  <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check_circle</span>
                  Todas las funciones del nivel Standard
                </li>
                <li className="flex items-center text-sm text-gray-200">
                  <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check_circle</span>
                  Motor de Simulaciones Monte Carlo ilimitadas
                </li>
                <li className="flex items-center text-sm text-gray-200">
                  <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check_circle</span>
                  Proyecciones de liquidez y estrés a 5 años
                </li>
                <li className="flex items-center text-sm text-gray-200">
                  <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check_circle</span>
                  Auditoría de libro contable de partida doble inmutable
                </li>
                <li className="flex items-center text-sm text-gray-200">
                  <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check_circle</span>
                  Soporte estratégico prioritario y sincronización Providence
                </li>
              </ul>
            </div>

            <button 
              onClick={() => navigate('/register')} 
              className="w-full py-3.5 bg-gradient-to-r from-theme-gold to-theme-gold-dark text-black font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-theme-gold/25 uppercase tracking-wider text-xs font-mono"
            >
              Solicitar Acceso VIP
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Pricing;