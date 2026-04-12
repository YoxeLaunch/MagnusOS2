import React from 'react';
import { CentroComandoMode, CicloOption } from '../../hooks/useCentroComandoData';
import { ShieldAlert, Calendar } from 'lucide-react';

interface Props {
  mode: CentroComandoMode;
  onModeChange: (mode: CentroComandoMode) => void;
  cicloActivo?: string;
  onCicloChange: (id: string) => void;
  ciclosDisponibles: CicloOption[];
}

export const CentroComandoHeader: React.FC<Props> = ({
  mode,
  onModeChange,
  cicloActivo,
  onCicloChange,
  ciclosDisponibles,
}) => {
  const selectedCiclo = ciclosDisponibles.find((c) => c.id === cicloActivo);
  let subTitle = 'Estado Financiero del Imperio';
  if (mode === 'mensual' && selectedCiclo) {
    subTitle += ` · ${selectedCiclo.label.split('(')[0].trim()}`;
  } else if (mode === 'anual') {
    subTitle += ` · Global Anual`;
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <header>
        <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
          <ShieldAlert className="text-blue-500" size={28} />
          Centro de Comando
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-mono text-sm tracking-tight">
          {subTitle}
        </p>
      </header>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        {/* Toggle Mode */}
        <div className="flex items-center bg-slate-200/50 dark:bg-slate-800/50 rounded-lg p-1 border border-slate-300/50 dark:border-white/5">
          <button
            onClick={() => onModeChange('anual')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
              mode === 'anual'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Anual
          </button>
          <button
            onClick={() => onModeChange('mensual')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
              mode === 'mensual'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Mensual
          </button>
        </div>

        {/* Ciclo Selector (Only when mensual) */}
        {mode === 'mensual' && ciclosDisponibles.length > 0 && (
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 text-slate-400" size={16} />
            <select
              value={cicloActivo}
              onChange={(e) => onCicloChange(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-white/20 transition-colors focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none"
            >
              {ciclosDisponibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
