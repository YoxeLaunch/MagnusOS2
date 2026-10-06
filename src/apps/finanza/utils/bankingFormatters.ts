/**
 * ============================================================================
 * BANKING FORMATTERS // FINANCIAL DATA UTILITIES
 * Formatters for billions, trillions, rates, instruments and tooltips.
 * ============================================================================
 */

/**
 * Formatea cantidades monetarias de forma compacta (Trillones, Billones, Millones)
 * Ej: 3517507877440 -> "RD$ 3.52 T"
 */
export function formatMoneyCompact(value: number | string | null | undefined, currency = 'RD$'): string {
  if (value === null || value === undefined) return `${currency} 0.00`;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `${currency} 0.00`;

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // En español dominicano/financiero:
  // 1 Trillón (escala corta de la SB / Billón castellano): 10^12
  if (abs >= 1e12) {
    return `${sign}${currency} ${(abs / 1e12).toFixed(2)} T`;
  }
  if (abs >= 1e9) {
    return `${sign}${currency} ${(abs / 1e9).toFixed(2)} B`;
  }
  if (abs >= 1e6) {
    return `${sign}${currency} ${(abs / 1e6).toFixed(2)} M`;
  }
  if (abs >= 1e3) {
    return `${sign}${currency} ${(abs / 1e3).toFixed(1)} K`;
  }
  return `${sign}${currency} ${abs.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatea cantidades monetarias completas con separadores de miles
 * Ej: 3517507877440.76 -> "RD$ 3,517,507,877,440.76"
 */
export function formatMoneyFull(value: number | string | null | undefined, currency = 'RD$'): string {
  if (value === null || value === undefined) return `${currency} 0.00`;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `${currency} 0.00`;

  return `${currency} ${num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatea tasas o porcentajes con precisión configurable
 * Ej: 4.7621 -> "4.76%"
 */
export function formatPercent(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '0.00%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00%';
  return `${num.toFixed(decimals)}%`;
}

/**
 * Formatea número de cuentas o instrumentos financieros
 * Ej: 11887624 -> "11.89 M"
 */
export function formatInstrumentsCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num)) return '0';

  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)} M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)} K`;
  }
  return num.toLocaleString('es-DO');
}

/**
 * Retorna el nombre legible del mes en español
 * Ej: "2026-08" -> "Agosto 2026"
 */
export function formatPeriodLong(periodo?: string | null): string {
  if (!periodo) return 'Sin fecha';
  const [year, month] = periodo.split('-');
  const months: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };
  return `${months[month || '01'] || month} ${year}`;
}

// Aliases para conveniencia semántica en componentes
export const formatDOPCompact = formatMoneyCompact;
export const formatDOPFull = formatMoneyFull;
export const formatPeriodLabel = formatPeriodLong;
export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('es-DO');
};
export const formatBasisPoints = (value: number): string => {
  return value >= 0 ? `+${value.toFixed(2)} pp` : `${value.toFixed(2)} pp`;
};
