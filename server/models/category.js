import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Category Model
 * For organizing transactions (Income, Expense subcategories)
 */
export const Category = sequelize.define('Category', {
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
    // Parent category group (e.g., "Food", "Transport", "Utilities")
    group: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
        defaultValue: 'expense'
    },
    // Icon name (from lucide-react)
    icon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Hex color
    color: {
        type: DataTypes.STRING(7),
        allowNull: true
    },
    isArchived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_archived'
    }
}, {
    tableName: 'categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'type'] }
    ]
});

/**
 * Payee Model
 * Stores merchants/payees for quick selection and autocomplete
 */
export const Payee = sequelize.define('Payee', {
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
    // Normalized name for matching (lowercase, no accents)
    normalizedName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'normalized_name'
    },
    // Default category for this payee
    defaultCategoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'default_category_id'
    }
}, {
    tableName: 'payees',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'normalized_name'] }
    ]
});

export default { Category, Payee };
