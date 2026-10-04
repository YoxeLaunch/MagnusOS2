import { Router } from 'express';
import { getLiveness, getReadiness, getDeepHealth } from '../controllers/healthController.js';
import { requireAuthenticated } from '../middleware/auth.js';

const router = Router();

// 1. Liveness Probes
router.get('/health', getLiveness);
router.get('/health/live', getLiveness);
router.get('/api/health/liveness', getLiveness);

// 2. Readiness Probes
router.get('/health/ready', getReadiness);
router.get('/api/health/readiness', getReadiness);

// 3. Deep Health (Protected)
router.get('/health/deep', requireAuthenticated, getDeepHealth);
router.get('/api/health/deep', requireAuthenticated, getDeepHealth);

export default router;
