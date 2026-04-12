import React from 'react';
import { formatCurrency } from '../../utils/calculations';
import { AnualData, MensualData } from '../../hooks/useCentroComandoData';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trendDir?: 'up' | 'down' | 'neutral';
  trendText?: string;
  borderColor: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, trendDir, trendText, borderColor }) => {
  return (
    <div className={`relative bg-neutral-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg overflow-hidden`}>
      <div className={`absolute bottom-0 left-0 right-0 h-[3px] bg-${borderColor}-500`} style={{ backgroundColor: borderColor }} />
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-400 font-medium text-sm">{title}</h3>
        {trendText && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${trendDir === 'up' ? 'bg-emerald-500/20 text-emerald-400' : trendDir === 'down' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-400'}`}>
            {trendDir === 'up' && <TrendingUp size={12} />}
            {trendDir === 'down' && <TrendingDown size={12} />}
            {trendDir === 'neutral' && <Minus size={12} />}
            {trendText}
          </div>
        )}
      </div>
      <p className="text-3xl font-serif font-bold text-white tracking-tight">{value}</p>
      {subtitle && <p className="text-slate-500 text-xs mt-2">{subtitle}</p>}
    </div>
  );
};

export const KPIRowAnual: React.FC<{ data: AnualData }> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard 
        title="Patrimonio Neto" 
        value={formatCurrency(data.patrimonioNeto)} 
        borderColor="#7F77DD" // purple
        subtitle="Liquidez + Inversiones"
      />
      <KPICard 
        title="Tasa de Ahorro (Prom.)" 
        value={`${(data.tasaAhorroPromedio * 100).toFixed(1)}%`} 
        borderColor="#1D9E75" // green
        subtitle="Promedio YTD"
      />
      <KPICard 
        title="Burn Rate Diario" 
        value={formatCurrency(data.burnRateDiario)} 
        borderColor="#f59e0b" // amber
        subtitle="Gasto prom. por día YTD"
      />
      <KPICard 
        title="Runway (Días)" 
        value={`${Math.round(data.runwayDias)} días`} 
        borderColor="#3b82f6" // blue
        subtitle="Con liquidez actual"
      />
    </div>
  );
};

export const KPIRowMensual: React.FC<{ data: MensualData }> = ({ data }) => {
  const { comparativoCicloAnterior: comp } = data;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard 
        title="Ahorro Neto" 
        value={formatCurrency(data.ahorroNeto)} 
        borderColor="#1D9E75" // green
        trendDir={comp.deltaAhorro > 0 ? 'up' : comp.deltaAhorro < 0 ? 'down' : 'neutral'}
        trendText={`${comp.deltaAhorro > 0 ? '+' : ''}${comp.deltaAhorro.toFixed(1)}% vs act.`}
      />
      <KPICard 
        title="Tasa de Ahorro" 
        value={`${(data.tasaAhorro * 100).toFixed(1)}%`} 
        borderColor="#1D9E75" // green
      />
      <KPICard 
        title="Burn Rate Diario" 
        value={formatCurrency(data.burnRateDiario)} 
        borderColor="#f59e0b" // amber
        trendDir={comp.deltaGastos > 0 ? 'up' : comp.deltaGastos < 0 ? 'down' : 'neutral'}
        trendText={`${comp.deltaGastos > 0 ? '+' : ''}${comp.deltaGastos.toFixed(1)}% vs act.`}
      />
      <KPICard 
        title="Cash Global" 
        value={formatCurrency(data.cashGlobal)} 
        borderColor="#3b82f6" // blue
        subtitle={`Runway: ${Math.round(data.runwayDias)} días`}
      />
    </div>
  );
};
