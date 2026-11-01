import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/calculations';
import { AnualData, MensualData } from '../../hooks/useCentroComandoData';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trendDir?: 'up' | 'down' | 'neutral';
  trendText?: string;
  borderColor: string;
  onClick?: () => void;
  linkText?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trendDir,
  trendText,
  borderColor,
  onClick,
  linkText = 'Ver detalle'
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative bg-white/80 dark:bg-neutral-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg overflow-hidden transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:border-slate-400 dark:hover:border-white/30 hover:shadow-xl group' : ''
      }`}
    >
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: borderColor }} />
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm flex items-center gap-1">
          {title}
          {onClick && (
            <ArrowUpRight size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </h3>
        {trendText && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${trendDir === 'up' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : trendDir === 'down' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'}`}>
            {trendDir === 'up' && <TrendingUp size={12} />}
            {trendDir === 'down' && <TrendingDown size={12} />}
            {trendDir === 'neutral' && <Minus size={12} />}
            {trendText}
          </div>
        )}
      </div>
      <p className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
      <div className="flex items-center justify-between mt-2">
        {subtitle && <p className="text-slate-400 dark:text-slate-500 text-xs">{subtitle}</p>}
        {onClick && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors">
            {linkText}
          </span>
        )}
      </div>
    </div>
  );
};

export const KPIRowAnual: React.FC<{ data: AnualData }> = ({ data }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard 
        title="Patrimonio Neto" 
        value={formatCurrency(data.patrimonioNeto)} 
        borderColor="#7F77DD" // purple
        subtitle="Liquidez + Inversiones"
        onClick={() => navigate('/finanza/patrimonio')}
        linkText="Ir a Patrimonio"
      />
      <KPICard 
        title="Tasa de Ahorro (Prom.)" 
        value={`${(data.tasaAhorroPromedio * 100).toFixed(1)}%`} 
        borderColor="#1D9E75" // green
        subtitle="Promedio YTD"
        onClick={() => navigate('/finanza/flujo')}
        linkText="Ir a Flujo"
      />
      <KPICard 
        title="Burn Rate Diario" 
        value={formatCurrency(data.burnRateDiario)} 
        borderColor="#f59e0b" // amber
        subtitle="Gasto prom. por día YTD"
        onClick={() => navigate('/finanza/proyecciones')}
        linkText="Laboratorio"
      />
      <KPICard 
        title="Runway (Días)" 
        value={`${Math.round(data.runwayDias)} días`} 
        borderColor="#3b82f6" // blue
        subtitle="Con liquidez actual"
        onClick={() => navigate('/finanza/proyecciones')}
        linkText="Laboratorio"
      />
    </div>
  );
};

export const KPIRowMensual: React.FC<{ data: MensualData }> = ({ data }) => {
  const navigate = useNavigate();
  const { comparativoCicloAnterior: comp } = data;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard 
        title="Ahorro Neto" 
        value={formatCurrency(data.ahorroNeto)} 
        borderColor="#1D9E75" // green
        trendDir={comp.deltaAhorro > 0 ? 'up' : comp.deltaAhorro < 0 ? 'down' : 'neutral'}
        trendText={`${comp.deltaAhorro > 0 ? '+' : ''}${comp.deltaAhorro.toFixed(1)}% vs act.`}
        onClick={() => navigate('/finanza/flujo')}
        linkText="Ir a Flujo"
      />
      <KPICard 
        title="Tasa de Ahorro" 
        value={`${(data.tasaAhorro * 100).toFixed(1)}%`} 
        borderColor="#1D9E75" // green
        onClick={() => navigate('/finanza/flujo')}
        linkText="Ir a Flujo"
      />
      <KPICard 
        title="Burn Rate Diario" 
        value={formatCurrency(data.burnRateDiario)} 
        borderColor="#f59e0b" // amber
        trendDir={comp.deltaGastos > 0 ? 'up' : comp.deltaGastos < 0 ? 'down' : 'neutral'}
        trendText={`${comp.deltaGastos > 0 ? '+' : ''}${comp.deltaGastos.toFixed(1)}% vs act.`}
        onClick={() => navigate('/finanza/proyecciones')}
        linkText="Laboratorio"
      />
      <KPICard 
        title="Cash Global" 
        value={formatCurrency(data.cashGlobal)} 
        borderColor="#3b82f6" // blue
        subtitle={`Runway: ${Math.round(data.runwayDias)} días`}
        onClick={() => navigate('/finanza/patrimonio')}
        linkText="Ir a Patrimonio"
      />
    </div>
  );
};
