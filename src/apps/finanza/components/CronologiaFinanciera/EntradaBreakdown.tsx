import React, { useMemo } from 'react';
import type { DailyTransaction } from '../../types';

interface EntradaBreakdownProps {
    transactions: DailyTransaction[];
    totalEntradas: number;
}

export const EntradaBreakdown: React.FC<EntradaBreakdownProps> = ({ transactions, totalEntradas }) => {
    const breakdown = useMemo(() => {
        let salario = 0;
        let adicional = 0;
        let rendimiento = 0;

        transactions.forEach(t => {
            if (t.type !== 'income') return;
            const cat = (t.category || '').toLowerCase();
            if (cat.includes('salario') || cat.includes('salary')) {
                salario += t.amount;
            } else if (cat.includes('interest') || cat.includes('dividend') || cat.includes('rendimiento')) {
                rendimiento += t.amount;
            } else {
                // Includes 'freelance', 'bono', etc.
                adicional += t.amount;
            }
        });

        return { salario, adicional, rendimiento };
    }, [transactions]);

    if (totalEntradas === 0) return null;

    const salarioPct = (breakdown.salario / totalEntradas) * 100;
    const adicionalPct = (breakdown.adicional / totalEntradas) * 100;
    const rendimientoPct = (breakdown.rendimiento / totalEntradas) * 100;

    return (
        <div className="mt-4 px-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Desglose de Entradas</h4>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                {salarioPct > 0 && (
                    <div 
                        style={{ width: `${salarioPct}%` }} 
                        className="h-full bg-green-500 transition-all duration-500"
                        title={`Salario: $${breakdown.salario.toLocaleString()}`}
                    />
                )}
                {adicionalPct > 0 && (
                    <div 
                        style={{ width: `${adicionalPct}%` }} 
                        className="h-full bg-emerald-400 transition-all duration-500"
                        title={`Adicional: $${breakdown.adicional.toLocaleString()}`}
                    />
                )}
                {rendimientoPct > 0 && (
                    <div 
                        style={{ width: `${rendimientoPct}%` }} 
                        className="h-full bg-teal-300 transition-all duration-500"
                        title={`Rendimiento: $${breakdown.rendimiento.toLocaleString()}`}
                    />
                )}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-slate-500 justify-between">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Salario
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Adicional
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-300"></span> Rendimiento
                </span>
            </div>
        </div>
    );
};
