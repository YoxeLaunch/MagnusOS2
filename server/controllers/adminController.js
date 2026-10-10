import { AdminAuditEvent, AuthSession, FxProviderHealth } from '../models/index.js';
import { jobObservability } from '../services/jobObservabilityService.js';
import { SystemUpdate } from '../models/system/index.js';
import { revokeSession } from '../services/sessionService.js';
import { writeAdminAudit } from '../services/adminAuditService.js';
import { getAuditRetentionStatus } from '../services/auditRetentionService.js';

export const getAuditEvents = async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '50', 10) || 50, 1), 200);
    try {
        const events = await AdminAuditEvent.findAll({ order: [['occurredAt', 'DESC']], limit });
        res.json({ events, limit, retention: await getAuditRetentionStatus() });
    } catch (error) {
        res.status(503).json({ error: 'Bitácora administrativa no disponible' });
    }
};

export const getJobs = async (_req, res) => {
    try {
        res.json(await jobObservability.getHealthTelemetry());
    } catch (_error) {
        res.status(503).json({ error: 'Telemetría de tareas no disponible' });
    }
};

export const getFxProviderHealth = async (_req, res) => {
    try {
        const rows = await FxProviderHealth.findAll({ order: [['timestamp', 'DESC']], limit: 200 });
        const providers = [];
        const seen = new Set();
        for (const row of rows) {
            const item = row.toJSON();
            if (seen.has(item.provider)) continue;
            seen.add(item.provider);
            providers.push({
                provider: item.provider, status: item.success ? 'HEALTHY' : 'ERROR', timestamp: item.timestamp,
                latencyMs: item.latencyMs, recordsReceived: item.recordsReceived, httpStatus: item.httpStatus,
                errorType: item.errorType, retryCount: item.retryCount, circuitState: item.circuitState
            });
        }
        res.json({ providers });
    } catch (_error) {
        res.status(503).json({ error: 'Telemetría de proveedores FX no disponible' });
    }
};

export const getAdminUpdates = async (_req, res) => {
    try {
        const updates = await SystemUpdate.findAll({ order: [['date', 'DESC'], ['createdAt', 'DESC']], limit: 100 });
        res.json({ updates });
    } catch (_error) {
        res.status(503).json({ error: 'Novedades no disponibles' });
    }
};

export const getSessions = async (_req, res) => {
    try {
        const sessions = await AuthSession.findAll({
            attributes: ['id', 'username', 'createdAt', 'expiresAt', 'revokedAt', 'revokedBy', 'userAgent'],
            order: [['createdAt', 'DESC']], limit: 200
        });
        res.json({ sessions });
    } catch (_error) {
        res.status(503).json({ error: 'Registro de sesiones no disponible' });
    }
};

export const revokeManagedSession = async (req, res) => {
    const { id } = req.params;
    if (id === req.user?.jti) return res.status(409).json({ error: 'No puedes revocar tu propia sesión desde este control.' });
    try {
        const [updated] = await revokeSession(id, req.user.username);
        if (!updated) return res.status(404).json({ error: 'Sesión no encontrada o ya revocada.' });
        await writeAdminAudit(req, { action: 'session.revoke', resourceType: 'auth_session', resourceId: id });
        res.json({ success: true });
    } catch (_error) {
        res.status(503).json({ error: 'No fue posible revocar la sesión.' });
    }
};
