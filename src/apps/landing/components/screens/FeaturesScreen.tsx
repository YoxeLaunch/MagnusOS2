import React from 'react';
import { useNavigate } from 'react-router-dom';

const FeaturesScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="pt-20 bg-background-light dark:bg-background-dark min-h-screen">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Plataforma Integral de <span className="text-theme-gold">Vida</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Explore las herramientas que hacen de Magnus Services la plataforma definitiva para el control de sus finanzas, salud y crecimiento personal.
          </p>
        </div>
      </div>

      {/* Feature Block 1: AI Assistant (Broadened) */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <div className="bg-theme-gold/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-theme-gold">psychology_alt</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-4">Inteligencia Artificial Integral</h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-6">
                Nuestro motor de IA no solo optimiza sus finanzas, sino que también sugiere planes de nutrición y rutas de aprendizaje basadas en sus objetivos de vida.
              </p>
              <ul className="space-y-3">
                {['Optimización financiera automática', 'Planes de nutrición personalizados', 'Rutas de aprendizaje adaptativas'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <span className="material-symbols-outlined text-accent-green">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2 relative">
               <div className="absolute inset-0 bg-theme-gold/20 blur-3xl rounded-full"></div>
               <div className="relative bg-surface-light dark:bg-card-dark p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl">
                 <div className="flex items-center gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="material-symbols-outlined text-3xl text-theme-gold">smart_toy</span>
                    <div>
                        <div className="font-bold text-gray-900 dark:text-white">Magnus AI Assistant</div>
                        <div className="text-xs text-green-500 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online</div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none max-w-[80%] text-sm text-gray-700 dark:text-gray-300">
                        He notado que su gasto en comida rápida aumentó. ¿Desea ver un plan de comidas saludable para esta semana?
                    </div>
                    <div className="ml-auto bg-theme-gold/20 text-theme-gold-dark p-3 rounded-lg rounded-tr-none max-w-[80%] text-sm text-right">
                        Sí, por favor. Algo bajo en carbohidratos.
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none max-w-[80%] text-sm text-gray-700 dark:text-gray-300">
                        Generando plan semanal... También he agendado su sesión de mentoría para el jueves.
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Block 2: Health & Mentorship */}
      <section className="py-20 bg-surface-light dark:bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-1/2">
              <div className="bg-accent-green/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-accent-green">vital_signs</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-4">Salud y Crecimiento</h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-6">
                Conecte con mentores expertos y acceda a herramientas avanzadas de seguimiento de salud. Su bienestar físico y mental es el activo más valioso.
              </p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                    <div className="font-bold text-2xl text-gray-900 dark:text-white">24/7</div>
                    <div className="text-sm text-gray-500">Monitoreo Salud</div>
                 </div>
                 <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                    <div className="font-bold text-2xl text-gray-900 dark:text-white">Expertos</div>
                    <div className="text-sm text-gray-500">Mentorías</div>
                 </div>
              </div>
            </div>
            <div className="lg:w-1/2">
               <div className="grid grid-cols-2 gap-4">
                  {['Nutrición', 'Fitness', 'Mentoría', 'Mindset'].map((item, i) => (
                      <div key={i} className="bg-white dark:bg-card-dark p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-3 hover:transform hover:-translate-y-1 transition-transform">
                          <span className="material-symbols-outlined text-4xl text-gray-400">
                            {item === 'Nutrición' ? 'restaurant' : item === 'Fitness' ? 'fitness_center' : item === 'Mentoría' ? 'school' : 'self_improvement'}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{item}</span>
                          <span className="text-xs text-green-500 flex items-center gap-1">
                             <span className="material-symbols-outlined text-xs">check</span> Activo
                          </span>
                      </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Block 3: CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-theme-gold/20 blur-3xl rounded-full pointer-events-none"></div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6 relative z-10">¿Listo para tomar el control?</h2>
                <p className="text-gray-400 max-w-2xl mx-auto mb-8 relative z-10">Únase a los usuarios que ya transforman su vida con Magnus Services.</p>
                <button onClick={() => navigate('/register')} className="bg-theme-gold text-black font-bold px-8 py-4 rounded-xl hover:bg-white transition-colors relative z-10">
                    Comenzar Prueba Gratuita
                </button>
            </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesScreen;