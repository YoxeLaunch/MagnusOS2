import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const isPostgres = Boolean(process.env.DATABASE_URL);

export const AdminAuditEvent = sequelize.define('AdminAuditEvent', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'occurred_at' },
    actorUsername: { type: DataTypes.STRING(255), allowNull: false, field: 'actor_username' },
    actorRole: { type: DataTypes.STRING(50), allowNull: false, field: 'actor_role' },
    action: { type: DataTypes.STRING(100), allowNull: false },
    resourceType: { type: DataTypes.STRING(100), allowNull: false, field: 'resource_type' },
    resourceId: { type: DataTypes.STRING(255), field: 'resource_id' },
    outcome: { type: DataTypes.STRING(20), allowNull: false },
    correlationId: { type: DataTypes.UUID, allowNull: false, defaultValue: DataTypes.UUIDV4, field: 'correlation_id' },
    reason: { type: DataTypes.STRING(500) },
    metadata: isPostgres ? { type: DataTypes.JSONB, allowNull: false, defaultValue: {} } : { type: DataTypes.JSON, allowNull: false, defaultValue: {} }
}, { tableName: 'admin_audit_events', timestamps: false, indexes: [{ fields: ['occurred_at'] }, { fields: ['actor_username', 'occurred_at'] }] });
