import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { FxForwardForecastData } from '../types';

interface ForecastTrajectoryChartProps {
  forecastData: FxForwardForecastData | null;
  currency: string;
}

export const ForecastTrajectoryChart: React.FC<ForecastTrajectoryChartProps> = ({ forecastData, currency }) => {
  const chartData = useMemo(() => {
    if (!forecastData) return [];

    const historyPoints = (forecastData.recentHistory || []).map(p => ({
      date: p.date,
      type: 'HISTORY',
      actualPrice: p.price,
      predictedPrice: null as number | null,
      lower95: null as number | null,
      upper95: null as number | null,
      uncertaintyBand: null as [number, number] | null
    }));

    // Cutoff point connects history and forecast
    const lastHist = historyPoints[historyPoints.length - 1];

    const forecastPoints = (forecastData.trajectory || []).map((t, idx) => ({
      date: t.date,
      type: 'FORECAST',
      actualPrice: null as number | null,
      predictedPrice: t.predictedValue,
      lower95: t.lower95,
      upper95: t.upper95,
      // For Area range [lower, upper]
      uncertaintyBand: (t.lower95 != null && t.upper95 != null) ? [t.lower95, t.upper95] as [number, number] : null
    }));

    // If we have history and forecast, connect them by adding an anchor at originDate
    if (lastHist && forecastPoints.length > 0) {
      lastHist.predictedPrice = lastHist.actualPrice;
      lastHist.lower95 = lastHist.actualPrice;
      lastHist.upper95 = lastHist.actualPrice;
      lastHist.uncertaintyBand = [lastHist.actualPrice, lastHist.actualPrice];
    }

    return [...historyPoints, ...forecastPoints];
  }, [forecastData]);

  const { minVal, maxVal, cutoffDate } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { minVal: 55, maxVal: 65, cutoffDate: '' };
    }

    let min = Infinity;
    let max = -Infinity;

    chartData.forEach(d => {
      if (d.actualPrice != null) {
        min = Math.min(min, d.actualPrice);
        max = Math.max(max, d.actualPrice);
      }
      if (d.predictedPrice != null) {
        min = Math.min(min, d.predictedPrice);
        max = Math.max(max, d.predictedPrice);
      }
      if (d.lower95 != null) min = Math.min(min, d.lower95);
      if (d.upper95 != null) max = Math.max(max, d.upper95);
    });

    const padding = (max - min) * 0.1 || 0.5;
    return {
      minVal: Math.max(0, min - padding),
      maxVal: max + padding,
      cutoffDate: forecastData?.originDate || ''
    };
  }, [chartData, forecastData]);

  if (!forecastData || chartData.length === 0) {
    return (
      <div className="h-72 w-full flex items-center justify-center bg-neutral-950/60 rounded-xl border border-neutral-800 text-xs text-slate-400">
        No hay datos de trayectoria predictiva disponibles para graficar.
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 rounded inline-block" />
            <span className="text-white font-medium">Histórico Oficial Observado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 rounded inline-block" />
            <span className="text-cyan-300 font-medium">Pronóstico Estimado ({forecastData.modelName})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-cyan-500/20 border border-cyan-500/40 rounded inline-block" />
            <span className="text-slate-300">Intervalo Incertidumbre (95%)</span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-amber-400/90">
          Corte: {forecastData.originDate} ➔ {forecastData.targetDate} (+{forecastData.horizon}d)
        </div>
      </div>

      <div className="h-80 w-full bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="uncertaintyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val: string) => {
                if (!val) return '';
                const parts = val.split('-');
                return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
              }}
            />
            <YAxis
              domain={[minVal, maxVal]}
              stroke="#64748b"
              fontSize={11}
              orientation="right"
              tickLine={false}
              tickFormatter={(v: number) => `RD$ ${v.toFixed(2)}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0]?.payload;
                const isFc = point?.type === 'FORECAST';

                return (
                  <div className="bg-neutral-900 border border-neutral-700/80 shadow-2xl p-3 rounded-xl text-xs space-y-1.5 font-mono z-50">
                    <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-1">
                      <span className="font-bold text-white">{label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold ${
                          isFc
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                            : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                        }`}
                      >
                        {isFc ? 'PROYECCIÓN EXPERIMENTAL' : 'HISTÓRICO REAL'}
                      </span>
                    </div>

                    {point.actualPrice != null && !isFc && (
                      <div className="flex justify-between gap-4 text-blue-400">
                        <span>Tasa Observada:</span>
                        <span className="font-bold text-white">RD$ {point.actualPrice.toFixed(4)}</span>
                      </div>
                    )}

                    {point.predictedPrice != null && (
                      <div className="flex justify-between gap-4 text-cyan-400">
                        <span>Pronóstico Modelo:</span>
                        <span className="font-bold text-white">RD$ {point.predictedPrice.toFixed(4)}</span>
                      </div>
                    )}

                    {point.lower95 != null && point.upper95 != null && isFc && (
                      <div className="text-[11px] text-slate-400 border-t border-neutral-800 pt-1 space-y-0.5">
                        <div className="flex justify-between gap-4">
                          <span>Límite Superior 95%:</span>
                          <span className="text-slate-200">RD$ {point.upper95.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Límite Inferior 95%:</span>
                          <span className="text-slate-200">RD$ {point.lower95.toFixed(4)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Vertical separator marking cutoff date */}
            {cutoffDate && (
              <ReferenceLine
                x={cutoffDate}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'CORTE HISTÓRICO',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopLeft'
                }}
              />
            )}

            {/* Uncertainty envelope */}
            <Area
              type="monotone"
              dataKey="uncertaintyBand"
              stroke="#06b6d4"
              strokeDasharray="3 3"
              strokeWidth={1}
              fill="url(#uncertaintyGradient)"
              isAnimationActive={false}
              connectNulls
            />

            {/* Historical Real Line */}
            <Line
              type="stepAfter"
              dataKey="actualPrice"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls
            />

            {/* Forecast Predicted Line */}
            <Line
              type="monotone"
              dataKey="predictedPrice"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#06b6d4', stroke: '#083344', strokeWidth: 1.5 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
