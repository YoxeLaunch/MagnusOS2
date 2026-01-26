import { DataTypes } from 'sequelize';
import { sequelizeSystem } from '../../config/database.js';

export const SystemUpdate = sequelizeSystem.define('SystemUpdate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('feature', 'bugfix', 'announcement', 'improvement'),
        defaultValue: 'feature'
    },
    date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    version: {
        type: DataTypes.STRING,
        allowNull: true
    }
});
