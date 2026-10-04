/**
 * moneySafety.js — Exact BigInt money parsing and safe display conversions in frontend and backend.
 * Enforces strict Number.isSafeInteger guards before converting centavos/cents to Number.
 */

export const MAX_SAFE_MINOR = BigInt(Number.MAX_SAFE_INTEGER); // 9,007,199,254,740,991
export const MIN_SAFE_MINOR = BigInt(Number.MIN_SAFE_INTEGER); // -9,007,199,254,740,991

/**
 * Parses any monetary input (BigInt, string, number) into a bigint of minor units (cents).
 * @param {string | number | bigint | null | undefined} val
 * @returns {bigint}
 */
export function toMinorBigInt(val) {
    if (val === null || val === undefined || val === '') return 0n;
    if (typeof val === 'bigint') return val;
    if (typeof val === 'number') {
        if (!Number.isFinite(val)) throw new TypeError(`[moneySafety] Invalid non-finite number: ${val}`);
        return BigInt(Math.round(val * 100));
    }
    const str = String(val).trim();
    if (!str) return 0n;

    // Check if integer minor units string
    if (/^-?\d+$/.test(str)) {
        return BigInt(str);
    }

    // Check if decimal string like "123.45"
    if (/^-?\d+\.\d{1,2}$/.test(str)) {
        const parts = str.split('.');
        const sign = str.startsWith('-') ? -1n : 1n;
        const wholeStr = parts[0].replace('-', '');
        const decStr = parts[1].padEnd(2, '0').slice(0, 2);
        return sign * (BigInt(wholeStr) * 100n + BigInt(decStr));
    }

    const parsed = Number(str);
    if (!Number.isFinite(parsed)) throw new TypeError(`[moneySafety] Cannot parse '${str}' into money`);
    return BigInt(Math.round(parsed * 100));
}

/**
 * Converts minor units (cents) to a safe JavaScript Number for display and charts.
 * Throws RangeError if minor units exceed Number.MAX_SAFE_INTEGER.
 * @param {string | number | bigint | null | undefined} minorVal
 * @param {string} [context='display']
 * @returns {number}
 */
export function minorToSafeNumber(minorVal, context = 'display') {
    if (minorVal === null || minorVal === undefined || minorVal === '') return 0;
    let minor;
    if (typeof minorVal === 'bigint') {
        minor = minorVal;
    } else if (typeof minorVal === 'string' && /^-?\d+$/.test(minorVal.trim())) {
        minor = BigInt(minorVal.trim());
    } else {
        minor = toMinorBigInt(minorVal);
    }

    if (minor > MAX_SAFE_MINOR || minor < MIN_SAFE_MINOR) {
        throw new RangeError(
            `[moneySafety] Exact amount ${minor.toString()} in ${context} exceeds Number.MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}). Cannot convert without loss of precision.`
        );
    }

    return Number(minor) / 100;
}

/**
 * Parses a decimal string (like "150.00" or from API response) to safe Number with guard.
 * @param {string | number | bigint | null | undefined} val
 * @param {string} [context='display']
 * @returns {number}
 */
export function parseDecimalToSafeNumber(val, context = 'display') {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') {
        if (!Number.isFinite(val)) throw new TypeError(`[moneySafety] Non-finite number in ${context}: ${val}`);
        return val;
    }
    const minor = toMinorBigInt(val);
    return minorToSafeNumber(minor, context);
}

/**
 * Safe currency formatter that accepts BigInt minor units, string, or number.
 * @param {string | number | bigint | null | undefined} amountOrMinor
 * @param {string} [currency='DOP']
 * @param {boolean} [isMinor=false]
 * @returns {string}
 */
export function formatSafeMoney(
    amountOrMinor,
    currency = 'DOP',
    isMinor = false
) {
    const val = isMinor ? minorToSafeNumber(amountOrMinor) : (typeof amountOrMinor === 'number' ? amountOrMinor : parseDecimalToSafeNumber(amountOrMinor));
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
}
