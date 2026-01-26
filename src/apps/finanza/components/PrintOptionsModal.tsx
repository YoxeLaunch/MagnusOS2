import React, { useState } from 'react';
import { Printer, FileText, Calendar, Check, X, TrendingUp, PieChart, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from '../../../shared/components/ui/DatePicker';

interface PrintOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPrint: (options: PrintOptions) => void;
}

export interface PrintOptions {
    includeSummary: boolean; // New: Executive Summary
    includeBudget: boolean;
    includeInvestments: boolean; // New: Investment Portfolio
    includeForecast: boolean; // New: Projections
    includeAccountStatement: boolean;
    startDate: string;
    endDate: string;
}

export const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({ isOpen, onClose, onPrint }) => {
    const [options, setOptions] = useState<PrintOptions>({
        includeSummary: true,
        includeBudget: true,
        includeInvestments: true,
        includeForecast: false,
        includeAccountStatement: true,
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const OptionCard = ({
        icon: Icon,
        title,
        desc,
        checked,
        onChange,
        children
    }: {
        icon: any,
        title: string,
        desc: string,
        checked: boolean,
        onChange: (val: boolean) => void,
        children?: React.ReactNode
    }) => (
        <div className={`rounded-xl border transition-all duration-200 ${checked ? 'bg-slate-50/80 dark:bg-white/5 border-blue-500/50 shadow-sm' : 'border-slate-200 dark:border-white/10 opacity-80 hover:opacity-100'}`}>
            <label className="flex items-start gap-4 p-4 cursor-pointer select-none">
                <div className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    {checked && <Check size={12} className="text-white" />}
                </div>
                <input
                    type="checkbox"
                    className="hidden"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                />
                <div className="flex-1 -mt-1">
                    <div className="flex justify-between items-center">
                        <h4 className={`font-bold transition-colors ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{title}</h4>
                        <Icon size={18} className={checked ? 'text-blue-500' : 'text-slate-300'} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
            </label>
            {checked && children && (
                <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                    {children}
                </div>
            )}
        </div>
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]"
                >
                    <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5 sticky top-0 z-10 rounded-t-2xl">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Printer className="text-theme-gold" />
                                Configuración de Reporte
                            </h3>
                            <p className="text-xs text-slate-500">Selecciona los apartados a incluir en el PDF</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">

                        {/* 1. RESUMEN EJECUTIVO */}
                        <OptionCard
                            icon={Activity}
                            title="Resumen Ejecutivo"
                            desc="KPIs, Patrimonio Neto, Tasa de Ahorro y Burn Rate."
                            checked={options.includeSummary}
                            onChange={c => setOptions({ ...options, includeSummary: c })}
                        />

                        {/* 2. PRESUPUESTO & CASH FLOW */}
                        <OptionCard
                            icon={FileText}
                            title="Flujo de Caja y Presupuesto"
                            desc="Ingresos vs Gastos, Cumplimiento de Metas y Desviaciones."
                            checked={options.includeBudget}
                            onChange={c => setOptions({ ...options, includeBudget: c })}
                        />

                        {/* 3. INVERSIONES */}
                        <OptionCard
                            icon={TrendingUp}
                            title="Portafolio de Inversiones"
                            desc="Distribución de activos, rendimiento total y desglose."
                            checked={options.includeInvestments}
                            onChange={c => setOptions({ ...options, includeInvestments: c })}
                        />

                        {/* 4. PROYECCIONES */}
                        <OptionCard
                            icon={PieChart}
                            title="Proyecciones Financieras"
                            desc="Forecast para 2026, estimados de crecimiento y escenarios."
                            checked={options.includeForecast}
                            onChange={c => setOptions({ ...options, includeForecast: c })}
                        />

                        {/* 5. ESTADO DE CUENTA */}
                        <OptionCard
                            icon={Calendar}
                            title="Estado de Cuenta Detallado"
                            desc="Registro transaccional completo con opción de rango de fechas."
                            checked={options.includeAccountStatement}
                            onChange={c => setOptions({ ...options, includeAccountStatement: c })}
                        >
                            <div className="border-t border-slate-200/50 dark:border-white/5 pt-3 mt-2 grid grid-cols-2 gap-3">
                                <DatePicker
                                    label="DESDE"
                                    value={options.startDate}
                                    onChange={date => setOptions({ ...options, startDate: date })}
                                />
                                <DatePicker
                                    label="HASTA"
                                    value={options.endDate}
                                    onChange={date => setOptions({ ...options, endDate: date })}
                                />
                            </div>
                        </OptionCard>

                    </div>

                    <div className="p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 rounded-b-2xl">
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => onPrint(options)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <Printer size={18} />
                                Generar PDF
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
