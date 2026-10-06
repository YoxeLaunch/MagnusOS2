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
  PieChart,
  Target,
  Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MasterLayout } from '../../../shared/components/layout/MasterLayout';
import { useData } from '../context/DataContext';

const FINANZA_NAV_ITEMS = [
  { path: "/finanza", label: "Centro de Comando", icon: LayoutDashboard },
  { path: "/finanza/flujo", label: "Gestión de Flujo", icon: ArrowRightLeft },
  { path: "/finanza/seguimiento", label: "Seguimiento Diario", icon: Receipt },
  { path: "/finanza/patrimonio", label: "Patrimonio Global", icon: Wallet },
  { path: "/finanza/mercado", label: "Mercado", icon: TrendingUp },
  { path: "/finanza/banca", label: "Sistema Bancario", icon: Landmark },
  { path: "/finanza/ahorros", label: "Metas de Ahorro", icon: Target },
  { path: "/finanza/proyecciones", label: "Proyección 2026", icon: LineChart },
];

interface NavLinkProps {
  to: string;
  icon: any;
  label: string;
  isActive: boolean;
  badge?: string;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isActive, badge }) => (
  <motion.div
    whileHover={{ x: isActive ? 0 : 3 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
    <Link
      to={to}
      className={`group relative flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 select-none ${isActive
        ? "text-blue-600 dark:text-blue-400 font-bold"
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
    >
      {/* Active Sliding Pill with Spring Physics */}
      {isActive && (
        <motion.div
          layoutId="activeFinanzaNavPill"
          className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}

      {/* Active Glowing Neon Accent Bar */}
      {isActive && (
        <motion.div
          layoutId="activeFinanzaBar"
          className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)] pointer-events-none"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}

      {/* Item Content */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex items-center justify-center">
          <Icon
            size={19}
            className={`${isActive
              ? "text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              : "group-hover:text-blue-500 transition-colors duration-200"
              } transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
          />
        </div>
        <span className="text-sm tracking-wide transition-colors duration-200">
          {label}
        </span>
      </div>

      {/* Status Badge */}
      {badge && (
        <span className="relative z-10 flex items-center gap-1.5 text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {badge}
        </span>
      )}

      {/* Hover background for inactives */}
      {!isActive && (
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-slate-100/70 dark:bg-white/5 transition-opacity duration-200 pointer-events-none" />
      )}
    </Link>
  </motion.div>
);

// Internal Sidebar Component (Specific to Finanza)
const Sidebar = ({ isDark, toggleTheme }: any) => {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 z-40 p-4 pointer-events-none">
      <div className="flex-1 bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl relative pointer-events-auto transition-colors duration-300">

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>

        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3.5 border-b border-slate-200/50 dark:border-white/5 h-24 relative select-none">
          <div className="relative group cursor-pointer">
            {/* Breathing Ambient Aura */}
            <motion.div
              className="absolute -inset-1 bg-theme-gold/30 blur-xl rounded-2xl pointer-events-none"
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.35, 0.7, 0.35],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.div
              whileHover={{ scale: 1.08, rotate: 4 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-11 h-11 bg-slate-900 dark:bg-slate-950/80 rounded-2xl flex items-center justify-center text-theme-gold shadow-lg shadow-theme-gold/25 relative z-10 ring-2 ring-theme-gold/40 border border-theme-gold/20"
            >
              <PieChart size={22} className="drop-shadow-[0_0_8px_rgba(212,175,55,0.7)]" />
            </motion.div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base lg:text-lg font-serif font-black tracking-tight text-slate-900 dark:text-white leading-none">
                MAGNUS
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" title="Terminal en línea" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-sans font-bold text-theme-gold tracking-[0.25em] uppercase leading-none drop-shadow-[0_0_6px_rgba(212,175,55,0.3)]">
                CAPITAL
              </span>
              <span className="text-[9px] px-1.5 py-0.5 font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 rounded border border-slate-200/50 dark:border-white/5">
                RD
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 space-y-1.5 mt-5 overflow-y-auto custom-scrollbar">
          <NavLink
            to="/finanza"
            icon={LayoutDashboard}
            label="Centro de Comando"
            isActive={location.pathname === "/finanza" || location.pathname === "/finanza/"}
          />
          <NavLink
            to="/finanza/flujo"
            icon={ArrowRightLeft}
            label="Gestión de Flujo"
            isActive={location.pathname.includes("/finanza/flujo")}
          />
          <NavLink
            to="/finanza/seguimiento"
            icon={Receipt}
            label="Seguimiento Diario"
            isActive={location.pathname.includes("/finanza/seguimiento")}
          />
          <NavLink
            to="/finanza/patrimonio"
            icon={Wallet}
            label="Patrimonio Global"
            isActive={location.pathname.includes("/finanza/patrimonio")}
          />
          <NavLink
            to="/finanza/mercado"
            icon={TrendingUp}
            label="Mercado"
            badge="En Vivo"
            isActive={location.pathname.includes("/finanza/mercado")}
          />
          <NavLink
            to="/finanza/banca"
            icon={Landmark}
            label="Sistema Bancario"
            badge="SB v2"
            isActive={location.pathname.includes("/finanza/banca") || location.pathname.includes("/finanza/sistema-bancario")}
          />
          <NavLink
            to="/finanza/ahorros"
            icon={Target}
            label="Metas de Ahorro"
            isActive={location.pathname.includes("/finanza/ahorros")}
          />
          <NavLink
            to="/finanza/proyecciones"
            icon={LineChart}
            label="Proyección 2026"
            isActive={location.pathname.includes("/finanza/proyecciones")}
          />
        </nav>

        {/* Bottom Controls */}
        <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex flex-col gap-2.5">
          {/* Global Navigation Row - Balanced 3 Columns with labels */}
          <div className="grid grid-cols-3 gap-2">
            <motion.button
              whileHover={{ y: -2, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => window.history.back()}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm group"
              title="Atrás"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[9px] font-medium text-slate-400 group-hover:text-blue-500 transition-colors mt-0.5">Atrás</span>
            </motion.button>

            <motion.div whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.94 }}>
              <Link
                to="/"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm group w-full"
                title="Inicio MagnusOS"
              >
                <Home size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-medium text-slate-400 group-hover:text-blue-500 transition-colors mt-0.5">Inicio</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.94 }}>
              <Link
                to="/magnus"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-theme-gold hover:border-theme-gold/30 hover:shadow-[0_0_12px_rgba(212,175,55,0.15)] transition-all shadow-sm group w-full"
                title="Ir a Mentoría Magnus"
              >
                <Brain size={16} className="group-hover:rotate-12 transition-transform" />
                <span className="text-[9px] font-medium text-slate-400 group-hover:text-theme-gold transition-colors mt-0.5">Lab IA</span>
              </Link>
            </motion.div>
          </div>

          {/* Animated Theme Switcher Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100/60 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all duration-200 group border border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  >
                    <Sun size={18} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                  >
                    <Moon size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="text-xs font-semibold tracking-wide">
                {isDark ? "Modo Claro" : "Modo Oscuro"}
              </span>
            </div>

            {/* Pill Toggle Graphic Switch */}
            <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${isDark ? 'bg-amber-400/20 border border-amber-400/30' : 'bg-slate-300 dark:bg-white/10'}`}>
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`w-3.5 h-3.5 rounded-full shadow-sm ${isDark ? 'ml-auto bg-amber-400' : 'bg-slate-500'}`}
              />
            </div>
          </motion.button>
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