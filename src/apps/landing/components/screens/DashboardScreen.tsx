import React, { useEffect, useState } from 'react';

type DashboardTab = 'resumen' | 'cuentas' | 'transacciones' | 'inversiones';

const TAB_ORDER: DashboardTab[] = ['resumen', 'cuentas', 'transacciones', 'inversiones'];

const NAV_ITEMS: { id: DashboardTab; label: string; icon: string }[] = [
  { id: 'resumen', label: 'Resumen General', icon: 'dashboard' },
  { id: 'cuentas', label: 'Cuentas', icon: 'account_balance' },
  { id: 'transacciones', label: 'Transacciones', icon: 'payments' },
  { id: 'inversiones', label: 'Inversiones', icon: 'monitoring' },
];

interface DashboardScreenProps {
  embedded?: boolean;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ embedded = false }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen');
  const [autoplay, setAutoplay] = useState(embedded);

  // In embedded (demo modal) mode, auto-cycle through the tabs like a guided tour.
  // Manual interaction pauses the tour so the visitor can explore freely.
  useEffect(() => {
    if (!embedded || !autoplay) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => TAB_ORDER[(TAB_ORDER.indexOf(prev) + 1) % TAB_ORDER.length]);
    }, 3500);
    return () => clearInterval(timer);
  }, [embedded, autoplay]);

  const selectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    if (embedded) setAutoplay(false);
  };

  return (
    <div className={`flex bg-gray-100 dark:bg-background-dark overflow-hidden ${embedded ? 'h-full' : 'h-screen pt-20'}`}>
      {/* Sidebar */}
      <aside className="w-64 bg-surface-light dark:bg-surface-dark border-r border-gray-200 dark:border-gray-800 hidden lg:flex flex-col">
        <div className="p-6">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Principal</div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => selectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-theme-gold/10 text-theme-gold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-theme-gold to-yellow-200 p-[2px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-bold text-xs">
                MC
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">Usuario Pro</div>
              <div className="text-xs text-gray-500">premium@magnus.app</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Buenos días, Magnus</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Aquí está el resumen integral de su vida hoy.</p>
          </div>
          <div className="flex gap-3">
            <button className="p-2 rounded-lg bg-surface-light dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-theme-gold transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="px-4 py-2 bg-theme-gold text-black font-bold rounded-lg text-sm shadow-lg shadow-theme-gold/20 hover:bg-theme-gold-dark transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">add</span> Nueva Operación
            </button>
          </div>
        </header>

        {activeTab === 'resumen' && (
        <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Patrimonio Total', value: '$1,250,400', change: '+12.5%', isPositive: true, icon: 'account_balance_wallet', color: 'text-theme-gold' },
            { label: 'Flujo de Caja (Mes)', value: '$45,200', change: '+8.2%', isPositive: true, icon: 'savings', color: 'text-accent-green' },
            { label: 'Gastos (Mes)', value: '$12,850', change: '-2.4%', isPositive: true, icon: 'credit_card', color: 'text-accent-blue' },
            { label: 'Pasivos', value: '$150,000', change: '-5.0%', isPositive: true, icon: 'trending_down', color: 'text-accent-orange' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-surface-light dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${stat.color}`}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${stat.isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
                  {stat.change}
                </div>
              </div>
              <div className="text-gray-500 text-sm mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white font-display">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-surface-light dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white">Rendimiento de Cartera</h3>
              <select className="bg-gray-50 dark:bg-gray-800 border-none text-xs rounded-lg px-3 py-1 text-gray-500">
                <option>Últimos 6 meses</option>
                <option>Este año</option>
              </select>
            </div>
            {/* Fake Chart Visualization */}
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {[40, 55, 45, 70, 65, 85, 80, 95, 85, 70, 90, 100].map((h, i) => (
                <div key={i} className="w-full bg-gray-100 dark:bg-gray-800 rounded-t-sm relative group">
                   <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-theme-gold/20 to-theme-gold rounded-t-sm transition-all duration-500 group-hover:opacity-80"
                    style={{ height: `${h}%` }}
                   ></div>
                   {/* Tooltip on hover */}
                   <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                     ${h}k
                   </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-4 border-t border-gray-100 dark:border-gray-800 pt-2">
              <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
              <span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
            </div>
          </div>

          {/* Allocation Circle */}
          <div className="bg-surface-light dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-6">Asignación de Activos</h3>
            <div className="flex items-center justify-center mb-6 relative">
              {/* CSS Donut Chart */}
              <div className="w-48 h-48 rounded-full border-[16px] border-theme-gold/20 relative flex items-center justify-center">
                 <div className="absolute inset-0 rounded-full border-[16px] border-transparent border-t-theme-gold border-r-accent-blue rotate-45"></div>
                 <div className="text-center">
                   <div className="text-3xl font-bold text-gray-900 dark:text-white">100%</div>
                   <div className="text-xs text-gray-500">Diversificado</div>
                 </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-theme-gold"></div>
                  <span className="text-gray-600 dark:text-gray-400">Bienes Raíces</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">45%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-blue"></div>
                  <span className="text-gray-600 dark:text-gray-400">Mercado de Valores</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">35%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-700"></div>
                  <span className="text-gray-600 dark:text-gray-400">Cripto / Efectivo</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">20%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-surface-light dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white">Transacciones Recientes</h3>
            <button className="text-sm text-theme-gold hover:text-theme-gold-dark font-medium">Ver Todo</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Transacción</th>
                  <th className="px-6 py-4 font-medium">Categoría</th>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium text-right">Monto</th>
                  <th className="px-6 py-4 font-medium text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  { name: 'Apple Inc. Dividendos', cat: 'Ingresos Pasivos', date: 'Hoy, 10:23 AM', amount: '+$1,250.00', status: 'Completado', isInc: true },
                  { name: 'Arrendamiento Torre Central', cat: 'Bienes Raíces', date: 'Ayer, 4:00 PM', amount: '+$8,500.00', status: 'Completado', isInc: true },
                  { name: 'Mantenimiento Vehicular', cat: 'Gastos', date: '22 Feb 2024', amount: '-$450.00', status: 'Pendiente', isInc: false },
                  { name: 'Compra Acciones TSLA', cat: 'Inversión', date: '20 Feb 2024', amount: '-$2,300.00', status: 'Completado', isInc: false },
                ].map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.name}</td>
                    <td className="px-6 py-4 text-gray-500">{t.cat}</td>
                    <td className="px-6 py-4 text-gray-500">{t.date}</td>
                    <td className={`px-6 py-4 font-bold text-right ${t.isInc ? 'text-accent-green' : 'text-gray-900 dark:text-white'}`}>{t.amount}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.status === 'Completado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

        {activeTab === 'cuentas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Cuenta Corriente', bank: 'Banco Popular', balance: '$18,420.50', icon: 'account_balance' },
              { name: 'Ahorros Dólares', bank: 'Banreservas', balance: '$32,150.00', icon: 'savings' },
              { name: 'Tarjeta de Crédito', bank: 'Scotiabank', balance: '-$1,980.30', icon: 'credit_card' },
              { name: 'Bienes Raíces', bank: 'Torre Central', balance: '$980,000.00', icon: 'home_work' },
              { name: 'Cripto Wallet', bank: 'Cold Storage', balance: '$14,730.00', icon: 'currency_bitcoin' },
              { name: 'Fondo de Emergencia', bank: 'Banreservas', balance: '$25,000.00', icon: 'shield' },
            ].map((acc, idx) => (
              <div key={idx} className="bg-surface-light dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-theme-gold/10 text-theme-gold">
                    <span className="material-symbols-outlined">{acc.icon}</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">{acc.name}</div>
                    <div className="text-xs text-gray-500">{acc.bank}</div>
                  </div>
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white font-display">{acc.balance}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transacciones' && (
          <div className="bg-surface-light dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white">Historial de Transacciones</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium">Transacción</th>
                    <th className="px-6 py-4 font-medium">Categoría</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium text-right">Monto</th>
                    <th className="px-6 py-4 font-medium text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { name: 'Apple Inc. Dividendos', cat: 'Ingresos Pasivos', date: 'Hoy, 10:23 AM', amount: '+$1,250.00', status: 'Completado', isInc: true },
                    { name: 'Arrendamiento Torre Central', cat: 'Bienes Raíces', date: 'Ayer, 4:00 PM', amount: '+$8,500.00', status: 'Completado', isInc: true },
                    { name: 'Mantenimiento Vehicular', cat: 'Gastos', date: '22 Feb 2024', amount: '-$450.00', status: 'Pendiente', isInc: false },
                    { name: 'Compra Acciones TSLA', cat: 'Inversión', date: '20 Feb 2024', amount: '-$2,300.00', status: 'Completado', isInc: false },
                    { name: 'Supermercado La Sirena', cat: 'Gastos', date: '19 Feb 2024', amount: '-$185.40', status: 'Completado', isInc: false },
                    { name: 'Pago Nómina', cat: 'Ingresos', date: '15 Feb 2024', amount: '+$3,200.00', status: 'Completado', isInc: true },
                    { name: 'Suscripción Cloud', cat: 'Servicios', date: '14 Feb 2024', amount: '-$59.00', status: 'Pendiente', isInc: false },
                  ].map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.name}</td>
                      <td className="px-6 py-4 text-gray-500">{t.cat}</td>
                      <td className="px-6 py-4 text-gray-500">{t.date}</td>
                      <td className={`px-6 py-4 font-bold text-right ${t.isInc ? 'text-accent-green' : 'text-gray-900 dark:text-white'}`}>{t.amount}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.status === 'Completado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inversiones' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-surface-light dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white mb-6">Portafolio de Inversiones</h3>
              <div className="space-y-4">
                {[
                  { name: 'Acciones TSLA', qty: '12 unidades', value: '$4,380.00', change: '+6.2%' },
                  { name: 'ETF S&P 500', qty: '30 unidades', value: '$15,900.00', change: '+3.8%' },
                  { name: 'Bono Gubernamental', qty: 'RD$50,000 nominal', value: '$52,100.00', change: '+1.1%' },
                  { name: 'Bitcoin', qty: '0.15 BTC', value: '$9,750.00', change: '-2.4%' },
                ].map((inv, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{inv.name}</div>
                      <div className="text-xs text-gray-500">{inv.qty}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">{inv.value}</div>
                      <div className={`text-xs font-bold ${inv.change.startsWith('-') ? 'text-red-500' : 'text-accent-green'}`}>{inv.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-light dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Rendimiento Total</h3>
              <div className="text-3xl font-bold text-accent-green font-display mb-1">+9.4%</div>
              <div className="text-xs text-gray-500 mb-6">Últimos 12 meses</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white font-display">$82,130.00</div>
              <div className="text-xs text-gray-500">Valor total invertido</div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default DashboardScreen;