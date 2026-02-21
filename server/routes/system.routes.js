import { Router } from 'express';
import * as systemController from '../controllers/systemController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = Router();

// Rutas de sistema protegidas por JWT
router.use(verifyJWT);

router.get('/system/stats', systemController.getSystemStats);
router.get('/updates', systemController.getUpdates);
router.post('/updates', systemController.createUpdate);
router.post('/upload', systemController.upload.single('image'), systemController.handleUpload);
router.post('/system/broadcast', systemController.sendBroadcast);
router.post('/system/backup', systemController.backupDatabase);

// Settings endpoints
router.get('/settings/banners', systemController.getBanners);
router.post('/settings/banners', systemController.saveBanners);

export default router;
