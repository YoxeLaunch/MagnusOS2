// ========================================
// Finanza API Client for Magnus-OS2
// New Ledger endpoints + Legacy support
// ========================================

const API_BASE = '/api/finanza';

// ========================================
// ACCOUNTS
// ========================================
export interface Account {
    id: string;
    userId: string;
    name: string;
    type: 'cash' | 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan';
    currency: string;
    institution?: string;
    openingBalance: number;
    currentBalance: number;
    isArchived: boolean;
    sortOrder: number;
    notes?: string;
}

export const accountsApi = {
    getAll: async (userId: string, includeArchived = false): Promise<Account[]> => {
        const res = await fetch(`${API_BASE}/accounts?userId=${userId}&includeArchived=${includeArchived}`);
        if (!res.ok) throw new Error('Failed to fetch accounts');
        return res.json();
    },

    create: async (account: Partial<Account>): Promise<Account> => {
        const res = await fetch(`${API_BASE}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(account)
        });
        if (!res.ok) throw new Error('Failed to create account');
        return res.json();
    },

    update: async (id: string, updates: Partial<Account>): Promise<Account> => {
        const res = await fetch(`${API_BASE}/accounts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update account');
        return res.json();
    },

    archive: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to archive account');
    },

    getBalance: async (id: string): Promise<{ currentBalance: number; currency: string }> => {
        const res = await fetch(`${API_BASE}/accounts/${id}/balance`);
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
        const res = await fetch(`${API_BASE}/ledger?${params}`);
        if (!res.ok) throw new Error('Failed to fetch transactions');
        return res.json();
    },

    createTransaction: async (transaction: Omit<LedgerTransaction, 'id'>): Promise<LedgerTransaction> => {
        const res = await fetch(`${API_BASE}/ledger/transactions`, {
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
        const res = await fetch(`${API_BASE}/ledger/transactions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update transaction');
        return res.json();
    },

    deleteTransaction: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/ledger/transactions/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete transaction');
    },

    updateStatus: async (id: string, status: 'pending' | 'cleared' | 'reconciled'): Promise<void> => {
        const res = await fetch(`${API_BASE}/ledger/transactions/${id}/status`, {
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
        const res = await fetch(`${API_BASE}/transfers`, {
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
// Export all APIs
// ========================================
export const finanzaApi = {
    accounts: accountsApi,
    ledger: ledgerApi,
    transfers: transfersApi,
    categories: categoriesApi
};

export default finanzaApi;
