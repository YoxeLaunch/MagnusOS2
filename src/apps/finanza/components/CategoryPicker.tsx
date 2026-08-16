import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

interface CategoryOption {
    id: string;
    icon: React.ComponentType<any>;
    label: string;
}

interface CategoryPickerProps {
    categories: CategoryOption[];
    value?: string;
    onChange: (id: string) => void;
    recentIds?: string[];
    groups?: Record<string, string[]>;
    disabled?: boolean;
    accent: 'green' | 'red';
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({ categories, value, onChange, recentIds, groups, disabled, accent }) => {
    const [query, setQuery] = useState('');
    const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groups ? Object.keys(groups).slice(0, 2) : []));

    const byId = useMemo(() => {
        const map: Record<string, CategoryOption> = {};
        categories.forEach(c => { map[c.id] = c; });
        return map;
    }, [categories]);

    const term = query.trim().toLowerCase();
    const matches = (c: CategoryOption) => !term || c.label.toLowerCase().includes(term) || c.id.toLowerCase().includes(term);

    const recentCats = (recentIds || []).map(id => byId[id]).filter(Boolean);

    const toggleGroup = (name: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    const chipClass = (isActive: boolean) => `flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isActive
        ? (accent === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-success dark:text-green-400 ring-1 ring-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-error dark:text-red-400 ring-1 ring-red-500')
        : 'bg-card border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
        }`;

    const gridClass = (isActive: boolean) => `flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isActive
        ? (accent === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-success dark:text-green-400 ring-1 ring-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-error dark:text-red-400 ring-1 ring-red-500')
        : 'bg-card border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
        }`;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar categoría..."
                    className="w-full bg-transparent outline-none text-sm dark:text-white"
                />
            </div>

            {!term && recentCats.length > 0 && (
                <div>
                    <div className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Recientes</div>
                    <div className="flex flex-wrap gap-2">
                        {recentCats.map(cat => (
                            <button key={cat.id} type="button" disabled={disabled} onClick={() => onChange(cat.id)} className={chipClass(value === cat.id)}>
                                <cat.icon size={14} /> {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!groups && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {categories.filter(matches).map(cat => (
                        <button key={cat.id} type="button" disabled={disabled} onClick={() => onChange(cat.id)} className={gridClass(value === cat.id)}>
                            <cat.icon size={20} /><span className="text-xs font-medium text-center">{cat.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {groups && (
                <div className="max-h-72 overflow-y-auto space-y-1">
                    {Object.entries(groups).map(([groupName, ids]) => {
                        const groupCats = ids.map(id => byId[id]).filter(Boolean).filter(matches);
                        if (groupCats.length === 0) return null;
                        const isOpen = term ? true : openGroups.has(groupName);
                        return (
                            <div key={groupName} className="border-t border-gray-100 dark:border-gray-700/50 pt-2 first:border-t-0 first:pt-0">
                                <button type="button" onClick={() => toggleGroup(groupName)} className="w-full flex items-center justify-between py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    <span>{groupName}</span>
                                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                {isOpen && (
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-1.5">
                                        {groupCats.map(cat => (
                                            <button key={cat.id} type="button" disabled={disabled} onClick={() => onChange(cat.id)} className={gridClass(value === cat.id)}>
                                                <cat.icon size={20} /><span className="text-xs font-medium text-center">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
