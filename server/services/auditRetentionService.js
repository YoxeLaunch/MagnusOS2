import { Op } from 'sequelize';
import { AdminAuditEvent } from '../models/index.js';

const configuredDays = Number.parseInt(process.env.ADMIN_AUDIT_RETENTION_DAYS || '365', 10);
export const RETENTION_DAYS = Number.isFinite(configuredDays) && configuredDays >= 30 ? configuredDays : 365;

export const getAuditRetentionStatus = async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const eventsPastRetention = await AdminAuditEvent.count({ where: { occurredAt: { [Op.lt]: cutoff } } });
    return {
        retentionDays: RETENTION_DAYS,
        cutoff: cutoff.toISOString(),
        eventsPastRetention,
        autoPurgeEnabled: false,
        note: 'No se eliminan eventos automáticamente. Se requiere exportación verificable y procedimiento aprobado.'
    };
};
