import { DataTypes } from 'sequelize';
import { sequelizeSystem } from '../config/database.js';

// Model to link Telegram chat IDs with Magnus usernames
export const TelegramLink = sequelizeSystem.define('TelegramLink', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    chatId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    linkedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'telegram_links',
    timestamps: false
});

export default TelegramLink;
