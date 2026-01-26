import { Router } from 'express';
import * as telegramController from '../controllers/telegramController.js';

const router = Router();

// Link Telegram account to Magnus user
router.post('/link', telegramController.linkUser);

// Unlink Telegram account
router.post('/unlink', telegramController.unlinkUser);

// Get financial report for linked user
router.get('/report/:chatId', telegramController.getReport);

export default router;
