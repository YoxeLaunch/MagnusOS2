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
import { optionalJWT, requireAuthenticated } from '../middleware/auth.js';

const router = Router();

// Endpoints analíticos y de lectura de datos bancarios (todos leen de PostgreSQL)
router.get('/summary', getBankingSummary);
router.get('/yields', getBankingYields);
router.get('/deposits', getBankingDeposits);
router.get('/dollarization-trend', getDollarizationTrend);
router.get('/institution/:entity', getBankingInstitution);
router.get('/history', getBankingHistory);
router.get('/provinces', getBankingProvinces);
router.get('/sync-status', getBankingSyncStatus);

// Disparador de sincronización manual protegido
router.post('/sync', optionalJWT, handleTriggerSync);

export default router;
