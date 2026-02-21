import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle, DollarSign } from 'lucide-react';
import { useData } from '../context/DataContext';

interface GlobalAdjustmentModalProps {
    currentAmount: number;
    onClose: () => void;
}

export const GlobalAdjustmentModal: React.FC<GlobalAdjustmentModalProps> = ({ currentAmount, onClose }) => {
    const { addDailyTransaction } = useData();
    const [realAmount, setRealAmount] = useState(currentAmount.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const realValue = parseFloat(realAmount) || 0;
    const difference = realValue - currentAmount;
    const isDifferent = Math.abs(difference) > 0.01;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isDifferent) {
            onClose();
            return;
        }

        setIsSubmitting(true);

        const today = new Date().toISOString().split('T')[0];
        const isIncome = difference > 0;
        const absoluteDiff = Math.abs(difference);

        const payload = {
            date: today,
            amount: absoluteDiff,
            description: 'Reajuste Saldo Global',
            type: isIncome ? 'income' : 'expense',
            category: 'Ajuste'
        } as const;

        addDailyTransaction(payload, () => {
            setIsSubmitting(false);
            onClose();
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <DollarSign size={20} />
                        Ajustar Saldo Global
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                        <X size={20} className="text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Info Alert */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 text-xs rounded-lg border border-blue-100 dark:border-blue-800">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>
                            Ingresa el saldo <strong>real</strong> que tienes actualmente.
                            El sistema creará automáticamente una transacción de ajuste para cuadrar los números.
                        </p>
                    </div>

                    {/* Current System Amount */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Saldo Calculado (Sistema)
                        </label>
                        <div className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-mono text-lg">
                            ${currentAmount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Real Amount Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Saldo Real Actual
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="number"
                                step="0.01"
                                value={realAmount}
                                onChange={e => setRealAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
                                placeholder="0.00"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    {/* Difference Display */}
                    {isDifferent && (
                        <div className={`p-4 rounded-xl border-2 ${difference > 0
                                ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700'
                                : 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {difference > 0 ? (
                                        <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                                    ) : (
                                        <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                                    )}
                                    <div>
                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                                            {difference > 0 ? 'Ingreso por Ajuste' : 'Gasto por Ajuste'}
                                        </p>
                                        <p className={`text-sm font-bold ${difference > 0
                                                ? 'text-green-700 dark:text-green-300'
                                                : 'text-red-700 dark:text-red-300'
                                            }`}>
                                            Se creará una transacción
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-2xl font-bold font-mono ${difference > 0
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    {difference > 0 ? '+' : ''}${difference.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            disabled={!isDifferent || isSubmitting}
                        >
                            {isSubmitting ? 'Ajustando...' : isDifferent ? 'Ajustar Saldo' : 'Sin Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
