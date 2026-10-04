// ========================================
// Finanza API Client for Magnus-OS2
// New Ledger endpoints + Legacy support
// ========================================
import { apiFetch } from '../../../shared/utils/apiFetch';

const API_BASE = '/api/finanza';

// ========================================
// ACCOUNTS
// ========================================
export interface Account {
    id: string;
    userId: string;
    name: string;
    type: 'cash' | 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan';
    currency: 'DOP' | 'USD' | 'EUR';
    institution?: string;
    openingBalance: number;
    currentBalance: number;
    isArchived: boolean;
    sortOrder: number;
    notes?: string;
}

export const accountsApi = {
    getAll: async (userId: string, includeArchived = false): Promise<Account[]> => {
        const res = await apiFetch(`${API_BASE}/accounts?userId=${userId}&includeArchived=${includeArchived}`);
        if (!res.ok) throw new Error('Failed to fetch accounts');
        return res.json();
    },

    create: async (account: Partial<Account>): Promise<Account> => {
        const res = await apiFetch(`${API_BASE}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(account)
        });
        if (!res.ok) throw new Error('Failed to create account');
        return res.json();
    },

    update: async (id: string, updates: Partial<Account>): Promise<Account> => {
        const res = await apiFetch(`${API_BASE}/accounts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update account');
        return res.json();
    },

    archive: async (id: string): Promise<void> => {
        const res = await apiFetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to archive account');
    },

    getBalance: async (id: string): Promise<{ currentBalance: number; currency: string }> => {
        const res = await apiFetch(`${API_BASE}/accounts/${id}/balance`);
        if (!res.ok) throw new Error('Failed to get balance');
        return res.json();
    }
};

// ========================================
// LEDGER TRANSACTIONS
// ========================================
export interface TransactionLine {
    id?: string;
    accountId: string;
    categoryId?: string;
    amount: number;
    currency?: string;
    memo?: string;
    account?: { id: string; name: string; type: string };
    category?: { id: string; name: string; icon?: string; color?: string };
}

export interface LedgerTransaction {
    id: string;
    userId: string;
    date: string;
    payeeId?: string;
    payeeName?: string;
    memo?: string;
    status: 'pending' | 'cleared' | 'reconciled';
    type: 'income' | 'expense' | 'transfer' | 'investment';
    reference?: string;
    lines: TransactionLine[];
}

export interface LedgerResponse {
    data: LedgerTransaction[];
    total: number;
    limit: number;
    offset: number;
}

export interface LedgerFilters {
    userId: string;
    from?: string;
    to?: string;
    accountId?: string;
    categoryId?: string;
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
}

export const ledgerApi = {
    getTransactions: async (filters: LedgerFilters): Promise<LedgerResponse> => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) params.append(key, String(value));
        });
        const res = await apiFetch(`${API_BASE}/ledger?${params}`);
        if (!res.ok) throw new Error('Failed to fetch transactions');
        return res.json();
    },

    createTransaction: async (transaction: Omit<LedgerTransaction, 'id'>): Promise<LedgerTransaction> => {
        const res = await apiFetch(`${API_BASE}/ledger/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create transaction');
        }
        return res.json();
    },

    updateTransaction: async (id: string, updates: Partial<LedgerTransaction>): Promise<LedgerTransaction> => {
        const res = await apiFetch(`${API_BASE}/ledger/transactions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update transaction');
        return res.json();
    },

    deleteTransaction: async (id: string): Promise<void> => {
        const res = await apiFetch(`${API_BASE}/ledger/transactions/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete transaction');
    },

    updateStatus: async (id: string, status: 'pending' | 'cleared' | 'reconciled'): Promise<void> => {
        const res = await apiFetch(`${API_BASE}/ledger/transactions/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Failed to update status');
    }
};

// ========================================
// TRANSFERS
// ========================================
export interface TransferRequest {
    userId: string;
    date: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    memo?: string;
    reference?: string;
}

export const transfersApi = {
    create: async (transfer: TransferRequest): Promise<LedgerTransaction> => {
        const res = await apiFetch(`${API_BASE}/transfers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transfer)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create transfer');
        }
        return res.json();
    }
};

// ========================================
// CATEGORIES (Read-only for now)
// ========================================
export interface Category {
    id: string;
    name: string;
    group?: string;
    type: 'income' | 'expense';
    icon?: string;
    color?: string;
}

export const categoriesApi = {
    getAll: async (userId: string): Promise<Category[]> => {
        // TODO: Add endpoint when needed
        // For now, categories are system-wide
        return [];
    }
};

// ========================================
// CASH FLOW & READ MODEL (Phase II)
// ========================================
export interface CashFlowDay {
    date: string;
    incomeMinor: string;
    expenseMinor: string;
    investedMinor: string;
    netMinor: string;
    income: number | string;
    expense: number | string;
    invested: number | string;
    net: number | string;
}

export interface CashFlowResponse {
    source?: 'ledger' | 'legacy';
    period: { startDate: string | null; endDate: string | null };
    currency: string;
    totalIncomeMinor: string;
    totalExpenseMinor: string;
    totalInvestedMinor: string;
    netCashFlowMinor: string;
    totalIncome: number | string;
    totalExpense: number | string;
    totalInvested: number | string;
    netCashFlow: number | string;
    transactionCount: number;
    timeline: CashFlowDay[];
}

export interface SavingsRateResponse {
    source: 'ledger' | 'legacy';
    month: string;
    totalIncome: number;
    totalExpense: number;
    totalInvested: number;
    totalSaved: number;
    savingsRate: number;
    totalGoalContributions: number;
}

export interface NetWorthResponse {
    asOfDate: string;
    currency: string;
    assetsMinor: string;
    liabilitiesMinor: string;
    netWorthMinor: string;
    assets: number | string;
    liabilities: number | string;
    netWorth: number | string;
    accountsCount: number;
}

export const cashFlowApi = {
    getCashFlow: async (params?: { startDate?: string; endDate?: string; currency?: string; source?: 'ledger' | 'legacy' | 'compare' }): Promise<CashFlowResponse> => {
        const search = new URLSearchParams();
        if (params?.startDate) search.set('startDate', params.startDate);
        if (params?.endDate) search.set('endDate', params.endDate);
        if (params?.currency) search.set('currency', params.currency);
        if (params?.source) search.set('source', params.source);
        const res = await apiFetch(`${API_BASE}/cashflow?${search.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch cash flow summary');
        return res.json();
    },
    getSavingsRate: async (params?: { month?: string; source?: 'ledger' | 'legacy' }): Promise<SavingsRateResponse> => {
        const search = new URLSearchParams();
        if (params?.month) search.set('month', params.month);
        if (params?.source) search.set('source', params.source);
        const res = await apiFetch(`${API_BASE}/savings-rate?${search.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch savings rate');
        return res.json();
    },
    getNetWorth: async (params?: { asOfDate?: string; currency?: string }): Promise<NetWorthResponse> => {
        const search = new URLSearchParams();
        if (params?.asOfDate) search.set('asOfDate', params.asOfDate);
        if (params?.currency) search.set('currency', params.currency);
        const res = await apiFetch(`${API_BASE}/wealth/net-worth?${search.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch net worth');
        return res.json();
    }
};

// ========================================
// Export all APIs
// ========================================
export const finanzaApi = {
    accounts: accountsApi,
    ledger: ledgerApi,
    transfers: transfersApi,
    categories: categoriesApi,
    cashFlow: cashFlowApi
};

export default finanzaApi;
