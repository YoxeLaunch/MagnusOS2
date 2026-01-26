import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronRight, Moon, Sun, LogOut, Crown, ArrowLeft, Brain, Home, Wallet, ShieldCheck } from 'lucide-react';
import { NavItem, ViewState, User } from '../types';
import { NAV_ITEMS } from '../constants';
import { UserAvatar } from '../../../shared/components/UserAvatar';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isDark: boolean;
  toggleTheme: () => void;
  user: User | null;
  onLogout: () => void;
  onEditProfile: () => void;
  onOpenAdmin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isDark,
  toggleTheme,
  user,
  onLogout,
  onEditProfile,
  onOpenAdmin
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 z-40 p-4 pointer-events-none" style={{ height: '100dvh' }}>
      {/* Glass Panel Container - Floating Card Style */}
      <div className="flex-1 bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl relative pointer-events-auto transition-colors duration-300">

        {/* Decorative Internal Glow */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-theme-gold/50 to-transparent opacity-50"></div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Brand */}
          <div className="h-20 lg:h-24 flex flex-row items-center justify-start lg:px-6 border-b border-slate-200/50 dark:border-white/5 relative">
            <div className="flex items-center lg:w-full">
              <div className="relative">
                <div className="absolute inset-0 bg-theme-gold/20 blur-lg rounded-full"></div>
                <Brain className="w-8 h-8 text-theme-gold relative z-10" />
              </div>
              <div className="hidden lg:block ml-4">
                <h1 className="font-serif font-bold text-xl tracking-widest text-slate-900 dark:text-white">
                  MENTORIA <span className="text-theme-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">MAGNUS</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6 px-2 lg:px-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-center lg:justify-start px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                    ? 'bg-theme-gold/10 text-theme-gold shadow-[0_0_20px_rgba(212,175,55,0.1)] border border-theme-gold/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
                    }`}
                >
                  <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${isActive ? 'text-theme-gold drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]' : 'group-hover:text-theme-gold transition-colors'}`} />
                  <span className={`hidden lg:block ml-4 font-medium text-sm tracking-wide ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>

                  {/* Hover Glint */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex flex-col gap-2">

          {/* Global Navigation Row */}
          <div className="hidden lg:grid grid-cols-4 gap-2">
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-theme-gold hover:border-theme-gold/30 transition-all shadow-sm group"
              title="Atrás"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>

            <Link
              to="/"
              className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-theme-gold hover:border-theme-gold/30 transition-all shadow-sm group"
              title="Inicio"
            >
              <Home size={18} className="group-hover:scale-110 transition-transform" />
            </Link>

            <Link
              to="/finanza"
              className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm group"
              title="Ir a Finanzas"
            >
              <Wallet size={18} className="group-hover:rotate-12 transition-transform" />
            </Link>

            <Link
              to="/auditor"
              className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm group"
              title="Ir a Auditoría"
            >
              <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
            </Link>
          </div>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200 group border border-transparent hover:border-slate-200 dark:hover:border-white/5"
          >
            {isDark ? (
              <>
                <Sun size={20} className="text-theme-gold group-hover:rotate-180 transition-transform duration-500" />
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
      </div>
    </aside>
  );
};