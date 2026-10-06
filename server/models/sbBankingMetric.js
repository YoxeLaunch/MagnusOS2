/**
 * ============================================================================
 * SUPERINTENDENCIA DE BANCOS (SB) // BANKING METRICS MODEL
 * Captaciones, tasas pasivas ponderadas y telemetría de sincronización mensual
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SbBankingMetric = sequelize.define('SbBankingMetric', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    periodo: {
        type: DataTypes.STRING(7),
        allowNull: false
    },
    tipoEntidad: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'tipo_entidad'
    },
    entidad: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    region: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    provincia: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    codigoIso: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'codigo_iso'
    },
    persona: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    divisa: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    currencyIso: {
        type: DataTypes.STRING(5),
        allowNull: false,
        field: 'currency_iso'
    },
    cantidadInstrumentos: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: 'cantidad_instrumentos'
    },
    balance: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        defaultValue: 0
    },
    tasaPonderadaBalance: {
        type: DataTypes.DECIMAL(28, 4),
        allowNull: false,
        defaultValue: 0,
        field: 'tasa_ponderada_balance'
    },
    tasaPonderada: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 0,
        field: 'tasa_ponderada'
    },
    retrievedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'retrieved_at'
    }
}, {
    tableName: 'sb_banking_metrics',
    timestamps: true,
    underscored: true
});

export const SbSyncRun = sequelize.define('SbSyncRun', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    periodo: {
        type: DataTypes.STRING(7),
        allowNull: false
    },
    entityType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'entity_type'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false // 'SUCCESS', 'FAILED', 'EMPTY', 'PARTIAL'
    },
    recordsReceived: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'records_received'
    },
    recordsInserted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'records_inserted'
    },
    recordsUpdated: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'records_updated'
    },
    recordsUnchanged: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'records_unchanged'
    },
    durationMs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'duration_ms'
    },
    activeKeyUsed: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PRIMARY',
        field: 'active_key_used'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'error_message'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    executedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'executed_at'
    }
}, {
    tableName: 'sb_sync_runs',
    timestamps: false,
    underscored: true
});
