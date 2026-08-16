import { Router } from 'express';
import * as systemController from '../controllers/systemController.js';
import { verifyJWT, requireSoberano } from '../middleware/auth.js';

const router = Router();

// Rutas de sistema protegidas por JWT
router.use(verifyJWT);

router.get('/system/stats', systemController.getSystemStats);
router.get('/updates', systemController.getUpdates);
router.post('/updates', systemController.createUpdate);
router.post('/upload', systemController.upload.single('image'), systemController.handleUpload);
router.post('/system/broadcast', requireSoberano, systemController.sendBroadcast);

// Rutas de Backup (restringidas a Soberano/Admin)
router.post('/system/backup', requireSoberano, systemController.backupDatabase);
router.get('/system/backups', requireSoberano, systemController.listBackups);
router.get('/system/backups/:filename', requireSoberano, systemController.downloadBackup);
router.delete('/system/backups/:filename', requireSoberano, systemController.deleteBackup);

// Settings endpoints
router.get('/settings/banners', systemController.getBanners);
router.post('/settings/banners', systemController.saveBanners);

export default router;
