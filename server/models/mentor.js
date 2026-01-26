import { DataTypes } from 'sequelize';
import { sequelizeSystem } from '../config/database.js';

export const Mentor = sequelizeSystem.define('Mentor', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING },
    image: { type: DataTypes.STRING },
    quotes: {
        type: DataTypes.TEXT,
        get() {
            const rawValue = this.getDataValue('quotes');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('quotes', JSON.stringify(value));
        }
    },
    startDate: { type: DataTypes.DATE },
    endDate: { type: DataTypes.DATE }
});
