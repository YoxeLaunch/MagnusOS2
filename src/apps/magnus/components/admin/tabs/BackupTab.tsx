import React, { useEffect, useState } from 'react';
import { HardDrive, Download, RefreshCcw, ShieldCheck, Clock, Trash2 } from 'lucide-react';
import { useToast } from '../../../../../shared/context/ToastContext';
import { apiFetch } from '../../../../../shared/utils/apiFetch';

interface BackupEntry {
    name: string;
    size: number;
    createdAt: string;
}

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });

export const BackupTab: React.FC = () => {
    const toast = useToast();
    const [backups, setBackups] = useState<BackupEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const loadBackups = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/system/backups');
            if (!res.ok) throw new Error(`Server Error: ${res.status}`);
            const data = await res.json();
            setBackups(data.backups || []);
        } catch (e: any) {
            toast.error(`Error cargando backups: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);

    const createBackup = async () => {
        setCreating(true);
        try {
            const res = await apiFetch('/api/system/backup', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Server Error: ${res.status}`);
            toast.success('Backup creado correctamente');
            await loadBackups();
        } catch (e: any) {
            toast.error(`Error creando backup: ${e.message}`);
        } finally {
            setCreating(false);
        }
    };

    const downloadBackup = async (name: string) => {
        setDownloading(name);
        try {
            const res = await apiFetch(`/api/system/backups/${name}`);
            if (!res.ok) throw new Error(`Server Error: ${res.status}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            toast.error(`Error descargando backup: ${e.message}`);
        } finally {
            setDownloading(null);
        }
    };

    const deleteBackup = async (name: string) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar el respaldo "${name}"?`)) return;
        setDeleting(name);
        try {
            const res = await apiFetch(`/api/system/backups/${name}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Server Error: ${res.status}`);
            toast.success('Backup eliminado correctamente');
            await loadBackups();
        } catch (e: any) {
            toast.error(`Error eliminando backup: ${e.message}`);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="flex flex-col items-center p-4">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-600/20">
                            <HardDrive size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Copias de Seguridad</h3>
                            <p className="text-sm text-slate-500">Respaldo completo de la base de datos (PostgreSQL)</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={loadBackups}
                            disabled={loading}
                            title="Actualizar lista"
                            className="p-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                        >
                            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={createBackup}
                            disabled={creating}
                            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {creating ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ShieldCheck size={18} />
                            )}
                            {creating ? 'Creando...' : 'Crear Backup Ahora'}
                        </button>
                    </div>
                </div>

                {/* Info banner */}
                <div className="mx-6 mt-6 flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-sm text-blue-800 dark:text-blue-300">
                    <Clock size={18} className="flex-shrink-0 mt-0.5" />
                    <p>
                        Además de los backups manuales, el sistema ejecuta un respaldo automático todos los días a las 3:00 AM,
                        con retención de 14 días. Todos los respaldos aparecen listados abajo.
                    </p>
                </div>

                {/* List */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="w-6 h-6 border-4 border-theme-gold border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : backups.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-8">Todavía no hay backups registrados.</p>
                    ) : (
                        <div className="space-y-2">
                            {backups.map(b => (
                                <div
                                    key={b.name}
                                    className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{b.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {formatDate(b.createdAt)} &middot; {formatSize(b.size)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => downloadBackup(b.name)}
                                            disabled={downloading === b.name || deleting === b.name}
                                            className="flex items-center gap-2 px-4 py-2 bg-theme-gold/10 text-theme-gold hover:bg-theme-gold hover:text-black border border-theme-gold/20 rounded-lg text-sm font-bold transition-all whitespace-nowrap disabled:opacity-50"
                                        >
                                            {downloading === b.name ? (
                                                <div className="w-4 h-4 border-2 border-theme-gold/30 border-t-theme-gold rounded-full animate-spin" />
                                            ) : (
                                                <Download size={16} />
                                            )}
                                            Descargar
                                        </button>
                                        <button
                                            onClick={() => deleteBackup(b.name)}
                                            disabled={deleting === b.name || downloading === b.name}
                                            title="Eliminar backup"
                                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                                        >
                                            {deleting === b.name ? (
                                                <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
