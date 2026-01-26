import { DataTypes } from 'sequelize';

export const createAppSettingsModel = (sequelize) => {
    const AppSettings = sequelize.define('AppSettings', {
        key: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'app_settings',
        timestamps: true
    });

    return AppSettings;
};
