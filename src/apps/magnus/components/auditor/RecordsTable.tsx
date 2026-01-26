import React, { useMemo } from 'react';
import { MedicalRecord } from './data';

interface RecordsTableProps {
    data: MedicalRecord[];
}

// Utility to format currency like the design (19.180,43)
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2,
    }).format(amount).replace('DOP', '$');
};

export const RecordsTable: React.FC<RecordsTableProps> = ({ data }) => {

    const totals = useMemo(() => {
        return data.reduce(
            (acc, curr) => ({
                coverage: acc.coverage + curr.coverage,
                glossedAmount: acc.glossedAmount + curr.glossedAmount,
                amountToPay: acc.amountToPay + curr.amountToPay,
            }),
            { coverage: 0, glossedAmount: 0, amountToPay: 0 }
        );
    }, [data]);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.2)] bg-white dark:bg-black/20 backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold font-mono">
                            <th className="px-6 py-4 w-12 text-center text-theme-gold">#</th>
                            <th className="px-6 py-4">F. Cierre</th>
                            <th className="px-6 py-4 min-w-[240px]">Nombre Paciente</th>
                            <th className="px-6 py-4">NAP</th>
                            <th className="px-6 py-4">Nota</th>
                            <th className="px-6 py-4 text-right">Cobertura</th>
                            <th className="px-6 py-4 text-right text-red-500 dark:text-red-400">Monto Glosado</th>
                            <th className="px-6 py-4 text-right text-emerald-500 dark:text-emerald-400">A Pagar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm text-slate-700 dark:text-slate-300">
                        {data.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 text-center text-slate-400 dark:text-slate-500 font-medium group-hover:text-theme-gold transition-colors font-mono">
                                    {String(record.id).padStart(2, '0')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-xs">{record.closeDate}</td>
                                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{record.patientName}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider">{record.nap}</td>
                                <td className="px-6 py-4">
                                    {record.note ? (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide border border-amber-200 dark:border-amber-700/50">
                                            {record.note}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300 dark:text-slate-600">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right font-medium tabular-nums font-mono text-slate-600 dark:text-slate-300">
                                    {formatCurrency(record.coverage)}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-red-500 dark:text-red-400 tabular-nums font-mono">
                                    {formatCurrency(record.glossedAmount)}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                                    {formatCurrency(record.amountToPay)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-white/5 font-bold text-sm border-t-2 border-slate-100 dark:border-white/10">
                        <tr>
                            <td className="px-6 py-5 text-right text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs font-mono" colSpan={5}>
                                Totales Generales
                            </td>
                            <td className="px-6 py-5 text-right text-slate-900 dark:text-white tabular-nums font-mono">
                                {formatCurrency(totals.coverage)}
                            </td>
                            <td className="px-6 py-5 text-right text-red-600 dark:text-red-400 tabular-nums font-mono">
                                {formatCurrency(totals.glossedAmount)}
                            </td>
                            <td className="px-6 py-5 text-right text-emerald-600 dark:text-emerald-400 text-lg tabular-nums font-mono border-t border-emerald-500/20">
                                {formatCurrency(totals.amountToPay)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
