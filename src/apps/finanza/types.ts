import { Transaction } from '../../shared/types';
export type { Transaction };

export interface DailyTransaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense' | 'investment';
  category?: string;
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

export interface AppData {
  incomes: Transaction[];
  expenses: Transaction[];
  investments: Transaction[];
  savingsGoal: number;
  materialInvestment: number;
}

export interface CurrencyState {
  usd: CurrencyRate;
  eur: CurrencyRate;
  lastUpdated: Date;
}