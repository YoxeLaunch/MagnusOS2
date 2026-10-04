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

  // Nota: se parsean año/mes directo del string "YYYY-MM-DD" (sin pasar por `new Date()`)
  // porque un Date de solo-fecha se interpreta en UTC medianoche; al leer getMonth()/getFullYear()
  // en la zona horaria local del navegador, fechas como "2026-02-01" pueden retroceder al mes
  // anterior en zonas con offset negativo (UTC-3, UTC-4, etc.), rompiendo el prorrateo.
  if (t.validFrom) {
    const [fromYear, fromMonth] = t.validFrom.split('-').map(Number);
    if (fromYear === currentYear) {
      startMonth = fromMonth - 1;
    } else if (fromYear > currentYear) {
      return 0; // Transacción futura
    }
  }

  if (t.validTo) {
    const [toYear, toMonth] = t.validTo.split('-').map(Number);
    if (toYear === currentYear) {
      endMonth = toMonth - 1;
    } else if (toYear < currentYear) {
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
 * Indica si una transacción recurrente está vigente en la fecha de referencia,
 * según sus fechas de validez (validFrom/validTo, formato YYYY-MM-DD).
 * Sin fechas de validez se considera siempre vigente.
 * @param t - La transacción a evaluar.
 * @param refDate - Fecha de referencia (default: hoy).
 */
export const isTransactionCurrentlyValid = (t: Transaction, refDate: Date = new Date()): boolean => {
  // Comparación por string local YYYY-MM-DD para evitar desfases de zona horaria
  const ref = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(refDate.getDate()).padStart(2, '0')}`;
  if (t.validFrom && t.validFrom.slice(0, 10) > ref) return false;
  if (t.validTo && t.validTo.slice(0, 10) < ref) return false;
  return true;
};

/**
 * Calcula el monto mensual VIGENTE de una transacción recurrente.
 * A diferencia de calculateAnnualAmountV2/12 (que prorratea el año y por tanto
 * reparte un salario viejo y uno nuevo como dos fracciones simultáneas),
 * aquí solo cuenta la transacción cuyo ciclo está activo hoy: si su vigencia
 * terminó (validTo pasado) o aún no inicia (validFrom futuro), retorna 0.
 * @param t - La transacción a calcular.
 * @param currencies - Tasas de cambio (opcional).
 * @param refDate - Fecha de referencia (default: hoy).
 * @returns Monto mensual en DOP, o 0 si no está vigente.
 */
export const calculateCurrentMonthlyAmount = (t: Transaction, currencies?: CurrencyState, refDate: Date = new Date()): number => {
  if (!isTransactionCurrentlyValid(t, refDate)) return 0;
  return calculateAnnualAmount(t, currencies) / 12;
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

export interface PortfolioSnapshot {
  accountsBalance: number;   // Saldo líquido declarado (efectivo/corrientes/ahorro), convertido a DOP
  dailyNet: number;          // income - expense - investment, todo el historial de dailyTransactions
  dailyInvestment: number;   // Solo la porción de inversión del registro diario (sin categoría propia)
  liquidAssets: number;      // accountsBalance si existe, si no dailyNet (nunca se suman ambas: ver Wealth.tsx)
  investedAssets: number;    // valor de inversiones declaradas + aportes registrados en el diario
  materialAssets: number;
  debts: number;
  netWorth: number;
}

/**
 * Fuente única de verdad para "cuánto dinero tienes": usada por Wealth.tsx, Investments.tsx,
 * PrintReport.tsx y Projections.tsx (Cash Runway / FIRE Calculator), para que el patrimonio
 * mostrado sea el mismo número en todas las pantallas.
 */
export const getPortfolioSnapshot = (data: any, dailyTransactions: any[] = [], currencies?: CurrencyState): PortfolioSnapshot => {
  const convertToDOP = (amount: number, currency?: string) => {
    if (currency === 'USD' && currencies?.usd) return amount * currencies.usd.rate;
    if (currency === 'EUR' && currencies?.eur) return amount * currencies.eur.rate;
    return amount;
  };

  // Las cuentas pueden estar denominadas en USD/EUR y los pasivos se guardan como
  // balances positivos. No se deben sumar como liquidez: una tarjeta/préstamo reduce
  // patrimonio y una cuenta de inversión pertenece al bloque de inversiones.
  const accountTotals = (data?.accounts || []).reduce((totals: { liquid: number; invested: number; debts: number }, acc: any) => {
    const balance = convertToDOP(Number(acc.currentBalance) || 0, acc.currency);

    if (acc.type === 'credit_card' || acc.type === 'loan') {
      totals.debts += balance;
    } else if (acc.type === 'investment') {
      totals.invested += balance;
    } else {
      totals.liquid += balance;
    }

    return totals;
  }, { liquid: 0, invested: 0, debts: 0 });

  const accountsBalance = accountTotals.liquid;

  let dailyIncome = 0, dailyExpense = 0, dailyInvestment = 0;
  (dailyTransactions || []).forEach((t: any) => {
    const amt = convertToDOP(t.amount, t.currency);
    if (t.type === 'income') dailyIncome += amt;
    else if (t.type === 'investment') dailyInvestment += amt;
    else dailyExpense += amt;
  });
  const dailyNet = dailyIncome - dailyExpense - dailyInvestment;

  // Si existen cuentas registradas, su saldo es la verdad canónica (incluso si es 0 o negativo).
  // Solo recurrir a dailyNet si no existen cuentas configuradas.
  const hasDeclaredAccounts = (data?.accounts || []).length > 0;
  const liquidAssets = hasDeclaredAccounts ? accountsBalance : dailyNet;

  const investmentsValue = (data?.investments || []).reduce((sum: number, inv: any) => sum + convertToDOP(inv.currentValue ?? inv.amount ?? 0, inv.currency), 0);
  // Las cuentas de inversión son la fuente canónica del libro mayor.
  // Evitar sumar dailyInvestment cuando ya existe una cuenta de inversión o saldo declarado.
  const investedAssets = accountTotals.invested > 0 
    ? accountTotals.invested 
    : (investmentsValue > 0 ? investmentsValue : dailyInvestment);

  const materialAssets = (data?.assets || []).reduce((sum: number, a: any) => sum + (a.value || 0), 0);
  const declaredDebts = (data?.debts || []).reduce((sum: number, d: any) => sum + convertToDOP(Number(d.amount) || 0, d.currency), 0);
  const debts = accountTotals.debts + declaredDebts;

  const netWorth = liquidAssets + investedAssets + materialAssets - debts;

  return { accountsBalance, dailyNet, dailyInvestment, liquidAssets, investedAssets, materialAssets, debts, netWorth };
};