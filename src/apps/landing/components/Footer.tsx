import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnusChessLogo, ProvidenceLogo } from './Logos';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[#050811] border-t border-white/10 text-gray-400 pt-16 pb-12 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">

          {/* Col 1: Magnus Brand & Providence Connection */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-theme-gold/30">
                <MagnusChessLogo className="w-full h-full" size={40} />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-white tracking-wider block leading-none">
                  MAGNUS
                </span>
                <span className="text-[0.62rem] tracking-[0.22em] font-semibold text-theme-gold uppercase">
                  Financial Systems
                </span>
              </div>
            </div>

            <p className="text-gray-400 text-xs leading-relaxed font-light">
              Plataforma de soberanía de capital, inteligencia de mercado y proyección financiera unificada.
            </p>

            {/* Providence Ecosystem Badge */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <ProvidenceLogo className="w-7 h-7 shrink-0" size={28} />
              <div>
                <span className="text-[9px] font-mono tracking-widest text-theme-gold uppercase block font-semibold">
                  DIVISIÓN DE CAPITAL
                </span>
                <span className="text-xs text-white font-medium">
                  Ecosistema Providence
                </span>
              </div>
            </div>
          </div>

          {/* Col 2: Plataforma */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-4 font-mono">
              Plataforma
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors cursor-pointer">
                  Monitor de Tasas &amp; Mercado
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors cursor-pointer">
                  Libro Contable de Doble Entrada
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors cursor-pointer">
                  Proyecciones de Flujo a 5 Años
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors cursor-pointer">
                  Simulador de Riesgo Monte Carlo
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors cursor-pointer">
                  Métricas de Runway y Liquidez
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Ecosistema Providence */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-4 font-mono">
              Ecosistema Providence
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <a 
                  href="http://providence.local" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-theme-gold transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-theme-gold"></span>
                  Portal Providence
                </a>
              </li>
              <li>
                <span className="text-gray-500 cursor-default flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                  Horus &amp; Argus Intelligence
                </span>
              </li>
              <li>
                <span className="text-gray-500 cursor-default flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                  AVS Agent Verification
                </span>
              </li>
              <li>
                <span className="text-gray-500 cursor-default flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                  Consola Central Nexus
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal y Seguridad */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-4 font-mono">
              Soberanía &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <button onClick={() => navigate('/privacidad')} className="hover:text-theme-gold transition-colors cursor-pointer">
                  Privacidad &amp; Datos Soberanos
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/terminos')} className="hover:text-theme-gold transition-colors cursor-pointer">
                  Términos de Acceso Beta
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/seguridad')} className="hover:text-theme-gold transition-colors cursor-pointer">
                  Seguridad y Criptografía
                </button>
              </li>
              <li>
                <span className="text-emerald-400/80 text-[11px] font-mono flex items-center gap-1.5 mt-2">
                  <span className="material-symbols-outlined text-sm">shield</span>
                  Auditoría Inmutable
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Subfooter */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-500">
          <p>© {new Date().getFullYear()} Magnus Financial Systems. Operado bajo el ecosistema tecnológico de Providence.</p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-gray-400">PROVIDENCE PROTOCOL // V2.0 ACTIVE</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;