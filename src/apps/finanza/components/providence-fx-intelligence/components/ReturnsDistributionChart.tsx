import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import { FxReturnHistogramBin } from '../types';

interface ReturnsDistributionChartProps {
  bins: FxReturnHistogramBin[];
  p1: number;
  p5: number;
  meanDailyPct: number;
}

export const ReturnsDistributionChart: React.FC<ReturnsDistributionChartProps> = ({
  bins,
  p1,
  p5,
  meanDailyPct
}) => {
  if (!bins || bins.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 bg-neutral-950/40 rounded-xl">
        No hay datos de distribución de retornos disponibles.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1">
        <span className="font-semibold text-white">Histograma de Retornos Diarios ln(P_t / P_t-1)</span>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-emerald-400">Media: {meanDailyPct > 0 ? `+${meanDailyPct}%` : `${meanDailyPct}%`}</span>
          <span className="text-amber-400">VaR 95% (P5): {p5}%</span>
          <span className="text-rose-400">VaR 99% (P1): {p1}%</span>
        </div>
      </div>

      <div className="h-64 w-full bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="midReturnPct"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(count: number) => `${count}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const bin = payload[0].payload as FxReturnHistogramBin;
                return (
                  <div className="bg-neutral-900 border border-neutral-700 p-2.5 rounded-xl shadow-xl text-xs font-mono">
                    <p className="font-bold text-white mb-1">Rango: {bin.rangeLabel}</p>
                    <p className="text-slate-300">Frecuencia: <span className="font-bold text-cyan-400">{bin.count} observaciones</span></p>
                    <p className="text-slate-400 text-[11px]">Probabilidad empírica: {(bin.frequency * 100).toFixed(2)}%</p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={0} stroke="#64748b" strokeWidth={1} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {bins.map((entry, index) => {
                const isLeftTail = entry.midReturnPct <= p5;
                const isExtremeTail = entry.midReturnPct <= p1;
                const isPositive = entry.midReturnPct > 0;

                const fillColor = isExtremeTail
                  ? '#f43f5e' // Rose
                  : isLeftTail
                  ? '#f59e0b' // Amber
                  : isPositive
                  ? '#10b981' // Emerald
                  : '#3b82f6'; // Blue

                return <Cell key={`cell-${index}`} fill={fillColor} fillOpacity={0.85} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
