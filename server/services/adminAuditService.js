import crypto from 'crypto';
import { AdminAuditEvent } from '../models/index.js';

const sensitive = /password|secret|token|key|authorization|cookie/i;
const sanitize = (value) => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(sanitize);
    return Object.fromEntries(Object.entries(value)
        .filter(([key]) => !sensitive.test(key))
        .map(([key, item]) => [key, typeof item === 'object' ? sanitize(item) : item]));
};

export const writeAdminAudit = async (req, { action, resourceType, resourceId = null, outcome = 'success', reason = null, metadata = {} }) => {
    try {
        await AdminAuditEvent.create({
            actorUsername: req.user?.username || 'system', actorRole: req.user?.role || 'system',
            action, resourceType, resourceId, outcome, reason,
            correlationId: req.auditCorrelationId || crypto.randomUUID(), metadata: sanitize(metadata)
        });
    } catch (error) {
        // Audit failure must be visible, but must not turn a completed backup/refresh into a false failure.
        console.error('[ADMIN_AUDIT] Unable to persist event:', error.message);
    }
};
