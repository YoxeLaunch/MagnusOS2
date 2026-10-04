import { Router } from 'express';
import * as finanzaController from '../controllers/finanzaController.js';
import * as accountsController from '../controllers/accountsController.js';
import * as ledgerController from '../controllers/ledgerController.js';
import * as savingsController from '../controllers/savingsController.js';
import * as importController from '../controllers/importController.js';
import * as wealthController from '../controllers/wealthController.js';
import { verifyJWT } from '../middleware/auth.js';
import express from 'express';

const router = Router();

// Todas las rutas financieras requieren JWT
router.use(verifyJWT);

// Límite extendido solo para rutas de importación (archivos CSV/PDF)
const importBodyParser = express.json({ limit: '10mb' });

// ========================================
// ACCOUNTS (New - P1)
// El frontend (finanzaApi.ts / Import.tsx) llama a /api/finanza/*, por eso
// estas rutas "nuevas" llevan el prefijo explícito — a diferencia de las
// rutas LEGACY de abajo, que sí se llaman directo en /api/* y no deben tocarse.
// ========================================
router.get('/finanza/accounts', accountsController.getAccounts);
router.post('/finanza/accounts', accountsController.createAccount);
router.patch('/finanza/accounts/:id', accountsController.updateAccount);
router.delete('/finanza/accounts/:id', accountsController.archiveAccount);
router.get('/finanza/accounts/:id/balance', accountsController.getAccountBalance);
router.post('/finanza/accounts/reorder', accountsController.reorderAccounts);

// ========================================
// LEDGER (New - P1)
// ========================================
router.get('/finanza/ledger/reconciliation', ledgerController.reconcileBalances);
router.get('/finanza/ledger', ledgerController.getLedgerTransactions);
router.get('/finanza/cashflow', ledgerController.getCashFlowSummary);
router.post('/finanza/ledger/transactions', ledgerController.createTransaction);
router.patch('/finanza/ledger/transactions/:id', ledgerController.updateTransaction);
router.delete('/finanza/ledger/transactions/:id', ledgerController.deleteTransaction);
router.patch('/finanza/ledger/transactions/:id/status', ledgerController.updateTransactionStatus);

// ========================================
// TRANSFERS (New - P1)
// ========================================
router.post('/finanza/transfers', ledgerController.createTransfer);

// ========================================
// SAVINGS GOALS (New - P2)
// ========================================
router.get('/finanza/savings-goals', savingsController.getSavingsGoals);
router.post('/finanza/savings-goals', savingsController.createSavingsGoal);
router.patch('/finanza/savings-goals/:id', savingsController.updateSavingsGoal);
router.delete('/finanza/savings-goals/:id', savingsController.deleteSavingsGoal);
router.post('/finanza/savings-goals/:id/contribute', savingsController.addContribution);
router.get('/finanza/savings-goals/:id/progress', savingsController.getGoalProgress);
router.get('/finanza/savings-rate', savingsController.getSavingsRate);

// ========================================
// IMPORT (New - P3) — límite extendido a 10mb
// ========================================
router.get('/finanza/import/templates', importBodyParser, importController.getImportTemplates);
router.post('/finanza/import/preview', importBodyParser, importController.previewImport);
router.post('/finanza/import', importBodyParser, importController.importTransactions);
router.post('/finanza/import/categorize', importBodyParser, importController.categorizeImports);

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
