import { Router } from 'express';
import { getHealth, getDeepHealth } from '../controllers/healthController.js';
import { requireAuthenticated } from '../middleware/auth.js';

const router = Router();

// Fast healthcheck for Docker and basic monitoring
router.get('/health', getHealth);

// Deep healthcheck (requires authentication to protect memory/service topology)
router.get('/health/deep', requireAuthenticated, getDeepHealth);

export default router;
