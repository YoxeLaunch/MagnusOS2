import { DataTypes } from 'sequelize';
import { sequelizeSystem } from '../config/database.js';

export const UserChecklist = sequelizeSystem.define('UserChecklist', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    text: { type: DataTypes.STRING, allowNull: false },
    completed: { type: DataTypes.BOOLEAN, defaultValue: false }
});

export const UserCalendar = sequelizeSystem.define('UserCalendar', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false }, // YYYY-MM-DD
    value: { type: DataTypes.STRING } // The note/event text
});
