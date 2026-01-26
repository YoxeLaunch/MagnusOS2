import { DataTypes } from 'sequelize';
import { sequelizeSystem } from '../config/database.js';

export const Message = sequelizeSystem.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('public', 'private', 'system'),
        defaultValue: 'public'
    },
    fromUsername: {
        type: DataTypes.STRING,
        allowNull: false
        // Cross-DB FK not supported
    },
    toUsername: {
        type: DataTypes.STRING,
        allowNull: true
        // Cross-DB FK not supported
    },
    read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    replyTo: {
        type: DataTypes.TEXT, // Storing JSON or just ID/Text? Let's store JSON for easier display { id, text, username }
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'Messages',
    timestamps: true,
    updatedAt: false // We don't usually update messages
});
