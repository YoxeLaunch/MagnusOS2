import { Transaction, CurrencyState } from '../types';

/**
 * @deprecated Use calculateAnnualAmountV2 instead for historical accuracy.
 * Calcula el monto anualizado de una transacción, considerando su frecuencia y moneda.
 * @param t - La transacción a calcular.
 * @param currencies - Estado actual de las divisas para conversión (opcional).
 * @returns El monto anual en DOP.
 */
export const calculateAnnualAmount = (t: Transaction, currencies?: CurrencyState): number => {
  let netAmount = t.amount;

  // Subtract Deductions if present
  if (t.deductions) {
    const totalDeductions = (t.deductions.afp || 0) +
      (t.deductions.sfs || 0) +
      (t.deductions.isr || 0) +
      (t.deductions.others?.reduce((acc, curr) => acc + curr.amount, 0) || 0);
    netAmount = Math.max(0, netAmount - totalDeductions);
  }

  let amountInDOP = netAmount;

  if (currencies && t.currency) {
    if (t.currency === 'USD') amountInDOP = netAmount * currencies.usd.rate;
    else if (t.currency === 'EUR') amountInDOP = netAmount * currencies.eur.rate;
  }

  switch (t.frequency) {
    case 'Mensual': return amountInDOP * 12;
    case 'Trimestral': return amountInDOP * 4;
    case 'Anual': return amountInDOP;
    case 'Fijo': return amountInDOP * 12;
    case 'Variable': return amountInDOP * 12;
    default: return amountInDOP;
  }
};

/**
 * Calcula el monto anualizado de una transacción (V2), respetando fechas de validez pura (Historial).
 * Evita romper el histórico del año si cambia.
 * @param t - La transacción a calcular.
 * @param currencies - Estado actual de las divisas.
 * @returns El monto anual en DOP para el año actual.
 */
export const calculateAnnualAmountV2 = (t: Transaction, currencies?: CurrencyState): number => {
  // 1. Obtener la base (como V1)
  const baseAnnual = calculateAnnualAmount(t, currencies);

  // 2. Si no tiene validFrom/validTo o no es Mensual, funciona como V1 temporalmente
  // (La lógica más avanzada de V2 aplica primordialmente a pagos recurrentes 'Mensual')
  if (!t.validFrom && !t.validTo) {
    return baseAnnual;
  }

  // 3. Lógica Proporcional de Fechas (Año actual)
  const currentYear = new Date().getFullYear();

  let startMonth = 0; // 0 = Enero
  let endMonth = 11;  // 11 = Diciembre

  if (t.validFrom) {
    const fromDate = new Date(t.validFrom);
    if (fromDate.getFullYear() === currentYear) {
      startMonth = fromDate.getMonth();
    } else if (fromDate.getFullYear() > currentYear) {
      return 0; // Transacción futura
    }
  }

  if (t.validTo) {
    const toDate = new Date(t.validTo);
    if (toDate.getFullYear() === currentYear) {
      endMonth = toDate.getMonth();
    } else if (toDate.getFullYear() < currentYear) {
      return 0; // Transacción expirada en año pasado
    }
  }

  // Número de meses activos este año
  const activeMonths = Math.max(0, endMonth - startMonth + 1);

  if (t.frequency === 'Mensual' || t.frequency === 'Fijo' || t.frequency === 'Variable') {
    // Revertimos la multiplicación por 12 y multiplicamos por los activos
    const monthlyAmount = baseAnnual / 12;
    return monthlyAmount * activeMonths;
  }

  return baseAnnual;
};

/**
 * @deprecated Use Array.prototype.reduce with calculateAnnualAmountV2 instead.
 * Calcula el total anual de una lista de transacciones.
 * @param transactions - Lista de transacciones.
 * @param currencies - Tasas de cambio (opcional).
 * @returns Suma total anualizada.
 */
export const calculateTotalAnnual = (transactions: Transaction[], currencies?: CurrencyState) => {
  return transactions.reduce((acc, curr) => acc + calculateAnnualAmount(curr, currencies), 0);
};

/**
 * Formatea un número como moneda.
 * @param amount - Cantidad numérica.
 * @param currency - Código de moneda ('DOP', 'USD', 'EUR'). Default: 'DOP'.
 * @returns String formateado (ej: RD$ 1,500.00).
 */
export const formatCurrency = (amount: number, currency: 'DOP' | 'USD' | 'EUR' = 'DOP') => {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(amount);
};

/**
 * Formatea un monto especificamente en USD (Locale US).
 * @param amount - Cantidad en dólares.
 * @returns String formateado (ej: $1,500.00).
 */
export const formatUSD = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const calculateNetWorth = (data: any): number => {
  if (!data) return 0;
  const accounts = data.accounts?.reduce((acc: number, curr: any) => acc + (curr.balance || 0), 0) || 0;
  const investments = data.investments?.reduce((acc: number, curr: any) => acc + (curr.currentValue || curr.amount || 0), 0) || 0;
  const assets = data.assets?.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) || 0;
  // Debts are usually negative balances in accounts or a separate array. Assuming separate array for now if it exists, otherwise ignored.
  const debts = data.debts?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0) || 0;
  return accounts + investments + assets - debts;
};