/**
 * ============================================================================
 * MACRO RD & NOTIFICATION CONTROLLER
 * Endpoints unificados para el módulo de macroeconomía dominicana y alertas
 * ============================================================================
 */

import { macroService } from '../services/macro/macroService.js';
import { MagnusNotification } from '../models/index.js';

export const getMacroData = async (req, res) => {
    try {
        const force = req.query.force === 'true';
        const data = await macroService.getMacroSummary({ forceRefresh: force });
        res.setHeader('Cache-Control', 'public, max-age=120');
        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('[MACRO_API] Error al consultar datos macro:', error.message);
        return res.status(500).json({
            success: false,
            error: 'No fue posible obtener los datos macroeconómicos del BCRD',
            details: error.message
        });
    }
};

export const getMacroIndicatorDetail = async (req, res) => {
    try {
        const { indicatorId } = req.params;
        const range = req.query.range || '1Y';
        const data = await macroService.getIndicatorHistory(indicatorId, range);

        if (!data) {
            return res.status(404).json({ success: false, error: 'Indicador no encontrado' });
        }

        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('[MACRO_API] Error al consultar detalle de indicador:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Error al recuperar histórico del indicador'
        });
    }
};

export const refreshMacroData = async (req, res) => {
    try {
        const data = await macroService.getMacroSummary({ forceRefresh: true });
        return res.json({
            success: true,
            refreshed: true,
            data
        });
    } catch (error) {
        console.error('[MACRO_API] Error en refresco forzado:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Fallo al sincronizar con fuentes del BCRD'
        });
    }
};

// ============================================================================
// NOTIFICATION CENTER ENDPOINTS
// ============================================================================

export const getNotifications = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);
        const unreadOnly = req.query.unread === 'true';

        const whereClause = {};
        if (unreadOnly) {
            whereClause.isRead = false;
        }

        const [notifications, unreadCount] = await Promise.all([
            MagnusNotification.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit
            }),
            MagnusNotification.count({
                where: { isRead: false }
            })
        ]);

        return res.json({
            success: true,
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error('[NOTIFICATIONS_API] Error al obtener notificaciones:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Error al consultar notificaciones'
        });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await MagnusNotification.findByPk(id);

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
        }

        await notification.update({
            isRead: true,
            readAt: new Date()
        });

        const unreadCount = await MagnusNotification.count({ where: { isRead: false } });

        return res.json({
            success: true,
            unreadCount,
            notification
        });
    } catch (error) {
        console.error('[NOTIFICATIONS_API] Error al marcar leída:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Error al actualizar estado de la notificación'
        });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {
        await MagnusNotification.update(
            { isRead: true, readAt: new Date() },
            { where: { isRead: false } }
        );

        return res.json({
            success: true,
            unreadCount: 0,
            message: 'Todas las notificaciones fueron marcadas como leídas'
        });
    } catch (error) {
        console.error('[NOTIFICATIONS_API] Error al marcar todas como leídas:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Error al marcar todas las notificaciones'
        });
    }
};
