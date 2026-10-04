import { Router } from 'express';
import { getLiveness, getReadiness, getDeepHealth } from '../controllers/healthController.js';
import { verifyJWT, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 1. Liveness Probes (Public, fast process heartbeat)
router.get(['/', '/live', '/liveness', '/health', '/health/live', '/api/health', '/api/health/liveness'], getLiveness);

// 2. Readiness Probes (Public, checks DB, migrations, checksums, drift)
router.get(['/ready', '/readiness', '/health/ready', '/api/health/readiness'], getReadiness);

// 3. Deep Health (Protected by [verifyJWT, requireAdmin], returns sanitized telemetry)
router.get(['/deep', '/health/deep', '/api/health/deep'], [verifyJWT, requireAdmin], getDeepHealth);

export default router;
