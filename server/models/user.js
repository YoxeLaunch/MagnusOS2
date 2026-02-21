import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const isPostgres = !!process.env.DATABASE_URL;

export const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, primaryKey: true },
    password: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, defaultValue: 'user' },
    // PostgreSQL: JSONB nativo (requiere migrar con migrate-jsonb.js si hay datos previos)
    // SQLite fallback: TEXT con parse/stringify manual
    tags: isPostgres
        ? { type: DataTypes.JSONB, defaultValue: [] }
        : {
            type: DataTypes.TEXT,
            get() {
                const raw = this.getDataValue('tags');
                return raw ? JSON.parse(raw) : [];
            },
            set(value) {
                this.setDataValue('tags', JSON.stringify(value));
            }
        },
    preferences: isPostgres
        ? { type: DataTypes.JSONB, defaultValue: {} }
        : {
            type: DataTypes.TEXT,
            get() {
                const raw = this.getDataValue('preferences');
                return raw ? JSON.parse(raw) : {};
            },
            set(value) {
                this.setDataValue('preferences', JSON.stringify(value));
            }
        }
});
