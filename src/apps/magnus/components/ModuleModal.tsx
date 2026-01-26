import React from 'react';
import ReactDOM from 'react-dom';
import { X, BookOpen, Zap, Target, Check, Lock, ChevronRight } from 'lucide-react';
import { CurriculumModule } from '../types';

interface ModuleModalProps {
    module: CurriculumModule;
    onClose: () => void;
    onToggleItem: (item: 'reading' | 'habit' | 'mission') => void;
    progress: { reading: boolean; habit: boolean; mission: boolean };
}

export const ModuleModal: React.FC<ModuleModalProps> = ({ module, onClose, onToggleItem, progress }) => {

    // Prevent closing when clicking content
    const handleContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const isFullyCompleted = progress.reading && progress.habit && progress.mission;

    // Use Portal to escape any parent overflow/transform constraints
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-slate-900 border border-theme-gold/30 w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200"
                onClick={handleContentClick}
            >
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-theme-gold/10 rounded-full blur-[80px] pointer-events-none"></div>

                {/* Left: Mentor & Visuals (Mobile: Top) */}
                <div className="w-full md:w-1/3 bg-black/40 p-6 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-white/10 relative">
                    {/* Mentor Avatar Placeholder - In real app, use real images */}
                    <div className="w-24 h-24 rounded-full border-2 border-theme-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] mb-4 bg-slate-800 flex items-center justify-center overflow-hidden">
                        {/* If we had images: <img src={...} /> */}
                        <span className="text-3xl font-serif text-theme-gold">{module.mentor.charAt(0)}</span>
                    </div>

                    <h3 className="text-theme-gold font-serif font-bold text-lg">{module.mentor}</h3>
                    <span className="text-xs text-slate-400 uppercase tracking-widest mb-4">Mentor del Mes</span>

                    <div className="mt-auto w-full">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">PROGRESO</div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
                            <div
                                className={`h-full transition-all duration-500 ${isFullyCompleted ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-theme-gold'}`}
                                style={{ width: `${(Object.values(progress).filter(Boolean).length / 3) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Right: Checklist Content */}
                <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>

                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-theme-gold/20 text-theme-gold text-[10px] font-bold rounded uppercase tracking-wider border border-theme-gold/20">
                                {module.month}
                            </span>
                            {module.status === 'completed' && <span className="text-green-500 text-xs flex items-center gap-1"><Check size={12} /> Completado</span>}
                        </div>
                        <h2 className="text-2xl font-bold text-white font-serif mb-1">{module.title}</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">{module.description}</p>
                    </div>

                    <div className="space-y-4 flex-1">
                        <CheckItem
                            type="reading"
                            title="Intelecto (Lectura)"
                            desc={module.checklist.reading}
                            icon={BookOpen}
                            checked={progress.reading}
                            onToggle={() => onToggleItem('reading')}
                        />
                        <CheckItem
                            type="habit"
                            title="Hábito (Disciplina)"
                            desc={module.checklist.habit}
                            icon={Zap}
                            checked={progress.habit}
                            onToggle={() => onToggleItem('habit')}
                        />
                        <CheckItem
                            type="mission"
                            title="Conquista (Misión)"
                            desc={module.checklist.mission}
                            icon={Target}
                            checked={progress.mission}
                            onToggle={() => onToggleItem('mission')}
                        />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const CheckItem = ({ type, title, desc, icon: Icon, checked, onToggle }: any) => (
    <div
        onClick={onToggle}
        className={`
            group p-4 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden
            ${checked
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-slate-800/50 border-white/5 hover:bg-slate-800 hover:border-theme-gold/30'
            }
        `}
    >
        <div className="flex items-start gap-4">
            <div className={`
                p-2 rounded-lg transition-colors
                ${checked ? 'bg-green-500 text-black' : 'bg-slate-700 text-slate-400 group-hover:text-theme-gold group-hover:bg-theme-gold/10'}
            `}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${checked ? 'text-green-400' : 'text-slate-500'}`}>
                    {title}
                </h4>
                <p className={`font-medium ${checked ? 'text-white line-through opacity-50' : 'text-slate-200'}`}>
                    {desc}
                </p>
            </div>
            <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                ${checked ? 'bg-green-500 border-green-500' : 'border-slate-600 group-hover:border-theme-gold'}
            `}>
                {checked && <Check size={14} className="text-black" strokeWidth={3} />}
            </div>
        </div>

        {/* Glow effect on hover */}
        {!checked && <div className="absolute inset-0 bg-theme-gold/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>}
    </div>
);
