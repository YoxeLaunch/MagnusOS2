import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppData, Transaction, CurrencyState, DailyTransaction, WealthSnapshot } from '../types';
import { authService } from '../../../shared/services/auth';
import { apiFetch } from '../../../shared/utils/apiFetch';
import { useToast } from '../../../shared/context/ToastContext';

interface DataContextType {
  data: AppData;
  addTransaction: (t: Transaction) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (t: Transaction) => void;
  currencies: CurrencyState;
  refreshCurrencies: () => void;
  updateCurrencyRate: (code: 'usd' | 'eur', newRate: number) => void;
  isSimulating: boolean;
  toggleSimulation: () => void;
  dailyTransactions: DailyTransaction[];
  addDailyTransaction: (t: Omit<DailyTransaction, 'id'>, onSuccess?: () => void) => void;
  removeDailyTransaction: (id: number) => void;
  updateDailyTransaction: (t: DailyTransaction, onSuccess?: () => void) => void;
  wealthHistory: WealthSnapshot[];
  saveWealthSnapshot: (snapshot: Partial<WealthSnapshot>) => Promise<void>;
  refreshWealthHistory: () => void;
  isLoading: boolean;
}



const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>({
    incomes: [],
    expenses: [],
    investments: [],
    savingsGoal: 155000,
    materialInvestment: 75000,
  });

  const [dailyTransactions, setDailyTransactions] = useState<DailyTransaction[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // Fetch data from API
  const API_URL = `/api/transactions`;

  // Get current user
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.username; // Use username as ID since it's unique in this system

  useEffect(() => {
    if (!userId) return; // Don't fetch if no user

    const transactionsPromise = apiFetch(`${API_URL}?userId=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((transactions: Transaction[]) => {
        if (!Array.isArray(transactions)) {
          console.error('Expected array of transactions, got:', transactions);
          return;
        }

        // Parse deductions if they come as JSON string
        const parsedTransactions = transactions.map(t => ({
          ...t,
          deductions: typeof t.deductions === 'string' ? JSON.parse(t.deductions) : t.deductions
        }));

        setData(prev => ({
          ...prev,
          incomes: parsedTransactions.filter(t => t.type === 'income'),
          expenses: parsedTransactions.filter(t => t.type === 'expense'),
          investments: parsedTransactions.filter(t => t.type === 'investment')
        }));
      })
      .catch(err => console.error('Error fetching data:', err));

    const dailyPromise = apiFetch(`/api/daily-transactions?userId=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setDailyTransactions(data);
        } else {
          console.error('Expected array of daily transactions, got:', data);
          setDailyTransactions([]);
        }
      })
      .catch(err => {
        console.error('Error fetching daily transactions:', err);
        setDailyTransactions([]);
      });

    // Fetch history
    const historyPromise = apiFetch(`/api/wealth/history?userId=${userId}`)
      .then(res => res.json())
      .then(data => setWealthHistory(Array.isArray(data) ? data : []));

    // Wait for all initial critical data
    Promise.all([transactionsPromise, dailyPromise, historyPromise])
      .finally(() => {
        // Short delay to ensure state updates are processed
        setTimeout(() => setIsLoading(false), 200);
      });
  }, [userId]);

  const [wealthHistory, setWealthHistory] = useState<WealthSnapshot[]>([]);

  const fetchWealthHistory = (uid: string) => {
    apiFetch(`/api/wealth/history?userId=${uid}`)
      .then(res => res.json())
      .then(data => setWealthHistory(Array.isArray(data) ? data : []))
      .catch(err => console.error("Failed to fetch wealth history", err));
  };

  const refreshWealthHistory = () => {
    if (userId) fetchWealthHistory(userId);
  };

  const saveWealthSnapshot = async (snapshot: Partial<WealthSnapshot>) => {
    if (!userId) return;
    try {
      await apiFetch('/api/wealth/snapshot', {
        method: 'POST',
        body: JSON.stringify({ ...snapshot, userId })
      });
      refreshWealthHistory();
    } catch (error) {
      console.error("Failed to save snapshot", error);
    }
  };

  const [currencies, setCurrencies] = useState<CurrencyState>({
    usd: { code: 'USD', name: 'Dólar Estadounidense', rate: 60.15, trend: 'neutral', change: 0 },
    eur: { code: 'EUR', name: 'Euro', rate: 65.40, trend: 'neutral', change: 0 },
    lastUpdated: new Date(),
  });

  // Simulator Logic Removed directly, kept empty useEffect for structure or removed entirely
  useEffect(() => {
    // Simulation disabled by default per user request
  }, [isSimulating]);

  const addTransaction = (t: Transaction) => {
    if (!userId) {
      toast.error("Error: No hay sesión activa");
      return;
    }
    const transactionWithUser = { ...t, userId };
    apiFetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(transactionWithUser)
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server error ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(savedTransaction => {
        const parsedTransaction = {
          ...savedTransaction,
          deductions: typeof savedTransaction.deductions === 'string'
            ? JSON.parse(savedTransaction.deductions)
            : savedTransaction.deductions
        };

        setData(prev => {
          if (parsedTransaction.type === 'income') return { ...prev, incomes: [...prev.incomes, parsedTransaction] };
          if (parsedTransaction.type === 'investment') return { ...prev, investments: [...prev.investments, parsedTransaction] };
          return { ...prev, expenses: [...prev.expenses, parsedTransaction] };
        });
        toast.success('¡Gasto guardado correctamente!');
      })
      .catch(err => {
        console.error('Error adding transaction:', err);
        // alert(\`Error al guardar: \${err.message}\`);
      });
  };

  const removeTransaction = (id: string) => {
    apiFetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to delete');
        setData(prev => ({
          ...prev,
          incomes: prev.incomes.filter(i => i.id !== id),
          expenses: prev.expenses.filter(e => e.id !== id),
          investments: prev.investments.filter(inv => inv.id !== id),
        }));
        toast.success('Elemento eliminado');
      })
      .catch(err => toast.error(`Error al eliminar: ${err.message}`));
  };

  const updateTransaction = (t: Transaction) => {
    apiFetch(`${API_URL}/${t.id}`, {
      method: 'PUT',
      body: JSON.stringify(t)
    })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to update');
        return res.json();
      })
      .then(updatedTransaction => {
        const parsedTransaction = {
          ...updatedTransaction,
          deductions: typeof updatedTransaction.deductions === 'string'
            ? JSON.parse(updatedTransaction.deductions)
            : updatedTransaction.deductions
        };

        setData(prev => {
          const isIncome = prev.incomes.some(i => i.id === parsedTransaction.id);
          const isInvestment = prev.investments.some(inv => inv.id === parsedTransaction.id);
          if (isIncome) {
            return { ...prev, incomes: prev.incomes.map(i => i.id === parsedTransaction.id ? parsedTransaction : i) };
          }
          if (isInvestment) {
            return { ...prev, investments: prev.investments.map(inv => inv.id === parsedTransaction.id ? parsedTransaction : inv) };
          }
          return { ...prev, expenses: prev.expenses.map(e => e.id === parsedTransaction.id ? parsedTransaction : e) };
        });
        toast.success('¡Gasto actualizado!');
      })
      .catch(err => toast.error(`Error al actualizar: ${err.message}`));
  };

  // Fetch global rates
  const fetchGlobalRates = () => {
    apiFetch(`/api/rates`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(rates => {
        // Validar que rates tenga los valores esperados
        if (rates && typeof rates.usd === 'number' && typeof rates.eur === 'number') {
          setCurrencies(prev => ({
            ...prev,
            usd: { ...prev.usd, rate: rates.usd },
            eur: { ...prev.eur, rate: rates.eur },
            lastUpdated: new Date()
          }));
        } else {
          console.error('Invalid rates format:', rates);
        }
      })
      .catch(err => {
        console.error("Failed to fetch rates", err);
        // No actualizar currencies si hay error - mantener valores por defecto
      });
  };

  useEffect(() => {
    fetchGlobalRates();
    // Poll every minute for updates from Admin Panel
    const interval = setInterval(fetchGlobalRates, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateCurrencyRate = (code: 'usd' | 'eur', newRate: number) => {
    // Optimistic update
    setCurrencies(prev => ({
      ...prev,
      [code]: { ...prev[code], rate: newRate, lastUpdated: new Date() }
    }));

    // Sync with server
    const payload = { [code]: newRate };
    apiFetch(`/api/rates`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }).catch(err => console.error("Failed to sync rate", err));
  };

  const refreshCurrencies = () => {
    fetchGlobalRates();
  };

  const toggleSimulation = () => {
    setIsSimulating(prev => !prev);
  }

  const addDailyTransaction = (t: Omit<DailyTransaction, 'id'>, onSuccess?: () => void) => {
    if (!userId) {
      toast.error("Error: No hay sesión activa");
      return;
    }
    const transactionWithUser = { ...t, userId };
    apiFetch(`/api/daily-transactions`, {
      method: 'POST',
      body: JSON.stringify(transactionWithUser)
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server error ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(saved => {
        setDailyTransactions(prev => [...prev, saved]);
        onSuccess?.();
        toast.success('Registro diario guardado');
      })
      .catch(err => toast.error('Error al guardar diario: ' + err.message));
  };

  const removeDailyTransaction = (id: number) => {
    apiFetch(`/api/daily-transactions/${id}`, {
      method: 'DELETE'
    })
      .then(() => {
        setDailyTransactions(prev => prev.filter(t => t.id !== id));
        toast.success('Registro eliminado');
      })
      .catch(err => toast.error('Error al eliminar diario: ' + err.message));
  };

  const updateDailyTransaction = (t: DailyTransaction, onSuccess?: () => void) => {
    apiFetch(`/api/daily-transactions/${t.id}`, {
      method: 'PUT',
      body: JSON.stringify(t)
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server error ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(updated => {
        setDailyTransactions(prev => prev.map(p => p.id === updated.id ? updated : p));
        onSuccess?.();
        toast.success('Registro diario actualizado');
      })
      .catch(err => toast.error('Error al actualizar diario: ' + err.message));
  };

  return (
    <DataContext.Provider value={{
      data,
      addTransaction,
      removeTransaction,
      updateTransaction,
      currencies,
      refreshCurrencies,
      updateCurrencyRate,
      isSimulating,
      toggleSimulation,
      dailyTransactions,
      addDailyTransaction,
      removeDailyTransaction,
      updateDailyTransaction,
      wealthHistory,
      saveWealthSnapshot,
      refreshWealthHistory,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};