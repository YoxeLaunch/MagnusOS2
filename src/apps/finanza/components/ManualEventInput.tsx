/**
 * ManualEventInput Component
 * 
 * Allows users to add one-time financial events (e.g. "Bonus", "Vacation")
 * to the projection to see their impact on future cash flow.
 */

import React, { useState } from 'react';
import { Plus, Trash2, Calendar, DollarSign } from 'lucide-react';

export interface ManualEvent {
    id: string;
    name: string;
    amount: number;
    monthOffset: number; // 1 = next month, 2 = month after, etc.
    type: 'income' | 'expense';
}

interface ManualInputProps {
    events: ManualEvent[];
    onAddEvent: (event: ManualEvent) => void;
    onRemoveEvent: (id: string) => void;
}

export const ManualEventInput: React.FC<ManualInputProps> = ({ events, onAddEvent, onRemoveEvent }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [monthOffset, setMonthOffset] = useState('1');
    const [type, setType] = useState<'income' | 'expense'>('expense');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount) return;

        const newEvent: ManualEvent = {
            id: Date.now().toString(),
            name,
            amount: parseFloat(amount),
            monthOffset: parseInt(monthOffset),
            type
        };

        onAddEvent(newEvent);
        setName('');
        setAmount('');
        // Keep offset to make adding multiple easier
    };

    // Helper to get relative month name
    const getMonthName = (offset: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() + offset);
        return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:border-violet-500/30">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Calendar className="text-blue-500" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        Eventos Manuales
                    </h3>
                    <p className="text-sm text-slate-500">
                        Agrega eventos extraordinarios a tu proyección.
                    </p>
                </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Nombre del Evento</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ej. Vacaciones, Bono..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>

                <div className="w-full md:w-32">
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Monto</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0"
                            className="w-full pl-6 pr-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                </div>

                <div className="w-full md:w-40">
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Fecha</label>
                    <select
                        value={monthOffset}
                        onChange={e => setMonthOffset(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(i => (
                            <option key={i} value={i}>
                                +{i} Mes ({getMonthName(i)})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-32">
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Tipo</label>
                    <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 text-xs py-1 rounded-md transition-colors ${type === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            + Ing
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 text-xs py-1 rounded-md transition-colors ${type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            - Gas
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full md:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-blue-500/20"
                >
                    <Plus size={16} />
                    Agregar
                </button>
            </form>

            {/* Event List */}
            {events.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eventos Programados</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {events.map(event => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 group hover:border-blue-500/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${event.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        <DollarSign size={16} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{event.name}</p>
                                        <p className="text-xs text-slate-500 capitalize">{getMonthName(event.monthOffset)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold text-sm ${event.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {event.type === 'income' ? '+' : '-'}${event.amount.toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => onRemoveEvent(event.id)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-white/10 p-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
