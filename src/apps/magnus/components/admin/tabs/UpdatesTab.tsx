import React, { useState, useEffect } from 'react';
import { TrendingUp, Save, Bell } from 'lucide-react';
import { useToast } from '../../../../../shared/context/ToastContext';
import { apiFetch } from '../../../../../shared/utils/apiFetch';

export const UpdatesTab: React.FC = () => {
    const toast = useToast();
    const [updatesList, setUpdatesList] = useState<any[]>([]);

    useEffect(() => {
        apiFetch('/api/updates').then(res => res.json()).then(setUpdatesList).catch(console.error);
    }, []);

    const handlePublish = async (e: React.MouseEvent<HTMLButtonElement>) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.innerText = "Publicando...";

        const title = (document.getElementById('update-title') as HTMLInputElement).value;
        const description = (document.getElementById('update-desc') as HTMLTextAreaElement).value;
        const type = (document.getElementById('update-type') as HTMLSelectElement).value;
        const date = (document.getElementById('update-date') as HTMLInputElement).value;
        const sendBroadcast = (document.getElementById('update-broadcast') as HTMLInputElement).checked;

        if (!title || !description) {
            toast.warning("Título y descripción son obligatorios");
            btn.disabled = false;
            btn.innerText = "Publicar Novedad";
            return;
        }

        try {
            // 1. Save to DB
            const res = await apiFetch('/api/updates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, type, date })
            });

            if (!res.ok) throw new Error('Error guardando update');

            // 2. Broadcast if requested
            if (sendBroadcast) {
                await apiFetch('/api/system/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: `Novedad: ${title}`,
                        message: description,
                        type: 'info'
                    })
                });
            }

            toast.success("Novedad publicada con éxito!");
            // Refresh list
            apiFetch('/api/updates').then(res => res.json()).then(setUpdatesList).catch(console.error);

            // Reset form
            (document.getElementById('update-title') as HTMLInputElement).value = '';
            (document.getElementById('update-desc') as HTMLTextAreaElement).value = '';

        } catch (error) {
            console.error(error);
            toast.error("Error al publicar");
        } finally {
            btn.disabled = false;
            btn.innerText = "Publicar Novedad";
        }
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-8 max-w-2xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><TrendingUp size={24} /></span>
                        Publicar Novedad
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Título de la Actualización</label>
                            <input
                                type="text"
                                id="update-title"
                                placeholder="Ej: Nuevo Dashboard Financiero"
                                className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                            <textarea
                                id="update-desc"
                                placeholder="Detalles de los cambios realizados..."
                                className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 h-32 text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500">Tipo</label>
                                <select id="update-type" className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                                    <option value="feature">Nueva Función 🚀</option>
                                    <option value="improvement">Mejora ✨</option>
                                    <option value="bugfix">Corrección 🐛</option>
                                    <option value="announcement">Anuncio 📢</option>
                                </select>
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className="block text-xs font-bold text-slate-500">Fecha</label>
                                <input
                                    type="date"
                                    id="update-date"
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5">
                            <input type="checkbox" id="update-broadcast" defaultChecked className="w-4 h-4 rounded text-theme-gold focus:ring-theme-gold" />
                            <label htmlFor="update-broadcast" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Notificar a todos vía Broadcast
                            </label>
                        </div>

                        <button
                            onClick={handlePublish}
                            className="w-full py-3 mt-4 bg-theme-gold hover:bg-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-theme-gold/20 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            Publicar Novedad
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-4xl mx-auto">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="text-theme-gold" />
                    Historial de Novedades
                </h3>

                <div className="space-y-4">
                    {updatesList.length === 0 ? (
                        <p className="text-center text-slate-500 py-10">No hay novedades registradas.</p>
                    ) : (
                        updatesList.map((update: any) => (
                            <div key={update.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">{update.title}</h4>
                                        <span className="text-[10px] uppercase font-bold text-slate-400">{update.type}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">{new Date(update.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{update.description}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};


