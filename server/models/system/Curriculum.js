import { DataTypes } from 'sequelize';
import { sequelizeSystem } from '../../config/database.js';

export const CurriculumModule = sequelizeSystem.define('CurriculumModule', {
    id: { type: DataTypes.STRING, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    order: { type: DataTypes.INTEGER, defaultValue: 0 },
    mentor: { type: DataTypes.STRING },
    month: { type: DataTypes.STRING }
});

export const Mission = sequelizeSystem.define('Mission', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    text: { type: DataTypes.STRING, allowNull: false },
    week: { type: DataTypes.INTEGER, allowNull: false }, // Week number relative to module or general
    isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    moduleId: { type: DataTypes.STRING } // Foreign Key manually handled or via association
});

// Associations
CurriculumModule.hasMany(Mission, { foreignKey: 'moduleId', as: 'missions' });
Mission.belongsTo(CurriculumModule, { foreignKey: 'moduleId' });
