import React from 'react';

interface Props {
    data: number[]; // valores de throughput (bytes/intervalo), más reciente al final
    colorClass?: string; // color de texto -> stroke via currentColor
    height?: number;
}

// Sparkline minimalista sin dependencias de charting: SVG puro, pensado para
// vivir de fondo en la tarjeta de un servicio sin competir con el contenido.
export const NetworkSparkline: React.FC<Props> = ({ data, colorClass = 'text-cyan-500', height = 40 }) => {
    if (data.length < 2) return null;

    const width = 240;
    const max = Math.max(...data, 1);
    const step = width / (data.length - 1);

    const points = data
        .map((v, i) => {
            const x = i * step;
            const y = height - (v / max) * height;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className={`w-full h-full ${colorClass}`}
        >
            <polyline
                points={areaPoints}
                fill="currentColor"
                fillOpacity={0.08}
                stroke="none"
            />
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.7}
            />
        </svg>
    );
};
