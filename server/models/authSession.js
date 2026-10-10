import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AuthSession = sequelize.define('AuthSession', {
    id: { type: DataTypes.UUID, primaryKey: true },
    username: { type: DataTypes.STRING(255), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    revokedAt: { type: DataTypes.DATE, field: 'revoked_at' },
    revokedBy: { type: DataTypes.STRING(255), field: 'revoked_by' },
    userAgent: { type: DataTypes.STRING(500), field: 'user_agent' },
    ipHash: { type: DataTypes.STRING(64), field: 'ip_hash' }
}, { tableName: 'auth_sessions', timestamps: false, indexes: [{ fields: ['username', 'created_at'] }] });
