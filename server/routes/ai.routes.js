import express from 'express';
import * as aiController from '../controllers/aiController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// All AI routes protected by JWT
router.use(verifyJWT);

router.post('/chat', aiController.chat);
router.post('/analyze', aiController.analyze);
router.get('/snapshots', aiController.listSnapshots);
router.get('/snapshots/:id', aiController.getSnapshotById);
router.delete('/snapshots/:id', aiController.deleteSnapshot);

export default router;

