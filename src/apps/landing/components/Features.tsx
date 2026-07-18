import React from 'react';

const Features: React.FC = () => {
  return (
    <section className="py-20 bg-surface-light dark:bg-surface-dark relative" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Centro de Comando Integral</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Herramientas diseñadas para la precisión financiera y la toma de decisiones estratégicas.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Feature 1: Mentorship & Education */}
          <div className="bg-white dark:bg-card-dark p-8 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-theme-gold/50 dark:hover:border-theme-gold/50 transition-colors group shadow-lg dark:shadow-none">
            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 group-hover:bg-theme-gold group-hover:text-black transition-colors text-gray-900 dark:text-white">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-3">Mentoría &amp; Educación</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Acceda a programas educativos personalizados y mentorías con expertos para potenciar su crecimiento profesional y personal.
            </p>
            <a href="#" className="mt-6 inline-flex items-center text-theme-gold text-sm font-bold uppercase tracking-wide hover:text-theme-gold-dark transition-colors">
              Aprender Más <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
            </a>
          </div>

          {/* Feature 2: Health & Nutrition */}
          <div className="bg-white dark:bg-card-dark p-8 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-accent-green/50 dark:hover:border-accent-green/50 transition-colors group shadow-lg dark:shadow-none">
            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 group-hover:bg-accent-green group-hover:text-white transition-colors text-gray-900 dark:text-white">
              <span className="material-symbols-outlined text-3xl">health_and_safety</span>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-3">Salud &amp; Nutrición</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Planes de nutrición adaptados a su estilo de vida y seguimiento de métricas de salud para un bienestar integral.
            </p>
            <a href="#" className="mt-6 inline-flex items-center text-accent-green text-sm font-bold uppercase tracking-wide hover:text-green-400 transition-colors">
              Ver Planes <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
            </a>
          </div>

          {/* Feature 3: Finance & Projections */}
          <div className="bg-white dark:bg-card-dark p-8 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-accent-blue/50 dark:hover:border-accent-blue/50 transition-colors group shadow-lg dark:shadow-none">
            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 group-hover:bg-accent-blue group-hover:text-white transition-colors text-gray-900 dark:text-white">
              <span className="material-symbols-outlined text-3xl">pie_chart</span>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-3">Finanzas &amp; Proyecciones</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Control exhaustivo de presupuesto, seguimiento diario de gastos y proyecciones de flujo de caja a 5 años.
            </p>
            <a href="#" className="mt-6 inline-flex items-center text-accent-blue text-sm font-bold uppercase tracking-wide hover:text-blue-400 transition-colors">
              Gestionar <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Features;