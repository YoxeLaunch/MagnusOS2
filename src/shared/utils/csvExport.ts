/**
 * Exporta un array de objetos a un archivo CSV y desencadena la descarga.
 * @param data - Array de objetos a exportar.
 * @param filename - Nombre del archivo (sin extensión).
 */
export const exportToCSV = <T extends object>(data: T[], filename: string) => {
    if (!data || !data.length) return;

    const headers = Object.keys(data[0]) as (keyof T)[];
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            // Escape quotes and handle commas
            const strValue = typeof value === 'string' ? value : String(value);
            return `"${strValue.replace(/"/g, '""')}"`;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
