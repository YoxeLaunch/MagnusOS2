import React from 'react';
import { useNavigate } from 'react-router-dom';

const PricingScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="pt-20 bg-background-light dark:bg-background-dark min-h-screen">
      
      {/* Header */}
      <div className="text-center py-16 px-4">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Planes de Acceso <span className="text-theme-gold">Beta</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Actualmente estamos en Beta Cerrada. Elija su nivel de acceso.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Free */}
             <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-3 py-1 rounded-bl-lg">BETA CERRADA</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Free</h3>
                <div className="text-4xl font-display font-bold my-4 text-gray-900 dark:text-white">$0</div>
                <p className="text-sm text-gray-500 mb-6">Acceso básico para pruebas.</p>
                <button onClick={() => navigate('/register')} className="mt-auto w-full py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white">Unirse</button>
             </div>
             
             {/* VIP */}
             <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-2xl border-2 border-theme-gold relative flex flex-col shadow-2xl shadow-theme-gold/10 overflow-hidden">
                <div className="absolute top-0 right-0 bg-theme-gold text-black text-xs font-bold px-3 py-1 rounded-bl-lg">BETA CERRADA</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">VIP</h3>
                <div className="flex items-baseline my-4">
                    <span className="text-2xl font-display font-bold text-gray-900 dark:text-white">Contactar Admin</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">Acceso completo sin coste durante la beta.</p>
                <button onClick={() => navigate('/register')} className="mt-auto w-full py-3 bg-theme-gold text-black font-bold rounded-lg hover:bg-theme-gold-dark transition-colors">Solicitar VIP</button>
             </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Comparación de Funcionalidades</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="py-4 px-6 text-sm font-medium text-gray-500">Funcionalidad</th>
                <th className="py-4 px-6 text-sm font-medium text-center text-gray-900 dark:text-white">Free</th>
                <th className="py-4 px-6 text-sm font-bold text-center text-theme-gold">VIP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {[
                { name: 'Cuentas Conectadas', free: 'Limitado', vip: 'Ilimitadas' },
                { name: 'Historial de Transacciones', free: '3 Meses', vip: 'Completo' },
                { name: 'Exportación de Datos', free: 'CSV', vip: 'CSV, PDF, Excel' },
                { name: 'Simulación Monte Carlo', free: '-', vip: 'Incluido' },
                { name: 'Soporte', free: 'Comunidad', vip: 'Directo con Admin' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="py-4 px-6 text-sm text-gray-900 dark:text-white font-medium">{row.name}</td>
                  <td className="py-4 px-6 text-sm text-center text-gray-500">{row.free}</td>
                  <td className="py-4 px-6 text-sm text-center font-bold text-theme-gold">{row.vip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-surface-light dark:bg-surface-dark py-20 border-t border-gray-200 dark:border-gray-800">
         <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">Preguntas Frecuentes</h2>
            <div className="space-y-6">
                <details className="group p-6 bg-gray-50 dark:bg-card-dark rounded-xl">
                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-gray-900 dark:text-white">
                        <span>¿Qué significa Beta Cerrada?</span>
                        <span className="transition group-open:rotate-180">
                            <span className="material-symbols-outlined">expand_more</span>
                        </span>
                    </summary>
                    <p className="text-gray-600 dark:text-gray-400 mt-3 group-open:animate-fadeIn">
                        Significa que la plataforma está en fase de pruebas y el acceso es limitado. Buscamos feedback de usuarios seleccionados para mejorar el servicio.
                    </p>
                </details>
                <details className="group p-6 bg-gray-50 dark:bg-card-dark rounded-xl">
                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-gray-900 dark:text-white">
                        <span>¿Cómo obtengo acceso VIP?</span>
                        <span className="transition group-open:rotate-180">
                            <span className="material-symbols-outlined">expand_more</span>
                        </span>
                    </summary>
                    <p className="text-gray-600 dark:text-gray-400 mt-3 group-open:animate-fadeIn">
                        Para obtener acceso VIP, debe ponerse en contacto directamente con el administrador. Evaluaremos su solicitud y le otorgaremos acceso si cumple con los criterios de la beta.
                    </p>
                </details>
            </div>
         </div>
      </div>

    </div>
  );
};

export default PricingScreen;