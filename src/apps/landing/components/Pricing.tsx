import React from 'react';
import { useNavigate } from 'react-router-dom';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-24 bg-surface-light dark:bg-surface-dark" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-4">Planes de Acceso</h2>
          <p className="text-gray-600 dark:text-gray-400">Únase a nuestra Beta Cerrada y tome el control.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
          
          {/* Free Tier */}
          <div className="bg-white dark:bg-card-dark rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-3 py-1 rounded-bl-lg">BETA CERRADA</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Free</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 h-10">Acceso básico a la plataforma de prueba.</p>
            <div className="flex items-baseline mb-6">
              <span className="text-4xl font-display font-bold text-gray-900 dark:text-white">$0</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <span className="material-symbols-outlined text-green-500 mr-2 text-lg">check</span>
                Seguimiento de gastos básico
              </li>
              <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <span className="material-symbols-outlined text-green-500 mr-2 text-lg">check</span>
                Dashboard mensual
              </li>
              <li className="flex items-center text-sm text-gray-400">
                <span className="material-symbols-outlined mr-2 text-lg">close</span>
                Proyecciones futuras
              </li>
              <li className="flex items-center text-sm text-gray-400">
                <span className="material-symbols-outlined mr-2 text-lg">close</span>
                Simulaciones VIP
              </li>
            </ul>
            <button onClick={() => navigate('/register')} className="w-full py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Unirse a la Beta
            </button>
          </div>

          {/* VIP Tier */}
          <div className="bg-gray-900 dark:bg-[#15181E] rounded-2xl p-8 border-2 border-theme-gold relative transform md:-translate-y-4 shadow-2xl shadow-theme-gold/10 overflow-hidden">
            <div className="absolute top-0 right-0 bg-theme-gold text-black text-xs font-bold px-3 py-1 rounded-bl-lg">BETA CERRADA</div>
            <h3 className="text-xl font-bold text-white mb-2 text-theme-gold">VIP</h3>
            <p className="text-sm text-gray-400 mb-6 h-10">Acceso total a todas las funcionalidades.</p>
            <div className="flex items-baseline mb-6">
              <span className="text-2xl font-display font-bold text-white">Contactar Admin</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-sm text-gray-300">
                <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check</span>
                Todo en Free
              </li>
              <li className="flex items-center text-sm text-gray-300">
                <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check</span>
                Simulaciones Monte Carlo
              </li>
              <li className="flex items-center text-sm text-gray-300">
                <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check</span>
                Conexiones Bancarias Ilimitadas
              </li>
              <li className="flex items-center text-sm text-gray-300">
                <span className="material-symbols-outlined text-theme-gold mr-2 text-lg">check</span>
                Soporte Prioritario
              </li>
            </ul>
            <button onClick={() => navigate('/register')} className="w-full py-3 bg-theme-gold text-black font-bold rounded-lg hover:bg-theme-gold-dark transition-colors shadow-lg shadow-theme-gold/20">
              Solicitar Acceso VIP
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Pricing;