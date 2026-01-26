import React, { useMemo } from 'react';
import { Transaction, DailyTransaction, CurrencyState } from '../../types';
import { CalendarClock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface UpcomingBillsProps {
    plannedExpenses: Transaction[];
    transactions: DailyTransaction[];
    currentDate: Date;
    currencies: CurrencyState;
}

export const UpcomingBills: React.FC<UpcomingBillsProps> = ({ plannedExpenses, transactions, currentDate, currencies }) => {

    // Logic to find unpaid bills
    const unpaidBills = useMemo(() => {
        // Filter only monthly expenses for now to be safe
        const recurring = plannedExpenses.filter(e => e.frequency === 'Mensual');

        return recurring.filter(plan => {
            // Check if this planned expense appears in this month's transactions
            const isPaid = transactions.some(t => {
                // Match logic: Name similarity (with null checks)
                const planName = (plan.name || '').toLowerCase();
                const txName = (t.description || '').toLowerCase();
                if (!planName || !txName) return false;
                return txName.includes(planName) || planName.includes(txName);
            });
            return !isPaid;
        });
    }, [plannedExpenses, transactions]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden h-full">
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarClock className="text-blue-500" size={20} />
                    Próximos Pagos
                </h3>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {unpaidBills.length} Pendientes
                </span>
            </div>

            <div className="p-0 overflow-y-auto max-h-[300px]">
                {unpaidBills.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                        <CheckCircle2 size={48} className="text-green-500 mb-2 opacity-50" />
                        <p>¡Todo pagado por este mes!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {unpaidBills.map(bill => (
                            <div key={bill.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-red-50 text-red-500 dark:bg-red-900/20">
                                        <AlertCircle size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{bill.name}</p>
                                        <p className="text-xs text-slate-500">{bill.category}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                        {formatCurrency(bill.amount * (bill.currency === 'USD' ? currencies.usd.rate : bill.currency === 'EUR' ? currencies.eur.rate : 1))}
                                    </p>
                                    {bill.currency && bill.currency !== 'DOP' && (
                                        <p className="text-[10px] text-slate-500 font-mono">
                                            {bill.currency === 'USD' ? 'US$' : '€'}{bill.amount.toFixed(2)}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-slate-400">Estimado</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
