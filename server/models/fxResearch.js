/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE MODELS
 * Persistence for econometric experiment registry, backtest metrics & forecasts
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FxResearchExperiment = sequelize.define('FxResearchExperiment', {
    id: {
        type: DataTypes.STRING(64),
        primaryKey: true
    },
    modelId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'model_id'
    },
    modelName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'model_name'
    },
    baseCurrency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'USD',
        field: 'base_currency'
    },
    quoteCurrency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'DOP',
        field: 'quote_currency'
    },
    sourceProvider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'bcrd',
        field: 'source_provider'
    },
    horizonDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'horizon_days'
    },
    trainStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'train_start_date'
    },
    trainEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'train_end_date'
    },
    testStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'test_start_date'
    },
    testEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'test_end_date'
    },
    observationsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'observations_count'
    },
    datasetHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: 'dataset_hash'
    },
    parameters: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    metrics: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    runtimeMs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'runtime_ms'
    },
    peakMemoryMb: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        defaultValue: 0.00,
        field: 'peak_memory_mb'
    }
}, {
    tableName: 'fx_research_experiments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { fields: ['model_id', 'base_currency'] },
        { fields: ['created_at'] }
    ]
});

export const FxResearchForecast = sequelize.define('FxResearchForecast', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    experimentId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: 'experiment_id'
    },
    targetDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'target_date'
    },
    horizon: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    actualValue: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        field: 'actual_value'
    },
    predictedValue: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: false,
        field: 'predicted_value'
    },
    lower95: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        field: 'lower_95'
    },
    upper95: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        field: 'upper_95'
    },
    error: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true
    },
    errorPct: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
        field: 'error_pct'
    }
}, {
    tableName: 'fx_research_forecasts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { fields: ['experiment_id', 'target_date'] }
    ]
});

FxResearchExperiment.hasMany(FxResearchForecast, { foreignKey: 'experimentId', as: 'forecasts', onDelete: 'CASCADE' });
FxResearchForecast.belongsTo(FxResearchExperiment, { foreignKey: 'experimentId', as: 'experiment' });
