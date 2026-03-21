import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    label?: string;
    className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize currentMonth based on value if present
    useEffect(() => {
        if (value) {
            // Check if it matches YYYY-MM-DD format to parse locally
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                const [y, m, d] = value.split('-').map(Number);
                setCurrentMonth(new Date(y, m - 1, d));
            } else {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    setCurrentMonth(date);
                }
            }
        }
    }, [value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const firstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleDateClick = (day: number) => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1; // 1-based for string
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const changeMonth = (delta: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    };

    const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return 'Seleccionar fecha';

        // Handle YYYY-MM-DD manually to prevent timezone offset
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-');
            const monthIndex = parseInt(m, 10) - 1;
            return `${d} ${MONTHS_SHORT[monthIndex]} ${y}`;
        }

        // Fallback for ISO strings
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const d = date.getDate().toString().padStart(2, '0');
        const monthIndex = date.getMonth();
        const y = date.getFullYear();

        return `${d} ${MONTHS_SHORT[monthIndex]} ${y}`;
    };

    // Calendar generation
    const renderCalendar = () => {
        const totalDays = daysInMonth(currentMonth);
        const startDay = firstDayOfMonth(currentMonth);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        // Days
        for (let i = 1; i <= totalDays; i++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isSelected = value === dateStr;
            const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i).toDateString();

            days.push(
                <button
                    key={i}
                    onClick={() => handleDateClick(i)}
                    className={`h-8 w-8 rounded-full text-xs font-bold flex items-center justify-center transition-all
                        ${isSelected
                            ? 'bg-theme-gold text-black shadow-lg shadow-theme-gold/20'
                            : isToday
                                ? 'bg-slate-700 text-white border border-slate-500'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }
                    `}
                >
                    {i}
                </button>
            );
        }

        return days;
    };

    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-[10px] text-slate-500 font-bold mb-1">{label}</label>}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 bg-slate-900/50 p-3 rounded border border-slate-700 cursor-pointer hover:border-theme-gold/50 transition-colors"
            >
                <CalendarIcon size={16} className="text-slate-400" />
                <span className={`text-sm font-medium ${value ? 'text-white' : 'text-slate-500'}`}>
                    {formatDateDisplay(value)}
                </span>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 w-64 p-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
                            <span key={day} className="text-[10px] font-bold text-slate-400">{day}</span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 place-items-center">
                        {renderCalendar()}
                    </div>

                    {/* Footer Clear */}
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex justify-end">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                                setIsOpen(false);
                            }}
                            className="text-xs text-red-400 hover:text-red-500 font-medium flex items-center gap-1"
                        >
                            <X size={12} /> Limpiar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
