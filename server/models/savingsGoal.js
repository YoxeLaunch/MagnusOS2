import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * SavingsGoal Model
 * Represents a savings target with progress tracking
 */
export const SavingsGoal = sequelize.define('SavingsGoal', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'user_id'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Target amount in minor units (centavos)
    targetAmountMinor: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'target_amount_minor'
    },
    // Current saved amount (cached, calculated from linked account or contributions)
    currentAmountMinor: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: 'current_amount_minor'
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'DOP'
    },
    // Target date to reach goal
    targetDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'target_date'
    },
    // Optional: Link to a specific savings account
    linkedAccountId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'linked_account_id'
    },
    // Goal status
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
    },
    isCompleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_completed'
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at'
    },
    // Icon and color for display
    icon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    color: {
        type: DataTypes.STRING(7),
        allowNull: true
    },
    // Notes
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'savings_goals',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'is_active'] },
        { fields: ['linked_account_id'] }
    ]
});

/**
 * SavingsContribution Model
 * Tracks contributions to a savings goal (when not using linked account)
 */
export const SavingsContribution = sequelize.define('SavingsContribution', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    goalId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'goal_id'
    },
    // Link to the ledger transaction that represents this contribution
    transactionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'transaction_id'
    },
    amountMinor: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'amount_minor'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    notes: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'savings_contributions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['goal_id'] },
        { fields: ['transaction_id'] }
    ]
});

// ========================================
// Associations
// ========================================
SavingsGoal.hasMany(SavingsContribution, {
    foreignKey: 'goal_id',
    as: 'contributions',
    onDelete: 'CASCADE'
});

SavingsContribution.belongsTo(SavingsGoal, {
    foreignKey: 'goal_id',
    as: 'goal'
});

export default { SavingsGoal, SavingsContribution };
