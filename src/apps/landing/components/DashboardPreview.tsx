import React from 'react';

const DashboardPreview: React.FC = () => {
  return (
    <div className="mt-16 relative mx-auto max-w-5xl" id="dashboard">
      <div className="absolute -inset-1 bg-gradient-to-r from-theme-gold to-accent-blue rounded-2xl blur opacity-20 animate-pulse"></div>
      <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-card-dark shadow-2xl overflow-hidden">
        {/* Window Header */}
        <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 bg-gray-50 dark:bg-[#15181E]">
          <div className="flex gap-1.5 ml-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
          </div>
          <div className="mx-auto text-xs text-gray-400 font-mono">magnus-services.app/dashboard</div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          {/* Card 1: Patrimonio Neto */}
          <div className="rounded-xl p-6 bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-500/30 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
              <span className="material-symbols-outlined text-6xl text-accent-orange">currency_exchange</span>
            </div>
            <div className="flex items-center gap-2 mb-2 text-accent-orange font-bold text-xs tracking-wider uppercase">
              <span className="material-symbols-outlined text-base">trending_up</span> Patrimonio Neto
            </div>
            <div className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">RD$25,061.46</div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-4">
              <div>
                <div className="text-gray-500">Capital Invertido</div>
                <div className="text-gray-900 dark:text-white font-medium">RD$40,000.00</div>
              </div>
              <div className="text-right">
                <div className="text-gray-500">Liquidez</div>
                <div className="text-red-400 font-medium">-RD$14,938.54</div>
              </div>
            </div>
          </div>

          {/* Card 2: Tasa de Ahorro */}
          <div className="rounded-xl p-6 bg-gradient-to-br from-green-900/40 to-green-800/20 border border-accent-green/30 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
              <span className="material-symbols-outlined text-6xl text-accent-green">savings</span>
            </div>
            <div className="flex items-center gap-2 mb-2 text-accent-green font-bold text-xs tracking-wider uppercase">
              <span className="material-symbols-outlined text-base">account_balance_wallet</span> Tasa de Ahorro
            </div>
            <div className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">58.9%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">Del ingreso total del mes</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-accent-green h-full rounded-full" style={{ width: '58.9%' }}></div>
            </div>
          </div>

          {/* Card 3: Runway Estimado */}
          <div className="rounded-xl p-6 bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-accent-blue/30 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
              <span className="material-symbols-outlined text-6xl text-accent-blue">water_drop</span>
            </div>
            <div className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white font-bold text-xs tracking-wider uppercase">
              <span className="material-symbols-outlined text-base">timer</span> Runway Estimado
            </div>
            <div className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">215 Días</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Supervivencia con saldo actual</div>
            <div className="mt-4 flex items-center gap-2 text-xs text-accent-blue">
              <span className="material-symbols-outlined text-sm">show_chart</span> +12 días vs mes anterior
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;