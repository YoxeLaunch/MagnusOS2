import { Transaction } from '../../shared/types';
import { Account } from './api/finanzaApi';
export type { Transaction };

export interface DailyTransaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense' | 'investment';
  category?: string;
  currency?: string;
}

export interface CurrencyHistoryItem {
  date: string;
  rate: number;
}

export interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
  history?: CurrencyHistoryItem[];
}

export interface WealthSnapshot {
  id: number;
  userId: string;
  date: string;
  netWorth: number;
  currency: string;
  assets: number;
  liabilities: number;
  breakdown: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppData {
  incomes: Transaction[];
  expenses: Transaction[];
  investments: Transaction[];
  accounts?: Account[];
  savingsGoal: number;
  materialInvestment: number;
}

export interface CurrencyState {
  usd: CurrencyRate;
  eur: CurrencyRate;
  lastUpdated: Date;
}