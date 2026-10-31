/**
 * Financial & Mathematical Utilities for MECE Core Engine (Phase 1A Hardened)
 * 
 * Provides deterministic decimal-safe arithmetic, BigInt/integer minor units (centavos),
 * percentage calculations, and symmetrical half-up rounding rules to avoid floating-point
 * drift in financial operations.
 */

/**
 * Rounds a number to a fixed number of decimal places using standard half-up rounding.
 * Avoids JavaScript floating-point anomalies (e.g. 1.005.toFixed(2) === "1.00").
 * 
 * @param {number} value - Numeric value to round
 * @param {number} decimals - Number of decimal places (default 2 for currency, 4 for rates/indexes, 6 for deflators)
 * @returns {number|null} Deterministic rounded number
 */
function round(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) {
        return null;
    }
    const factor = Math.pow(10, decimals);
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Converts a decimal currency amount to integer minor units (centavos: 1 DOP = 100 centavos).
 * Uses exact Math.round to eliminate IEEE-754 precision artifacts.
 * 
 * @param {number|string} amount - Decimal currency amount (e.g. 150.25)
 * @returns {number} Integer minor units (e.g. 15025)
 */
function toMinorUnits(amount) {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return 0;
    return Math.round(Number(amount) * 100);
}

/**
 * Converts a decimal currency amount to BigInt minor units.
 * 
 * @param {number|string|bigint} amount 
 * @returns {bigint}
 */
function toMinorUnitsBigInt(amount) {
    if (typeof amount === 'bigint') return amount;
    if (amount === null || amount === undefined || isNaN(Number(amount))) return 0n;
    return BigInt(Math.round(Number(amount) * 100));
}

/**
 * Converts integer minor units (centavos) to decimal currency.
 * 
 * @param {number|bigint} minorUnits 
 * @returns {number} Decimal currency (e.g. 15025 -> 150.25)
 */
function fromMinorUnits(minorUnits) {
    if (minorUnits === null || minorUnits === undefined) return 0.0;
    const num = typeof minorUnits === 'bigint' ? Number(minorUnits) : minorUnits;
    return round(num / 100, 2);
}

/**
 * Exact integer deflation: converts nominal minor units to deflated real minor units.
 * Formula: round(nominalMinor * (cpiBase / cpiCurrent))
 * 
 * @param {bigint|number} nominalMinor 
 * @param {number} cpiCurrent 
 * @param {number} cpiBase 
 * @returns {bigint} Deflated minor units as BigInt
 */
function deflateMinorUnits(nominalMinor, cpiCurrent, cpiBase) {
    if (cpiCurrent <= 0 || cpiBase <= 0) {
        throw new Error('CPI values must be strictly positive');
    }
    const numNominal = typeof nominalMinor === 'bigint' ? Number(nominalMinor) : nominalMinor;
    const deflated = Math.round(numNominal * (cpiBase / cpiCurrent));
    return BigInt(deflated);
}

/**
 * Computes percentage variation between two values: ((current / previous) - 1) * 100
 * Handles zero and negative values safely.
 * 
 * @param {number} current - Current period value
 * @param {number} previous - Previous period value
 * @param {number} decimals - Precision for output percentage (default 4)
 * @returns {number|null} Percentage change or null if previous is zero/invalid
 */
function percentageChange(current, previous, decimals = 4) {
    if (previous === null || previous === undefined || current === null || current === undefined) {
        return null;
    }
    const prev = Number(previous);
    const curr = Number(current);
    if (isNaN(prev) || isNaN(curr) || prev === 0) {
        return null;
    }
    const pct = ((curr / prev) - 1.0) * 100.0;
    return round(pct, decimals);
}

/**
 * Safe division with zero check.
 * 
 * @param {number} numerator 
 * @param {number} denominator 
 * @param {number} decimals 
 * @returns {number|null}
 */
function safeDivide(numerator, denominator, decimals = 6) {
    if (denominator === 0 || denominator === null || denominator === undefined || isNaN(denominator)) {
        return null;
    }
    if (numerator === null || numerator === undefined || isNaN(numerator)) {
        return null;
    }
    return round(Number(numerator) / Number(denominator), decimals);
}

/**
 * Validates that an input is a finite numeric value.
 * 
 * @param {*} val 
 * @returns {boolean}
 */
function isValidNumber(val) {
    return val !== null && val !== undefined && typeof val === 'number' && Number.isFinite(val);
}

/**
 * Safely serializes an object to JSON, automatically converting any raw BigInt
 * values to strings to prevent 'TypeError: Do not know how to serialize a BigInt'.
 * 
 * @param {*} data 
 * @param {number} [space] 
 * @returns {string} Safe JSON string
 */
function safeJsonStringify(data, space = 0) {
    return JSON.stringify(data, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }, space);
}

/**
 * Safely parses a JSON string.
 * 
 * @param {string} jsonString 
 * @returns {*}
 */
function safeJsonParse(jsonString) {
    return JSON.parse(jsonString);
}

export {
    round,
    toMinorUnits,
    toMinorUnitsBigInt,
    fromMinorUnits,
    deflateMinorUnits,
    percentageChange,
    safeDivide,
    isValidNumber,
    safeJsonStringify,
    safeJsonParse
};
