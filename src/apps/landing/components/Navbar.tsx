import React, { useState } from 'react';

interface NavbarProps {
  onNavigate: (view: string) => void;
  currentView: string;
  onLogin: () => void;
  onRegister: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentView, onLogin, onRegister }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = (view: string) => {
    onNavigate(view);
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const linkClass = (view: string) => `cursor-pointer transition-colors text-sm font-medium uppercase tracking-wide ${currentView === view ? 'text-theme-gold' : 'text-gray-600 dark:text-gray-400 hover:text-theme-gold dark:hover:text-theme-gold'}`;

  return (
    <nav className="fixed w-full z-50 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('home')}>
            <div className="bg-gradient-to-br from-theme-gold to-yellow-200 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shadow-theme-gold/20">
              <span className="material-symbols-outlined text-black">pie_chart</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-wide text-gray-900 dark:text-white uppercase">Magnus</span>
              <span className="text-[0.65rem] tracking-[0.2em] font-medium text-theme-gold uppercase">Services</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8 items-center">
            <span className={linkClass('home')} onClick={() => handleNav('home')}>Inicio</span>
            <span className={linkClass('features')} onClick={() => handleNav('features')}>Funcionalidades</span>
            <span className={linkClass('dashboard')} onClick={() => handleNav('dashboard')}>Dashboard</span>
            <span className={linkClass('pricing')} onClick={() => handleNav('pricing')}>Planes</span>
            <button onClick={onLogin} className="bg-transparent border border-gray-300 dark:border-gray-700 hover:border-theme-gold dark:hover:border-theme-gold text-gray-900 dark:text-white px-5 py-2 rounded-lg transition-all text-sm font-medium">Login</button>
            <button onClick={onRegister} className="bg-theme-gold hover:bg-theme-gold-dark text-black px-5 py-2 rounded-lg shadow-lg shadow-theme-gold/20 transition-all text-sm font-bold">Comenzar</button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-500 hover:text-white focus:outline-none focus:text-white"
            >
              <span className="material-symbols-outlined">
                {isMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 absolute w-full px-4 pt-2 pb-6 shadow-xl">
          <div className="flex flex-col space-y-4">
            <span onClick={() => handleNav('home')} className="text-gray-600 dark:text-gray-400 hover:text-theme-gold transition-colors text-sm font-medium uppercase tracking-wide">Inicio</span>
            <span onClick={() => handleNav('features')} className="text-gray-600 dark:text-gray-400 hover:text-theme-gold transition-colors text-sm font-medium uppercase tracking-wide">Funcionalidades</span>
            <span onClick={() => handleNav('dashboard')} className="text-gray-600 dark:text-gray-400 hover:text-theme-gold transition-colors text-sm font-medium uppercase tracking-wide">Dashboard</span>
            <span onClick={() => handleNav('pricing')} className="text-gray-600 dark:text-gray-400 hover:text-theme-gold transition-colors text-sm font-medium uppercase tracking-wide">Planes</span>
            <div className="flex gap-4 pt-2">
              <button onClick={onLogin} className="flex-1 bg-transparent border border-gray-300 dark:border-gray-700 hover:border-theme-gold text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-all text-sm font-medium">Login</button>
              <button onClick={onRegister} className="flex-1 bg-theme-gold hover:bg-theme-gold-dark text-black px-4 py-2 rounded-lg shadow-lg shadow-theme-gold/20 transition-all text-sm font-bold">Comenzar</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;