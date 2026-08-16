import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    value: number; // 0-100
    label: string;
    displayValue: string;
    colorClass: string; // e.g. 'text-cyan-400' — used for stroke via currentColor
    glowClass?: string; // e.g. 'drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]'
    size?: number;
}

export const CircularGauge: React.FC<Props> = ({
    value,
    label,
    displayValue,
    colorClass,
    glowClass = '',
    size = 88
}) => {
    const clamped = Math.min(100, Math.max(0, value || 0));
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;
    const center = size / 2;

    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`relative ${colorClass} ${glowClass}`} style={{ width: size, height: size }}>
                <svg width={size} height={size} className="rotate-[-90deg]">
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeOpacity={0.12}
                        strokeWidth={6}
                        fill="none"
                    />
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={6}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-mono font-bold text-slate-100">{displayValue}</span>
                </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold">
                {label}
            </span>
        </div>
    );
};
