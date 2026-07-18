import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-neural border-t border-gray-200 dark:border-gray-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-theme-gold w-8 h-8 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-black text-sm">pie_chart</span>
              </div>
              <span className="font-display font-bold text-lg text-gray-900 dark:text-white">MAGNUS</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              La plataforma definitiva para el control y crecimiento de su patrimonio personal y empresarial.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors">Resumen Anual</button></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors">Gestión de Flujo</button></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors">Inversiones</button></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-theme-gold transition-colors">Simulador</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><button onClick={() => navigate('/privacidad')} className="hover:text-theme-gold transition-colors">Privacidad</button></li>
              <li><button onClick={() => navigate('/terminos')} className="hover:text-theme-gold transition-colors">Términos</button></li>
              <li><button onClick={() => navigate('/seguridad')} className="hover:text-theme-gold transition-colors">Seguridad</button></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
          <p className="text-gray-500 dark:text-gray-500 text-sm">© 2024 Magnus Services. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;