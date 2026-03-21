import React from 'react';

/**
 * Tipo para representar una transacción (ingreso o gasto).
 */
export interface Transaction {
    id: string;
    userId?: string;
    name: string;
    amount: number;
    frequency: 'Mensual' | 'Trimestral' | 'Anual' | 'Fijo' | 'Variable';
    category: string;
    currency: 'DOP' | 'USD' | 'EUR';
    date?: string; // ISO YYYY-MM-DD
    type: 'income' | 'expense' | 'investment';
    currentValue?: number; // For tracking P&L on investments
    deductions?: {
        afp: number;
        sfs: number;
        isr?: number;
        others?: Array<{ label: string; amount: number }>;
    };
    validFrom?: string; // FASE 1 - Non-destructive Historical Tracking
    validTo?: string;   // FASE 1 - Non-destructive Historical Tracking
}

/**
 * Tipos de tasas de cambio.
 */
export interface CurrencyRates {
    usd: { rate: number };
    eur: { rate: number };
    // Puedes añadir más monedas según sea necesario
}

/**
 * Definición de una categoría reutilizable.
 */
export interface Category {
    id: string;
    label: string;
    icon: React.ComponentType<unknown>;
}
