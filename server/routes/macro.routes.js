import { Router } from 'express';
import {
    getMacroData,
    getMacroIndicatorDetail,
    refreshMacroData,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from '../controllers/macroController.js';
import { optionalJWT } from '../middleware/auth.js';

export const macroRoutes = Router();

// /api/markets/macro
macroRoutes.get('/', getMacroData);
macroRoutes.get('/indicator/:indicatorId', getMacroIndicatorDetail);
macroRoutes.get('/indicator/:indicatorId/history', getMacroIndicatorDetail);
macroRoutes.post('/refresh', optionalJWT, refreshMacroData);

export const notificationRoutes = Router();

// /api/notifications
notificationRoutes.get('/', getNotifications);
notificationRoutes.patch('/:id/read', markNotificationRead);
notificationRoutes.post('/read-all', markAllNotificationsRead);

export default macroRoutes;
