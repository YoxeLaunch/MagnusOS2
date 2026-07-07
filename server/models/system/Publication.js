import { DataTypes } from 'sequelize';
import { sequelizeSystem } from '../../config/database.js';

/**
 * Publicaciones del blog de Mentoría.
 * Solo el soberano/admin crea y edita; el resto de usuarios las lee.
 * attachments: [{ url, name, mimeType, size }] — imágenes y PDFs subidos.
 */
export const Publication = sequelizeSystem.define('Publication', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    attachments: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});
