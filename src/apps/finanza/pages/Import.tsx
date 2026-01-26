import React, { useState, useCallback } from 'react';
import {
    Upload,
    FileText,
    Check,
    AlertCircle,
    ArrowLeft,
    Download,
    Eye,
    Loader2
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import { useAuth } from '../../../shared/context/AuthContext';

const API_BASE = '/api/finanza';

interface PreviewRow {
    date: string | null;
    description: string;
    amount: number;
    reference?: string;
    hash?: string;
}

interface PreviewResult {
    headers: string[];
    detectedColumns: Record<string, number>;
    preview: PreviewRow[];
    totalRows: number;
    accountName: string;
}

interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
    totalErrors: number;
}

// ========================================
// File Upload Zone
// ========================================
const DropZone: React.FC<{
    onFile: (content: string) => void;
}> = ({ onFile }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onFile(event.target?.result as string);
            };
            reader.readAsText(file);
        }
    }, [onFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onFile(event.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
        >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <h3 className="text-lg font-semibold mb-2">Arrastra tu archivo CSV aquí</h3>
            <p className="text-muted-foreground mb-4">o haz clic para seleccionar</p>

            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90">
                <FileText className="w-4 h-4" />
                Seleccionar archivo
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                />
            </label>
        </div>
    );
};

// ========================================
// Preview Table
// ========================================
const PreviewTable: React.FC<{
    preview: PreviewResult;
    onImport: () => void;
    onCancel: () => void;
    loading: boolean;
}> = ({ preview, onImport, onCancel, loading }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Vista Previa</h3>
                    <p className="text-sm text-muted-foreground">
                        {preview.totalRows} transacciones encontradas para "{preview.accountName}"
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-4 py-2 border border-border rounded-lg">
                        <ArrowLeft className="w-4 h-4 inline mr-1" /> Cancelar
                    </button>
                    <button
                        onClick={onImport}
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                        Importar {preview.totalRows} transacciones
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                            <tr className="text-xs uppercase text-muted-foreground font-semibold">
                                <th className="px-4 py-3 text-left">Fecha</th>
                                <th className="px-4 py-3 text-left">Descripción</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {preview.preview.map((row, idx) => (
                                <tr key={idx} className="hover:bg-muted/30">
                                    <td className="px-4 py-2">{row.date || '❌ Fecha inválida'}</td>
                                    <td className="px-4 py-2 max-w-xs truncate">{row.description}</td>
                                    <td className={`px-4 py-2 text-right font-medium ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {formatCurrency(row.amount)}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {row.date ? (
                                            <Check className="w-4 h-4 text-green-500 inline" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-yellow-500 inline" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {preview.preview.length < preview.totalRows && (
                <p className="text-sm text-muted-foreground text-center">
                    Mostrando {preview.preview.length} de {preview.totalRows} transacciones
                </p>
            )}
        </div>
    );
};

// ========================================
// Import Result
// ========================================
const ImportResultView: React.FC<{
    result: ImportResult;
    onDone: () => void;
}> = ({ result, onDone }) => {
    return (
        <div className="text-center py-8">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${result.success ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                {result.success ? (
                    <Check className="w-8 h-8 text-green-600" />
                ) : (
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                )}
            </div>

            <h3 className="text-xl font-bold mb-2">
                {result.success ? '¡Importación completada!' : 'Importación con advertencias'}
            </h3>

            <div className="flex justify-center gap-8 my-6">
                <div>
                    <p className="text-3xl font-bold text-green-600">{result.imported}</p>
                    <p className="text-sm text-muted-foreground">Importadas</p>
                </div>
                <div>
                    <p className="text-3xl font-bold text-yellow-600">{result.skipped}</p>
                    <p className="text-sm text-muted-foreground">Duplicados</p>
                </div>
                {result.totalErrors > 0 && (
                    <div>
                        <p className="text-3xl font-bold text-red-600">{result.totalErrors}</p>
                        <p className="text-sm text-muted-foreground">Errores</p>
                    </div>
                )}
            </div>

            {result.errors.length > 0 && (
                <div className="text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 max-h-40 overflow-auto">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Errores:</p>
                    {result.errors.map((err, idx) => (
                        <p key={idx} className="text-xs text-red-600 dark:text-red-300">
                            Fila {err.row}: {err.error}
                        </p>
                    ))}
                </div>
            )}

            <button onClick={onDone} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg">
                Continuar al Libro Mayor
            </button>
        </div>
    );
};

// ========================================
// Main Import Page
// ========================================
export const Import: React.FC = () => {
    const { user } = useAuth();
    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
    const [csvContent, setCsvContent] = useState<string>('');
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [invertAmounts, setInvertAmounts] = useState(false);

    // Load accounts on mount
    React.useEffect(() => {
        const loadAccounts = async () => {
            if (!user?.username) return;
            try {
                const res = await fetch(`${API_BASE}/accounts?userId=${user.username}`);
                if (res.ok) setAccounts(await res.json());
            } catch (error) {
                console.error('Error loading accounts:', error);
            }
        };
        loadAccounts();
    }, [user?.username]);

    const handleFileSelected = async (content: string) => {
        setCsvContent(content);
        if (!selectedAccount) {
            alert('Por favor selecciona una cuenta primero');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/import/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, accountId: selectedAccount })
            });

            if (!res.ok) throw new Error('Error al procesar CSV');

            const data = await res.json();
            setPreview(data);
            setStep('preview');
        } catch (error) {
            console.error('Error previewing:', error);
            alert('Error al procesar el archivo CSV');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!user?.username || !preview) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: csvContent,
                    accountId: selectedAccount,
                    userId: user.username,
                    invertAmounts,
                    skipDuplicates: true
                })
            });

            if (!res.ok) throw new Error('Error al importar');

            const data = await res.json();
            setResult(data);
            setStep('result');
        } catch (error) {
            console.error('Error importing:', error);
            alert('Error al importar las transacciones');
        } finally {
            setLoading(false);
        }
    };

    const handleDone = () => {
        // Navigate to ledger
        window.location.hash = '/libro-mayor';
    };

    const reset = () => {
        setStep('upload');
        setCsvContent('');
        setPreview(null);
        setResult(null);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Importar Transacciones</h1>
                <p className="text-muted-foreground">Importa estados de cuenta bancarios en formato CSV</p>
            </div>

            {/* Account Selection */}
            {step === 'upload' && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Cuenta destino</label>
                        <select
                            value={selectedAccount}
                            onChange={e => setSelectedAccount(e.target.value)}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                        >
                            <option value="">Seleccionar cuenta...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="invert"
                            checked={invertAmounts}
                            onChange={e => setInvertAmounts(e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="invert" className="text-sm">
                            Invertir montos (para extractos de tarjetas de crédito)
                        </label>
                    </div>

                    {selectedAccount && <DropZone onFile={handleFileSelected} />}

                    {!selectedAccount && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Upload className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>Selecciona una cuenta para continuar</p>
                        </div>
                    )}

                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <span className="ml-2">Procesando...</span>
                        </div>
                    )}
                </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && preview && (
                <PreviewTable
                    preview={preview}
                    onImport={handleImport}
                    onCancel={reset}
                    loading={loading}
                />
            )}

            {/* Result Step */}
            {step === 'result' && result && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <ImportResultView result={result} onDone={handleDone} />
                </div>
            )}

            {/* Help */}
            {step === 'upload' && (
                <div className="bg-muted/50 rounded-xl p-6">
                    <h3 className="font-medium mb-3">Formatos soportados</h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• CSV con columnas: Fecha, Descripción, Monto</li>
                        <li>• CSV con columnas: Fecha, Descripción, Débito, Crédito</li>
                        <li>• Los duplicados se detectan automáticamente por fecha + monto + descripción</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Import;
