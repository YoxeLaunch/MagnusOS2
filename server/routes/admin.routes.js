import { Router } from 'express';
import { verifyJWT, requireAdmin } from '../middleware/auth.js';
import { getAuditEvents, getJobs, getFxProviderHealth, getAdminUpdates, getSessions, revokeManagedSession } from '../controllers/adminController.js';

const router = Router();
router.use(verifyJWT, requireAdmin);
router.get('/audit-events', getAuditEvents);
router.get('/jobs', getJobs);
router.get('/fx/providers', getFxProviderHealth);
router.get('/updates', getAdminUpdates);
router.get('/sessions', getSessions);
router.post('/sessions/:id/revoke', revokeManagedSession);
export default router;
