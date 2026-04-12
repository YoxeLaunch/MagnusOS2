import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/calculations';

interface CicloData {
  cicloId: string;
  label: string;
  entradas: number;
  gastos: number;
  invertido: number;
  ahorroNeto: number;
  tasaAhorro: number;
}

interface Props {
  ciclos: CicloData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CicloData;
    return (
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl">
        <p className="text-white font-bold mb-3 border-b border-white/10 pb-2">{data.label}</p>
        <div className="space-y-1.5 flex flex-col font-mono text-sm">
           <div className="flex justify-between gap-6">
             <span className="text-emerald-400">Entradas:</span>
             <span className="text-white">{formatCurrency(data.entradas)}</span>
           </div>
           <div className="flex justify-between gap-6">
             <span className="text-rose-400">Gastos:</span>
             <span className="text-white">{formatCurrency(data.gastos)}</span>
           </div>
           <div className="flex justify-between gap-6">
             <span className="text-indigo-400">Invertido:</span>
             <span className="text-white">{formatCurrency(data.invertido)}</span>
           </div>
           <div className="flex justify-between gap-6 font-bold pt-1 border-t border-white/10 mt-1">
             <span className="text-emerald-500">Ahorro Neto:</span>
             <span className="text-emerald-500">{formatCurrency(data.ahorroNeto)}</span>
           </div>
           <div className="flex justify-between gap-6 mt-1 text-xs">
             <span className="text-slate-400">Tasa Ahorro:</span>
             <span className="text-slate-400">{(data.tasaAhorro * 100).toFixed(1)}%</span>
           </div>
        </div>
      </div>
    );
  }
  return null;
};

export const PatrimonioBarChart: React.FC<Props> = ({ ciclos }) => {
  // Use the exact hex colors from the prompt
  const COLORS = {
    entradas: '#5DCAA5',
    gastos: '#E24B4A',
    invertido: '#7F77DD',
    ahorro: '#1D9E75'
  };

  const activeCicloId = ciclos.length > 0 ? ciclos[ciclos.length - 1].cicloId : ''; // Default to most recent

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl h-[350px] w-full mt-8">
      <h3 className="font-serif font-bold text-lg text-white mb-6">Evolución de Flujo y Ahorro en el Año</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={ciclos}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#9ca3af', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(v) => `RD$${(v / 1000).toFixed(0)}K`}
            tick={{ fill: '#9ca3af', fontSize: 12 }} 
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          
          {/* Entradas */}
          <Bar dataKey="entradas" radius={[4, 4, 0, 0]} name="Entradas">
            {ciclos.map((entry, index) => (
              <Cell key={`cell-ent-${index}`} fill={COLORS.entradas} fillOpacity={entry.cicloId === activeCicloId ? 1.0 : 0.65} />
            ))}
          </Bar>

          {/* Gastos */}
          <Bar dataKey="gastos" radius={[4, 4, 0, 0]} name="Gastos">
            {ciclos.map((entry, index) => (
              <Cell key={`cell-gas-${index}`} fill={COLORS.gastos} fillOpacity={entry.cicloId === activeCicloId ? 1.0 : 0.65} />
            ))}
          </Bar>

          {/* Invertido */}
          <Bar dataKey="invertido" radius={[4, 4, 0, 0]} name="Invertido">
            {ciclos.map((entry, index) => (
              <Cell key={`cell-inv-${index}`} fill={COLORS.invertido} fillOpacity={entry.cicloId === activeCicloId ? 1.0 : 0.65} />
            ))}
          </Bar>

          {/* Ahorro Neto */}
          <Bar dataKey="ahorroNeto" radius={[4, 4, 0, 0]} name="Ahorro Neto">
            {ciclos.map((entry, index) => (
              <Cell key={`cell-aho-${index}`} fill={COLORS.ahorro} fillOpacity={entry.cicloId === activeCicloId ? 1.0 : 0.65} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
