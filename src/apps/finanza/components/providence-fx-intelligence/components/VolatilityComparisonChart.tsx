import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { FxVolatilityTermPoint } from '../types';

interface VolatilityComparisonChartProps {
  termStructure: FxVolatilityTermPoint[];
  unconditionalAnnualVol: number;
}

export const VolatilityComparisonChart: React.FC<VolatilityComparisonChartProps> = ({
  termStructure,
  unconditionalAnnualVol
}) => {
  if (!termStructure || termStructure.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 bg-neutral-950/40 rounded-xl">
        No hay datos de estructura temporal de volatilidad.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1">
        <span className="font-semibold text-white">Estructura Temporal de Volatilidad GARCH(1,1) (1D a 1Y)</span>
        <span className="text-[11px] font-mono text-purple-400">
          Volatilidad Incondicional L.P.: {(unconditionalAnnualVol * 100).toFixed(2)}%
        </span>
      </div>

      <div className="h-64 w-full bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={termStructure} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="horizonLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload as FxVolatilityTermPoint;
                return (
                  <div className="bg-neutral-900 border border-neutral-700 p-2.5 rounded-xl shadow-xl text-xs font-mono">
                    <p className="font-bold text-white mb-1">Horizonte: {point.horizonLabel} ({point.horizon} días)</p>
                    <p className="text-purple-400">Volatilidad Anualizada: <span className="font-bold text-white">{point.annualizedVolPct}%</span></p>
                    <p className="text-slate-400 text-[11px]">Volatilidad Diaria: {point.dailyVolPct}%</p>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={Number((unconditionalAnnualVol * 100).toFixed(2))}
              stroke="#a855f7"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Largo Plazo',
                fill: '#a855f7',
                fontSize: 10,
                position: 'insideTopRight'
              }}
            />
            <Line
              type="monotone"
              dataKey="annualizedVolPct"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#06b6d4', stroke: '#083344', strokeWidth: 1.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
