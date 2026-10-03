/**
 * ============================================================================
 * MAGNUS EVENT & NOTIFICATION MODELS (SEQUELIZE)
 * Detección de publicaciones y eventos macroeconómicos/cambiarios
 * Persistencia para Centro de Notificaciones no invasivo
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MagnusEvent = sequelize.define('MagnusEvent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    eventType: {
        type: DataTypes.STRING(50),
        allowNull: false, // 'NEW_PUBLICATION' | 'VALUE_CHANGE' | 'RELEVANT_CHANGE' | 'ANOMALY'
        field: 'event_type'
    },
    domain: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'MACRO_RD', // 'MACRO_RD' | 'PROVIDENCE_FX' | 'MARKETS'
        field: 'domain'
    },
    indicatorId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'indicator_id'
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    severity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'INFO'
    },
    referencePeriod: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'reference_period'
    },
    valueBefore: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'value_before'
    },
    valueAfter: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'value_after'
    },
    delta: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    idempotencyKey: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        field: 'idempotency_key'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'magnus_events',
    timestamps: true,
    underscored: true
});

export const MagnusNotification = sequelize.define('MagnusNotification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    eventId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'event_id'
    },
    userId: {
        type: DataTypes.STRING(50),
        allowNull: true, // null = broadcast para todos los usuarios
        field: 'user_id'
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    severity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'INFO' // 'INFO' | 'WATCH' | 'IMPORTANT' | 'CRITICAL'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_read'
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'read_at'
    },
    linkUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: '/finanza/mercado',
        field: 'link_url'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'magnus_notifications',
    timestamps: true,
    underscored: true
});
