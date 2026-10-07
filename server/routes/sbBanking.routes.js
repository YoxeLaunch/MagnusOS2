/**
 * ============================================================================
 * SUPERINTENDENCIA DE BANCOS (SB) // BANKING ROUTES
 * REST Endpoints under /api/markets/banking
 * ============================================================================
 */

import { Router } from 'express';
import {
    getBankingSummary,
    getBankingYields,
    getBankingDeposits,
    getDollarizationTrend,
    getBankingInstitution,
    getBankingHistory,
    getBankingProvinces,
    getBankingSyncStatus,
    handleTriggerSync
} from '../controllers/sbBankingController.js';
import { requireAuthenticated, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Endpoints analíticos y de lectura de datos bancarios (todos leen de PostgreSQL)
router.get('/summary', getBankingSummary);
router.get('/yields', getBankingYields);
router.get('/deposits', getBankingDeposits);
router.get('/dollarization-trend', getDollarizationTrend);
router.get('/institution/:entity', getBankingInstitution);
router.get('/history', getBankingHistory);
router.get('/provinces', getBankingProvinces);
// Compatibility alias; /provinces remains the canonical endpoint.
router.get('/geography', getBankingProvinces);
router.get('/sync-status', getBankingSyncStatus);

// Manual ingestion mutates financial data and consumes SB quota: admin only.
router.post('/sync', requireAuthenticated, requireAdmin, handleTriggerSync);

export default router;
