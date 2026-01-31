import { Router } from 'express';
import * as finanzaController from '../controllers/finanzaController.js';
import * as accountsController from '../controllers/accountsController.js';
import * as ledgerController from '../controllers/ledgerController.js';
import * as savingsController from '../controllers/savingsController.js';
import * as importController from '../controllers/importController.js';
import * as wealthController from '../controllers/wealthController.js';

const router = Router();

// ========================================
// ACCOUNTS (New - P1)
// ========================================
router.get('/accounts', accountsController.getAccounts);
router.post('/accounts', accountsController.createAccount);
router.patch('/accounts/:id', accountsController.updateAccount);
router.delete('/accounts/:id', accountsController.archiveAccount);
router.get('/accounts/:id/balance', accountsController.getAccountBalance);
router.post('/accounts/reorder', accountsController.reorderAccounts);

// ========================================
// LEDGER (New - P1)
// ========================================
router.get('/ledger', ledgerController.getLedgerTransactions);
router.post('/ledger/transactions', ledgerController.createTransaction);
router.patch('/ledger/transactions/:id', ledgerController.updateTransaction);
router.delete('/ledger/transactions/:id', ledgerController.deleteTransaction);
router.patch('/ledger/transactions/:id/status', ledgerController.updateTransactionStatus);

// ========================================
// TRANSFERS (New - P1)
// ========================================
router.post('/transfers', ledgerController.createTransfer);

// ========================================
// SAVINGS GOALS (New - P2)
// ========================================
router.get('/savings-goals', savingsController.getSavingsGoals);
router.post('/savings-goals', savingsController.createSavingsGoal);
router.patch('/savings-goals/:id', savingsController.updateSavingsGoal);
router.delete('/savings-goals/:id', savingsController.deleteSavingsGoal);
router.post('/savings-goals/:id/contribute', savingsController.addContribution);
router.get('/savings-goals/:id/progress', savingsController.getGoalProgress);
router.get('/savings-rate', savingsController.getSavingsRate);

// ========================================
// IMPORT (New - P3)
// ========================================
router.get('/import/templates', importController.getImportTemplates);
router.post('/import/preview', importController.previewImport);
router.post('/import', importController.importTransactions);
router.post('/import/categorize', importController.categorizeImports);

// ========================================
// WEALTH (New - Phase 1)
// ========================================
router.get('/wealth/history', wealthController.getWealthHistory);
router.post('/wealth/snapshot', wealthController.createWealthSnapshot);

// ========================================
// LEGACY ENDPOINTS (to be deprecated)
// Keep for backward compatibility during migration
// ========================================

// Legacy Transactions
router.get('/transactions', finanzaController.getTransactions);
router.post('/transactions', finanzaController.createTransaction);
router.put('/transactions/:id', finanzaController.updateTransaction);
router.delete('/transactions/:id', finanzaController.deleteTransaction);

// Daily Transactions
router.get('/daily-transactions', finanzaController.getDailyTransactions);
router.post('/daily-transactions', finanzaController.createDailyTransaction);
router.put('/daily-transactions/:id', finanzaController.updateDailyTransaction);
router.delete('/daily-transactions/:id', finanzaController.deleteDailyTransaction);

// Rates
router.get('/rates', finanzaController.getRates);
router.post('/rates', finanzaController.updateRates);
router.get('/rates/history', finanzaController.getRatesHistory);

export default router;
