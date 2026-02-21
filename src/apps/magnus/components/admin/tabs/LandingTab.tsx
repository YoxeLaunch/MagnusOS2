import React, { useState, useEffect } from 'react';
import { Save, X, Upload, Image as ImageIcon, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../../../../shared/context/ToastContext';
import { apiFetch } from '../../../../../shared/utils/apiFetch';

interface LandingTabProps {
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

export const LandingTab: React.FC<LandingTabProps> = ({ loading, setLoading }) => {
    const toast = useToast();
    const [landingImages, setLandingImages] = useState({
        banner1: '',
        banner2: ''
    });

    // Load banners from API on mount
    useEffect(() => {
        const loadBanners = async () => {
            try {
                const res = await apiFetch('/api/settings/banners');
                if (res.ok) {
                    const data = await res.json();
                    setLandingImages({
                        banner1: data.banner1 || '',
                        banner2: data.banner2 || ''
                    });
                }
            } catch (error) {
                console.error('Error loading banners:', error);
            }
        };
        loadBanners();
    }, []);

    const compressImage = async (file: File): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new window.Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    const height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = (err: Event | string) => reject(err);
            };
            reader.onerror = (err: ProgressEvent<FileReader>) => reject(err);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, position: 'banner1' | 'banner2') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const compressedBase64 = await compressImage(file);
            setLandingImages(prev => ({ ...prev, [position]: compressedBase64 }));
            toast.success("Imagen procesada y lista para guardar");
        } catch (error) {
            console.error("Compression failed", error);
            toast.error("Error procesando la imagen.");
        } finally {
            setLoading(false);
        }
    };

    const saveLandingImages = async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/api/settings/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    banner1: landingImages.banner1,
                    banner2: landingImages.banner2
                })
            });

            if (res.ok) {
                toast.success('Imágenes de portada actualizadas correctamente.');
            } else {
                throw new Error('Error al guardar');
            }
        } catch (e) {
            console.error('Error saving banners:', e);
            toast.error('Error al guardar las imágenes.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-gold/10 rounded-lg text-theme-gold">
                        <ImageIcon size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Portada de Bienvenida</h3>
                        <p className="text-xs text-slate-500">Personaliza la experiencia visual de entrada</p>
                    </div>
                </div>
                <button
                    onClick={saveLandingImages}
                    disabled={loading}
                    className="px-6 py-2.5 bg-theme-gold text-black font-bold rounded-lg shadow-sm hover:bg-yellow-500 transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                >
                    {loading ? (
                        <>Procesando...</>
                    ) : (
                        <>
                            <Save size={18} />
                            Guardar Cambios
                        </>
                    )}
                </button>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto pb-10">

                    {/* Upload Card 1 */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs border border-slate-200 dark:border-white/10">1</span>
                                Imagen Izquierda
                            </label>
                            {landingImages.banner1 && <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> Lista</span>}
                        </div>

                        <div className="relative aspect-[9/16] bg-slate-100 dark:bg-black/20 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-white/10 group transition-all hover:border-theme-gold/50 hover:bg-slate-50 dark:hover:bg-white/5">
                            {landingImages.banner1 ? (
                                <>
                                    <img src={landingImages.banner1} alt="Banner 1" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                                    <button
                                        onClick={() => setLandingImages(p => ({ ...p, banner1: '' }))}
                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                                        title="Eliminar imagen"
                                    >
                                        <X size={18} />
                                    </button>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-2">
                                        <Upload size={24} className="opacity-50" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-600 dark:text-slate-400">Haz clic para subir</p>
                                        <p className="text-xs opacity-60 mt-1">Recomendado: 1080x1920 (Vertical)</p>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'banner1')}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                        </div>
                    </div>

                    {/* Upload Card 2 */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs border border-slate-200 dark:border-white/10">2</span>
                                Imagen Derecha
                            </label>
                            {landingImages.banner2 && <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> Lista</span>}
                        </div>

                        <div className="relative aspect-[9/16] bg-slate-100 dark:bg-black/20 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-white/10 group transition-all hover:border-theme-gold/50 hover:bg-slate-50 dark:hover:bg-white/5">
                            {landingImages.banner2 ? (
                                <>
                                    <img src={landingImages.banner2} alt="Banner 2" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                                    <button
                                        onClick={() => setLandingImages(p => ({ ...p, banner2: '' }))}
                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                                        title="Eliminar imagen"
                                    >
                                        <X size={18} />
                                    </button>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-2">
                                        <Upload size={24} className="opacity-50" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-600 dark:text-slate-400">Haz clic para subir</p>
                                        <p className="text-xs opacity-60 mt-1">Recomendado: 1080x1920 (Vertical)</p>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'banner2')}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 p-4 rounded-xl flex gap-4 items-start mx-auto max-w-5xl w-full">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                    <Info size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1">Optimización Automática</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300/80 leading-relaxed">
                        El sistema comprime automáticamente las imágenes de alta resolución para garantizar que la aplicación cargue rápido.
                        Las imágenes se guardan localmente en tu dispositivo. Si cambias de navegador, es posible que debas subirlas nuevamente.
                    </p>
                </div>
            </div>
        </div>
    );
};
