import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, primaryKey: true },
    password: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, defaultValue: 'user' },
    // Storing arrays/objects as JSON strings for simplicity in SQLite
    // In Postgres we would use DataTypes.JSONB
    tags: {
        type: DataTypes.TEXT,
        get() {
            const rawValue = this.getDataValue('tags');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('tags', JSON.stringify(value));
        }
    },
    preferences: {
        type: DataTypes.TEXT,
        get() {
            const rawValue = this.getDataValue('preferences');
            return rawValue ? JSON.parse(rawValue) : {};
        },
        set(value) {
            this.setDataValue('preferences', JSON.stringify(value));
        }
    }
});
