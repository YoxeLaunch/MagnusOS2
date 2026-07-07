import React, { useState, useEffect, useCallback } from 'react';
import {
    Newspaper, Plus, X, FileText, ImagePlus, Paperclip, Trash2, Pencil,
    Eye, EyeOff, Download, Loader2, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { apiFetch } from '../../../shared/utils/apiFetch';
import { useToast } from '../../../shared/context/ToastContext';

const TOKEN_KEY = 'sistemam_token';

export interface PublicationAttachment {
    url: string;
    name: string;
    mimeType: string;
    size: number;
}

export interface Publication {
    id: string;
    title: string;
    content: string;
    coverImage?: string | null;
    attachments: PublicationAttachment[];
    author: string;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

const isImage = (a: PublicationAttachment) => a.mimeType?.startsWith('image/');
const isPdf = (a: PublicationAttachment) => a.mimeType === 'application/pdf';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

const formatSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Sube un archivo (imagen o PDF) con multipart/form-data y JWT manual. */
const uploadFile = async (file: File): Promise<PublicationAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch('/api/publications/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al subir el archivo');
    }
    return res.json();
};

export const Publications: React.FC<{ user: any }> = ({ user }) => {
    const toast = useToast();
    const isSoberano = user?.role === 'admin' || user?.username?.toLowerCase() === 'soberano';

    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);
    const [reading, setReading] = useState<Publication | null>(null);
    const [editing, setEditing] = useState<Partial<Publication> | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Publication | null>(null);

    const loadPublications = useCallback(async () => {
        try {
            const res = await apiFetch('/api/publications');
            if (res.ok) setPublications(await res.json());
        } catch (error) {
            console.error('Error loading publications', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPublications(); }, [loadPublications]);

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            const res = await apiFetch(`/api/publications/${deleteConfirm.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar');
            setPublications(prev => prev.filter(p => p.id !== deleteConfirm.id));
            if (reading?.id === deleteConfirm.id) setReading(null);
            toast.success('Publicación eliminada');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setDeleteConfirm(null);
        }
    };

    // ==================== VISTA DE LECTURA ====================
    if (reading) {
        const images = reading.attachments?.filter(isImage) || [];
        const pdfs = reading.attachments?.filter(isPdf) || [];
        return (
            <div className="px-6 lg:px-12 pb-12 pt-2 max-w-4xl mx-auto animate-fade-in">
                <button
                    onClick={() => setReading(null)}
                    className="flex items-center gap-2 text-xs font-bold text-theme-gold uppercase tracking-[0.2em] mb-6 hover:gap-3 transition-all"
                >
                    <ArrowLeft size={14} /> Volver a Publicaciones
                </button>

                {reading.coverImage && (
                    <img
                        src={reading.coverImage}
                        alt={reading.title}
                        className="w-full max-h-[380px] object-cover rounded-2xl mb-8 border border-slate-200 dark:border-white/10 shadow-lg"
                    />
                )}

                <div className="flex items-start justify-between gap-4 mb-2">
                    <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white leading-tight">
                        {reading.title}
                    </h1>
                    {isSoberano && (
                        <div className="flex gap-2 flex-shrink-0 mt-2">
                            <button
                                onClick={() => { setEditing(reading); setReading(null); }}
                                className="p-2 rounded-lg text-slate-400 hover:text-theme-gold hover:bg-theme-gold/10 transition-colors"
                                title="Editar"
                            >
                                <Pencil size={18} />
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(reading)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-8 border-b border-slate-200 dark:border-white/10 pb-4">
                    Por <span className="text-theme-gold font-bold">{reading.author}</span> · {formatDate(reading.createdAt)}
                    {!reading.isPublished && <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[10px]">BORRADOR</span>}
                </p>

                <div className="prose-magnus text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-[15px] mb-10">
                    {reading.content}
                </div>

                {images.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                        {images.map(img => (
                            <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="group">
                                <img
                                    src={img.url}
                                    alt={img.name}
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 group-hover:opacity-90 transition-opacity"
                                />
                            </a>
                        ))}
                    </div>
                )}

                {pdfs.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Paperclip size={14} className="text-theme-gold" /> Documentos Adjuntos
                        </h3>
                        {pdfs.map(pdf => (
                            <a
                                key={pdf.url}
                                href={pdf.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl hover:border-theme-gold/50 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{pdf.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono uppercase">PDF · {formatSize(pdf.size)}</p>
                                </div>
                                <Download size={16} className="text-slate-400 group-hover:text-theme-gold transition-colors" />
                            </a>
                        ))}
                    </div>
                )}

                {deleteConfirm && (
                    <DeleteModal publication={deleteConfirm} onCancel={() => setDeleteConfirm(null)} onConfirm={handleDelete} />
                )}
            </div>
        );
    }

    // ==================== LISTA / FEED ====================
    return (
        <div className="px-6 lg:px-12 pb-12 pt-0 lg:pt-2 max-w-6xl mx-auto animate-fade-in">
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6 mb-8">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-widest uppercase flex items-center gap-3">
                        <Newspaper className="text-theme-gold" size={28} />
                        Publicaciones
                    </h2>
                    <p className="text-theme-gold font-mono text-xs mt-1">
                        {isSoberano ? 'GESTIONA LAS ENTRADAS DEL SISTEMA' : 'LECTURAS Y RECURSOS DEL SOBERANO'}
                    </p>
                </div>
                {isSoberano && (
                    <button
                        onClick={() => setEditing({ title: '', content: '', attachments: [], isPublished: true })}
                        className="flex items-center gap-2 px-4 py-2.5 bg-theme-gold text-black rounded-lg text-sm font-bold shadow-md shadow-theme-gold/20 hover:scale-105 transition-transform"
                    >
                        <Plus size={16} /> Nueva Publicación
                    </button>
                )}
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-theme-gold animate-spin" />
                </div>
            ) : publications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                    <Newspaper size={48} className="mb-4 opacity-30" />
                    <p className="text-sm">Aún no hay publicaciones.</p>
                    {isSoberano && <p className="text-xs mt-1 opacity-70">Crea la primera entrada con "Nueva Publicación".</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publications.map(pub => (
                        <article
                            key={pub.id}
                            onClick={() => setReading(pub)}
                            className="group cursor-pointer bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm hover:border-theme-gold/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col"
                        >
                            {pub.coverImage ? (
                                <img src={pub.coverImage} alt={pub.title} className="h-40 w-full object-cover" />
                            ) : (
                                <div className="h-40 w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/[0.03] dark:to-white/[0.06] flex items-center justify-center">
                                    <Newspaper size={32} className="text-slate-300 dark:text-slate-700" />
                                </div>
                            )}
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {!pub.isPublished && (
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-bold uppercase">Borrador</span>
                                    )}
                                    <span className="text-[10px] text-slate-500 font-mono uppercase">{formatDate(pub.createdAt)}</span>
                                </div>
                                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white group-hover:text-theme-gold transition-colors leading-snug mb-2">
                                    {pub.title}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed flex-1">
                                    {pub.content}
                                </p>
                                {pub.attachments?.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <Paperclip size={12} className="text-theme-gold" />
                                        {pub.attachments.length} adjunto{pub.attachments.length !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {editing && (
                <PublicationEditor
                    initial={editing}
                    onClose={() => setEditing(null)}
                    onSaved={(saved) => {
                        setPublications(prev => {
                            const exists = prev.some(p => p.id === saved.id);
                            return exists ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev];
                        });
                        setEditing(null);
                    }}
                />
            )}

            {deleteConfirm && (
                <DeleteModal publication={deleteConfirm} onCancel={() => setDeleteConfirm(null)} onConfirm={handleDelete} />
            )}
        </div>
    );
};

// ==================== EDITOR (solo soberano) ====================
const PublicationEditor: React.FC<{
    initial: Partial<Publication>;
    onClose: () => void;
    onSaved: (p: Publication) => void;
}> = ({ initial, onClose, onSaved }) => {
    const toast = useToast();
    const [title, setTitle] = useState(initial.title || '');
    const [content, setContent] = useState(initial.content || '');
    const [coverImage, setCoverImage] = useState<string | null>(initial.coverImage || null);
    const [attachments, setAttachments] = useState<PublicationAttachment[]>(initial.attachments || []);
    const [isPublished, setIsPublished] = useState(initial.isPublished !== false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const uploaded = await uploadFile(file);
            setCoverImage(uploaded.url);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleUploadAttachments = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploading(true);
        try {
            for (const file of files) {
                const uploaded = await uploadFile(file);
                setAttachments(prev => [...prev, uploaded]);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('El título es requerido');
            return;
        }
        setSaving(true);
        try {
            const payload = { title, content, coverImage, attachments, isPublished };
            const res = initial.id
                ? await apiFetch(`/api/publications/${initial.id}`, { method: 'PUT', body: JSON.stringify(payload) })
                : await apiFetch('/api/publications', { method: 'POST', body: JSON.stringify(payload) });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Error al guardar');
            }
            const saved = await res.json();
            toast.success(initial.id ? 'Publicación actualizada' : 'Publicación creada');
            onSaved(saved);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-none md:rounded-2xl w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
                    <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Newspaper size={18} className="text-theme-gold" />
                        {initial.id ? 'Editar Publicación' : 'Nueva Publicación'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Título de la entrada..."
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold text-lg font-serif"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contenido</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Escribe la publicación..."
                            rows={10}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold text-sm leading-relaxed resize-y"
                        />
                    </div>

                    {/* Portada */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Imagen de Portada</label>
                        {coverImage ? (
                            <div className="relative group">
                                <img src={coverImage} alt="Portada" className="w-full max-h-52 object-cover rounded-lg border border-slate-200 dark:border-white/10" />
                                <button
                                    onClick={() => setCoverImage(null)}
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-lg cursor-pointer hover:border-theme-gold/50 transition-colors text-slate-500 text-sm">
                                <ImagePlus size={18} />
                                Subir imagen de portada
                                <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
                            </label>
                        )}
                    </div>

                    {/* Adjuntos */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Adjuntos (PDF e imágenes)
                        </label>
                        <div className="space-y-2 mb-3">
                            {attachments.map((att, idx) => (
                                <div key={att.url} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf(att) ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {isPdf(att) ? <FileText size={16} /> : <ImagePlus size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{att.name}</p>
                                        <p className="text-[10px] text-slate-500">{formatSize(att.size)}</p>
                                    </div>
                                    <button
                                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-lg cursor-pointer hover:border-theme-gold/50 transition-colors text-slate-500 text-sm">
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                            {uploading ? 'Subiendo...' : 'Agregar archivos (máx. 15MB c/u)'}
                            <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleUploadAttachments} disabled={uploading} />
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-between p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                    <button
                        onClick={() => setIsPublished(!isPublished)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isPublished
                            ? 'text-emerald-600 bg-emerald-500/10'
                            : 'text-amber-500 bg-amber-500/10'}`}
                    >
                        {isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
                        {isPublished ? 'Visible para todos' : 'Borrador (solo tú lo ves)'}
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || uploading}
                            className="flex items-center gap-2 px-5 py-2 bg-theme-gold text-black rounded-lg text-sm font-bold shadow-md shadow-theme-gold/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            {initial.id ? 'Guardar Cambios' : 'Publicar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== CONFIRMACIÓN DE BORRADO ====================
const DeleteModal: React.FC<{
    publication: Publication;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ publication, onCancel, onConfirm }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-red-200 dark:border-red-900/30">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">
                ¿Eliminar Publicación?
            </h3>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
                "{publication.title}" y sus archivos adjuntos se eliminarán. <br />
                <span className="font-bold text-red-500">Esta acción es irreversible.</span>
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg shadow-red-600/20 transition-all"
                >
                    Eliminar
                </button>
            </div>
        </div>
    </div>
);
