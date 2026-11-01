import React, { useState } from 'react';

const DashboardPreview: React.FC = () => {
  const [activeRange, setActiveRange] = useState<'1A' | '3A' | '5A'>('5A');

  return (
    <div className="mt-16 relative mx-auto max-w-6xl text-left" id="dashboard">
      {/* Ambient Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-theme-gold/30 via-amber-500/20 to-yellow-600/30 rounded-3xl blur-xl opacity-30 animate-pulse"></div>

      <div className="relative rounded-2xl border border-white/15 dark:border-gray-800 bg-[#0a0f1d] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Workstation Window Header */}
        <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0d1424]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/70"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/40 border border-yellow-500/70"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/70"></div>
            </div>
            <span className="text-[11px] font-mono text-gray-400 pl-3 hidden sm:inline">
              magnus.providence.local // terminal // wealth-intelligence
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              NODO SOBERANO: EN LÍNEA
            </span>
            <span className="text-gray-500 hidden md:inline">LEDGER PROVIDENCE v2.0</span>
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Top 4 Real Representative KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Patrimonio Neto Soberano */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-[#0c1222] border border-theme-gold/30 relative overflow-hidden group hover:border-theme-gold transition-colors">
              <div className="flex items-center justify-between text-xs font-mono text-theme-gold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">account_balance</span>
                  Patrimonio Neto
                </span>
                <span className="text-[10px] bg-theme-gold/15 text-theme-gold px-1.5 py-0.5 rounded font-bold">+18.4% YoY</span>
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                RD$ 2,845,600<span className="text-sm text-gray-400 font-normal">.00</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 mt-3 pt-3 border-t border-white/5 font-mono">
                <span>Invertido: RD$ 2.1M</span>
                <span className="text-emerald-400 font-semibold">TIR +12.4%</span>
              </div>
            </div>

            {/* KPI 2: Liquidez & Flujo */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-[#0c1222] border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-400 transition-colors">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">payments</span>
                  Liquidez Inmediata
                </span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Óptima</span>
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                RD$ 745,600<span className="text-sm text-gray-400 font-normal">.00</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 mt-3 pt-3 border-t border-white/5 font-mono">
                <span>Flujo Mensual Neto:</span>
                <span className="text-emerald-400 font-bold">+RD$ 84,500</span>
              </div>
            </div>

            {/* KPI 3: Runway de Supervivencia / Solvencia */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-950/40 via-blue-900/20 to-[#0c1222] border border-blue-500/30 relative overflow-hidden group hover:border-blue-400 transition-colors">
              <div className="flex items-center justify-between text-xs font-mono text-blue-400 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">hourglass_top</span>
                  Runway Estimado
                </span>
                <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-bold">Grado AAA</span>
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                24.8 <span className="text-lg text-gray-400 font-normal">Meses</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 mt-3 pt-3 border-t border-white/5 font-mono">
                <span>Gasto Base: RD$ 30,064</span>
                <span className="text-blue-300">Cobertura Total</span>
              </div>
            </div>

            {/* KPI 4: Rendimiento vs Benchmarking Mercado */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-purple-950/40 via-purple-900/20 to-[#0c1222] border border-purple-500/30 relative overflow-hidden group hover:border-purple-400 transition-colors">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  Rendimiento Tesorería
                </span>
                <span className="text-[10px] bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded font-bold">Spread +2.3%</span>
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                12.15% <span className="text-sm text-gray-400 font-normal">TPA</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 mt-3 pt-3 border-t border-white/5 font-mono">
                <span>Depósitos & Bonos</span>
                <span className="text-purple-300">Supera Inflación</span>
              </div>
            </div>

          </div>

          {/* Middle Section: Chart & Market Portfolio */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Interactive Chart: Curva de Proyección a 5 Años */}
            <div className="lg:col-span-2 p-5 rounded-xl bg-black/40 border border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-gold text-base">show_chart</span>
                    Proyección Patrimonial & Flujo Libre
                  </h4>
                  <p className="text-xs text-gray-400 font-light mt-0.5">
                    Simulación estocástica Monte Carlo (95% de intervalo de confianza)
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-xs font-mono">
                  {(['1A', '3A', '5A'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setActiveRange(r)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        activeRange === r 
                          ? 'bg-theme-gold text-black font-bold shadow' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vector SVG Financial Chart */}
              <div className="h-52 w-full relative">
                <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                  <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                  <line x1="0" y1="140" x2="600" y2="140" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                  {/* Area */}
                  <path 
                    d="M 20 160 Q 150 145 280 115 T 450 65 T 580 30 L 580 185 L 20 185 Z" 
                    fill="url(#chartGrad)" 
                  />

                  {/* Trend line */}
                  <path 
                    d="M 20 160 Q 150 145 280 115 T 450 65 T 580 30" 
                    fill="none" 
                    stroke="url(#strokeGrad)" 
                    strokeWidth="3.2" 
                    strokeLinecap="round"
                  />

                  {/* Data Points */}
                  <circle cx="20" cy="160" r="4" fill="#fbbf24" stroke="#0a0f1d" strokeWidth="2" />
                  <circle cx="280" cy="115" r="4.5" fill="#fbbf24" stroke="#0a0f1d" strokeWidth="2" />
                  <circle cx="450" cy="65" r="4.5" fill="#fef08a" stroke="#0a0f1d" strokeWidth="2" />
                  <circle cx="580" cy="30" r="5.5" fill="#ffffff" stroke="#f59e0b" strokeWidth="2.5" />
                </svg>

                {/* Annotation Badges */}
                <div className="absolute top-2 right-4 px-2 py-1 rounded bg-theme-gold/20 border border-theme-gold/40 text-[10px] font-mono text-theme-gold">
                  Objetivo 5 Años: RD$ 5.4M
                </div>
              </div>

              {/* Chart Footer Milestone */}
              <div className="flex justify-between text-[11px] font-mono text-gray-400 mt-2 pt-2 border-t border-white/5">
                <span>Año 1: Base & Liquidez</span>
                <span>Año 2: Expansión de Rentas</span>
                <span>Año 3: Soberanía de Capital</span>
                <span className="text-theme-gold font-semibold">Año 5: Libertad Patrimonial</span>
              </div>
            </div>

            {/* Right Panel: Portfolio Allocation & Banking Market Intel */}
            <div className="p-5 rounded-xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-theme-gold text-base">pie_chart</span>
                  Distribución de Activos
                </h4>

                {/* Progress bars for assets */}
                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-gray-300">Renta Fija / Depósitos (55%)</span>
                      <span className="text-white font-bold">RD$ 1.56M</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-theme-gold h-full rounded-full" style={{ width: '55%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-gray-300">Activos Operativos (25%)</span>
                      <span className="text-white font-bold">RD$ 711K</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-gray-300">Caja & Liquidez Libre (20%)</span>
                      <span className="text-white font-bold">RD$ 569K</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full rounded-full" style={{ width: '20%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Banking Rate Opportunity */}
              <div className="mt-5 p-3 rounded-lg bg-theme-gold/10 border border-theme-gold/25">
                <div className="flex items-center gap-2 text-xs font-mono text-theme-gold mb-1">
                  <span className="material-symbols-outlined text-sm">stars</span>
                  <span>Oportunidad de Mercado</span>
                </div>
                <p className="text-[11px] text-gray-300 font-light leading-snug">
                  Tasa pasiva destacada para Certificados a 365 días en <strong className="text-white font-mono">11.85% TPA</strong>. Spread neto positivo frente al promedio.
                </p>
              </div>

            </div>

          </div>

          {/* System Footer Status */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 pt-3 border-t border-white/5">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              LIBRO CONTABLE ENCRIPTADO // AUDITORÍA DE PARTIDA DOBLE ACTIVA
            </span>
            <span className="text-theme-gold">PROVIDENCE CAPITAL NETWORK // V2.0</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;