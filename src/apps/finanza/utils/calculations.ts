import { Transaction, CurrencyState } from '../types';

/**
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