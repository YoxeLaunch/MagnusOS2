import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const normalizeRate = (value) => {
    const raw = String(value ?? '').trim();
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(raw)) throw new TypeError(`Invalid exact FX rate: ${raw}`);
    const negative = raw.startsWith('-');
    const [integerRaw, fractionRaw = ''] = raw.replace(/^[+-]/, '').split('.');
    let scaled = BigInt(integerRaw) * 1_000_000n + BigInt((fractionRaw.slice(0, 6) || '0').padEnd(6, '0'));
    if ((fractionRaw[6] || '0') >= '5') scaled += 1n;
    if (negative) scaled = -scaled;
    if (scaled <= -1_000_000_000_000n || scaled >= 1_000_000_000_000n) {
        throw new RangeError('FX rate exceeds NUMERIC(12,6) range');
    }
    const absolute = scaled < 0n ? -scaled : scaled;
    return `${scaled < 0n ? '-' : ''}${absolute / 1_000_000n}.${(absolute % 1_000_000n).toString().padStart(6, '0')}`;
};

const includeField = (options, field) => {
    if (Array.isArray(options?.fields) && !options.fields.includes(field)) options.fields.push(field);
};

const syncRatePair = (instance, options) => {
    const rateChanged = instance.isNewRecord ? instance.getDataValue('rate') !== undefined : instance.changed('rate');
    const exactChanged = instance.isNewRecord
        ? instance.getDataValue('rateExact') !== undefined && instance.getDataValue('rateExact') !== null
        : instance.changed('rateExact');
    if (rateChanged && exactChanged) {
        if (normalizeRate(instance.getDataValue('rate')) !== normalizeRate(instance.getDataValue('rateExact'))) {
            throw new Error('rate and rateExact disagree');
        }
    } else if (rateChanged) {
        instance.setDataValue('rateExact', normalizeRate(instance.getDataValue('rate')));
        includeField(options, 'rateExact');
    } else if (exactChanged) {
        const exact = normalizeRate(instance.getDataValue('rateExact'));
        instance.setDataValue('rateExact', exact);
        instance.setDataValue('rate', Number(exact));
        includeField(options, 'rate');
    }
};

export const CurrencyHistory = sequelize.define('CurrencyHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    rate: { type: DataTypes.FLOAT, allowNull: false },
    rateExact: { type: DataTypes.DECIMAL(12, 6), allowNull: false, field: 'rate_exact' }
}, {
    hooks: {
        beforeValidate: syncRatePair
    }
});
