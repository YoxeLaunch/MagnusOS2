import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardScreen from './screens/DashboardScreen';

interface DemoModalProps {
  onClose: () => void;
}

const DemoModal: React.FC<DemoModalProps> = ({ onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-background-dark w-full max-w-6xl h-[85vh] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-surface-dark">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-green"></span>
            </span>
            <div>
              <div className="font-bold text-white text-sm">Demo interactivo</div>
              <div className="text-xs text-gray-500">Datos de ejemplo &mdash; recorrido automático, o navegue usted mismo</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="hidden sm:flex px-4 py-2 bg-theme-gold hover:bg-theme-gold-dark text-black text-sm font-bold rounded-lg transition-colors"
            >
              Comenzar Prueba Gratuita
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar demo"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <DashboardScreen embedded />
        </div>
      </div>
    </div>
  );
};

export default DemoModal;
