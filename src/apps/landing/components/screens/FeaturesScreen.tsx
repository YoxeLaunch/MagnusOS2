import React from 'react';
import { useNavigate } from 'react-router-dom';

const FeaturesScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="pt-20 bg-background-light dark:bg-background-dark min-h-screen select-none">
      
      {/* Header */}
      <div className="bg-surface-light dark:bg-[#070b16] border-b border-gray-200 dark:border-gray-800 py-20 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-theme-gold/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="text-xs font-mono font-bold tracking-widest text-theme-gold uppercase px-3 py-1 rounded-full bg-theme-gold/10 border border-theme-gold/20 inline-block mb-4">
            MAGNUS FINANCIAL SYSTEMS // ARQUITECTURA
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Centro de Comando de <span className="text-theme-gold">Capital Soberano</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
            Descubra las herramientas analíticas de Magnus Financial Systems para la custodia, proyección y toma de decisiones patrimoniales dentro del ecosistema Providence.
          </p>
        </div>
      </div>

      {/* Feature Block 1: Market Intelligence & Banking Benchmarking */}
      <section className="py-20 border-b border-gray-200 dark:border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            <div className="lg:w-1/2">
              <div className="bg-theme-gold/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-theme-gold/20">
                <span className="material-symbols-outlined text-4xl text-theme-gold">monitoring</span>
              </div>
              <span className="text-xs font-mono font-bold text-theme-gold uppercase tracking-widest block mb-2">
                BENCHMARKING DE MERCADO EN TIEMPO REAL
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Inteligencia Financiera &amp; Tasas
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-6 font-light">
                Consolide datos financieros y rendimientos referenciales del mercado para colocar su capital con el máximo retorno ajustado por riesgo.
              </p>
              <ul className="space-y-3.5 mb-8">
                {[
                  'Monitoreo continuo de tasas activas y pasivas promedio del mercado',
                  'Detección de oportunidades de spread en certificados y depósitos a plazo',
                  'Seguimiento macroeconómico de tipo de cambio referencial e inflación',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="material-symbols-outlined text-theme-gold text-lg">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="px-6 py-3 rounded-xl bg-theme-gold text-black font-bold text-xs uppercase tracking-wider hover:bg-theme-gold-dark transition-colors"
              >
                Acceder al Monitor de Tasas
              </button>
            </div>

            {/* Visual Workstation Card */}
            <div className="lg:w-1/2 relative w-full">
              <div className="absolute inset-0 bg-theme-gold/15 blur-3xl rounded-full"></div>
              <div className="relative bg-[#0c1220] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-theme-gold/10 border border-theme-gold/30 flex items-center justify-center text-theme-gold">
                      <span className="material-symbols-outlined text-xl">candlestick_chart</span>
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Monitor de Rendimientos</div>
                      <div className="text-[11px] text-gray-400 font-mono">PROVIDENCE INTEL // V2.0</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    EN LÍNEA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-mono text-gray-400">CERTIFICADOS 365D</div>
                    <div className="text-xl font-bold font-mono text-theme-gold mt-1">11.85%</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">+2.1% vs Promedio</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-mono text-gray-400">TASA PASIVA REF.</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">9.85%</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">Ponderada Sector</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-mono text-gray-400">TASA ACTIVA PREF.</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">13.20%</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">Comercial / PyME</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-mono text-gray-400">USD / DOP CAMBIO</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">60.18</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">Estabilidad Nivel A</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Block 2: Sovereign Accounting & Double Entry */}
      <section className="py-20 border-b border-gray-200 dark:border-gray-800/80 bg-surface-light dark:bg-[#060a14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            
            <div className="lg:w-1/2">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                <span className="material-symbols-outlined text-4xl text-emerald-400">account_balance_wallet</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-2">
                LIBRO MAYOR &amp; AUDITORÍA INMUTABLE
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Partida Doble &amp; Control de Runway
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-6 font-light">
                Cada movimiento financiero se asienta bajo el principio universal de partida doble, garantizando cero descuadres contables y cálculo en tiempo real de meses de supervivencia financiera.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-xl">
                  <div className="font-bold text-2xl font-mono text-theme-gold">100%</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">Conciliación Matemática</div>
                </div>
                <div className="p-4 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-xl">
                  <div className="font-bold text-2xl font-mono text-emerald-400">24.8M</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">Runway Grado AAA</div>
                </div>
              </div>
            </div>

            {/* Double Entry Visualizer */}
            <div className="lg:w-1/2 w-full">
              <div className="bg-[#0b1120] p-6 rounded-2xl border border-white/10 shadow-xl space-y-3 font-mono text-xs">
                <div className="text-gray-400 text-[11px] pb-2 border-b border-white/10 flex justify-between">
                  <span>ASIENTO CONTABLE #2026-4819</span>
                  <span className="text-emerald-400">BALANCEADO</span>
                </div>
                <div className="p-3 rounded-lg bg-white/5 flex justify-between items-center">
                  <div>
                    <div className="text-white font-semibold">1.1.01 Tesorería / Depósito 365D</div>
                    <div className="text-[10px] text-gray-400">Débito · Activo Circulante Rentable</div>
                  </div>
                  <span className="text-emerald-400 font-bold">+RD$ 500,000.00</span>
                </div>
                <div className="p-3 rounded-lg bg-white/5 flex justify-between items-center">
                  <div>
                    <div className="text-white font-semibold">1.1.02 Cuenta Operativa Corriente</div>
                    <div className="text-[10px] text-gray-400">Crédito · Transferencia Interna</div>
                  </div>
                  <span className="text-amber-400 font-bold">-RD$ 500,000.00</span>
                </div>
                <div className="text-[10px] text-gray-500 text-right pt-1">
                  Desviación: RD$ 0.00 · Firma Criptográfica Verificada
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Block 3: Monte Carlo & Stress Test */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#0b1224] to-[#04060c] border border-theme-gold/30 rounded-3xl p-10 md:p-14 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-theme-gold/15 blur-3xl rounded-full pointer-events-none"></div>
            
            <span className="text-xs font-mono font-bold tracking-widest text-theme-gold uppercase px-3 py-1 rounded-full bg-theme-gold/10 border border-theme-gold/20 inline-block mb-4">
              PROYECCIÓN Y RIGOR MATEMÁTICO
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">
              ¿Listo para blindar su soberanía financiera?
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto mb-8 relative z-10 font-light text-base md:text-lg">
              Únase a los fundadores e inversores que operan bajo la suite analítica de Magnus Financial Systems en el ecosistema Providence.
            </p>
            <div className="flex flex-wrap justify-center gap-4 relative z-10">
              <button 
                onClick={() => navigate('/register')} 
                className="bg-theme-gold hover:bg-theme-gold-dark text-black font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-theme-gold/20 text-xs font-mono uppercase tracking-wider"
              >
                Solicitar Acceso Beta
              </button>
              <button 
                onClick={() => navigate('/login')} 
                className="border border-white/20 hover:border-theme-gold text-white font-medium px-8 py-4 rounded-xl transition-colors text-xs font-mono uppercase tracking-wider"
              >
                Ingresar a Consola
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default FeaturesScreen;