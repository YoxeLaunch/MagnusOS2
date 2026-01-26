import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  PiggyBank,
  CircleDollarSign,
  ArrowLeft,
  Wallet,
  LineChart,
  Home,
  Brain,
  Sun,
  Moon,
  Banknote,
  Check,
  X as XIcon,
  ArrowRightLeft,
  ShieldCheck,
  PieChart
} from 'lucide-react';
import { MasterLayout } from '../../../shared/components/layout/MasterLayout';
import { useData } from '../context/DataContext';

const FINANZA_NAV_ITEMS = [
  { path: "/finanza", label: "Resumen Anual", icon: LayoutDashboard },
  { path: "/finanza/flujo", label: "Gestión de Flujo", icon: ArrowRightLeft },
  { path: "/finanza/seguimiento", label: "Seguimiento Diario", icon: Receipt },
  { path: "/finanza/patrimonio", label: "Patrimonio Global", icon: Wallet },
  { path: "/finanza/inversiones", label: "Inversiones", icon: PiggyBank },
  { path: "/finanza/proyecciones", label: "Proyección 2026", icon: LineChart },
];

const NavLink = ({ to, icon: Icon, label, isActive }: { to: string, icon: any, label: string, isActive: boolean }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] border border-blue-500/20 font-bold"
      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent"
      }`}
  >
    <Icon size={20} className={`${isActive ? "text-blue-600 dark:text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" : "group-hover:text-blue-500 transition-colors"} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`} />
    <span className="text-sm tracking-wide">{label}</span>
    {/* Hover Glint */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
  </Link>
);

// Internal Sidebar Component (Specific to Finanza)
const Sidebar = ({ isDark, toggleTheme }: any) => {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 z-40 p-4 pointer-events-none">
      <div className="flex-1 bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl relative pointer-events-auto transition-colors duration-300">

        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>

        <div className="p-6 flex items-center gap-3 border-b border-slate-200/50 dark:border-white/5 h-24 relative">
          <div className="relative">
            <div className="absolute inset-0 bg-theme-gold/30 blur-lg rounded-full"></div>
            <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-theme-gold shadow-lg shadow-theme-gold/20 relative z-10 ring-2 ring-theme-gold/30">
              <PieChart size={22} />
            </div>
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-serif font-black tracking-tight text-slate-900 dark:text-white leading-none">
              MAGNUS
            </h1>
            <span className="text-[10px] font-sans font-bold text-theme-gold tracking-[0.25em] uppercase mt-1 inline-block">
              CAPITAL
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-6 overflow-y-auto custom-scrollbar">
          <NavLink to="/finanza" icon={LayoutDashboard} label="Resumen Anual" isActive={location.pathname === "/finanza" || location.pathname === "/finanza/"} />
          <NavLink to="/finanza/flujo" icon={ArrowRightLeft} label="Gestión de Flujo" isActive={location.pathname.includes("/finanza/flujo")} />
          <NavLink to="/finanza/seguimiento" icon={Receipt} label="Seguimiento Diario" isActive={location.pathname.includes("/finanza/seguimiento")} />
          <NavLink to="/finanza/patrimonio" icon={Wallet} label="Patrimonio Global" isActive={location.pathname.includes("/finanza/patrimonio")} />
          <NavLink to="/finanza/inversiones" icon={PiggyBank} label="Inversiones" isActive={location.pathname.includes("/finanza/inversiones")} />
          <NavLink to="/finanza/proyecciones" icon={LineChart} label="Proyección 2026" isActive={location.pathname.includes("/finanza/proyecciones")} />
        </nav>

        <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex flex-col gap-2">
          {/* Global Navigation Row */}
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => window.history.back()} className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm group" title="Atrás">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <Link to="/" className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm group" title="Inicio">
              <Home size={18} className="group-hover:scale-110 transition-transform" />
            </Link>
            <Link to="/magnus" className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-theme-gold hover:border-theme-gold/30 transition-all shadow-sm group" title="Ir a Mentoría Magnus">
              <Brain size={18} className="group-hover:rotate-12 transition-transform" />
            </Link>
            <Link to="/auditor" className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm group" title="Ir a Auditoría">
              <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
            </Link>
          </div>

          <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200 group border border-transparent hover:border-slate-200 dark:hover:border-white/5">
            {isDark ? (
              <>
                <Sun size={20} className="text-blue-400 group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-sm font-medium">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon size={20} className="group-hover:-rotate-12 transition-transform duration-300" />
                <span className="text-sm font-medium">Modo Oscuro</span>
              </>
            )}
          </button>
        </div>
      </div >
    </aside >
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dailyTransactions, addDailyTransaction } = useData();
  const [salaryPrompt, setSalaryPrompt] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // --- AUTOMATION: SALARY CHECK (Day 25+) ---
  useEffect(() => {
    const checkSalary = () => {
      const now = new Date();
      if (now.getDate() >= 25) {
        const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
        const hasSalary = dailyTransactions.some(t =>
          t.date.startsWith(currentMonth) &&
          t.type === 'income' &&
          (t.category === 'Salario' || (t.description && t.description.toLowerCase().includes('sueldo')) || (t.description && t.description.toLowerCase().includes('nomina')))
        );

        if (!hasSalary) setSalaryPrompt(true);
      }
    };
    const timer = setTimeout(checkSalary, 1000);
    return () => clearTimeout(timer);
  }, [dailyTransactions]);

  const navItems = FINANZA_NAV_ITEMS.map(item => ({
    label: item.label,
    icon: item.icon,
    onClick: () => navigate(item.path),
    isActive: location.pathname === item.path || (item.path !== '/finanza' && location.pathname.includes(item.path)),
    id: item.path // For compatibility
  }));

  return (
    <MasterLayout
      SidebarComponent={Sidebar}
      currentApp="finanza"
      navItems={navItems}
    >
      {children}

      {/* SALARY PROMPT MODAL */}
      {salaryPrompt && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom duration-500">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-theme-gold/50 p-4 w-80">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-lg">
                  <Banknote size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">¡Día de Pago!</h4>
                  <p className="text-xs text-slate-500">Es día 25. ¿Registrar salario?</p>
                </div>
              </div>
              <button onClick={() => setSalaryPrompt(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const amount = (form.elements.namedItem('amount') as HTMLInputElement).value;

                addDailyTransaction({
                  date: new Date().toISOString().split('T')[0],
                  amount: parseFloat(amount),
                  description: 'Salario Mensual',
                  type: 'income',
                  category: 'Salario'
                });
                setSalaryPrompt(false);
              }}
              className="mt-3 flex gap-2"
            >
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  name="amount"
                  placeholder="Monto..."
                  className="w-full pl-5 pr-2 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-theme-gold"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-theme-gold hover:bg-yellow-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                title="Guardar"
              >
                <Check size={14} /> Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </MasterLayout>
  );
};