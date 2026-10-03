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

// ========================================
// Providence FX Market Types (USD/DOP RD)
// ========================================
export interface FxBankObservation {
  provider: string;
  buy: number;
  sell: number;
  observedAt: string;
}

export interface FxBankRate {
  institutionId: string;
  institutionName: string;
  fullName?: string;
  rateType: string;
  logo?: string;
  buy: number;
  sell: number;
  mid?: number;
  spread?: number;
  validationStatus: 'VERIFIED' | 'ACCEPTABLE' | 'WARNING' | 'CONFLICT' | 'SINGLE_SOURCE';
  confidence: number;
  observedAt: string;
  providerUpdatedAt?: string;
  providers: string[];
  observations?: FxBankObservation[];
  differences?: {
    differenceBuy: number;
    differenceSell: number;
  };
}

export interface FxUsdDopResponse {
  pair: string;
  generatedAt: string;
  summary: {
    avgBuy: number | null;
    avgSell: number | null;
    avgSpread: number | null;
    institutionsCount: number;
    bestToSellUsd?: {
      institutionId: string;
      institutionName: string;
      rate: number;
      validationStatus: string;
    } | null;
    bestToBuyUsd?: {
      institutionId: string;
      institutionName: string;
      rate: number;
      validationStatus: string;
    } | null;
  };
  reference: {
    market?: {
      price: number;
      prevClose: number;
      change: number;
      changePercent: number;
      observedAt: string;
    } | null;
    official?: {
      buy: number;
      sell: number;
      observedAt: string;
    } | null;
  };
  banks: FxBankRate[];
  meta: {
    cache: boolean;
    stale: boolean;
    ageMinutes: number;
    isMaxStale?: boolean;
    warning?: string;
    sources: Array<{
      id: string;
      name: string;
      status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
    }>;
  };
}