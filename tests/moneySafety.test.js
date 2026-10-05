import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    toMinorBigInt,
    minorToSafeNumber,
    parseDecimalToSafeNumber,
    formatSafeMoney,
    MAX_SAFE_MINOR,
    MIN_SAFE_MINOR
} from '../src/apps/finanza/utils/moneySafety.js';

describe('Frontend BIGINT Money Safety & Adversarial Edge Cases', () => {

    it('1. toMinorBigInt handles zero, negative, whole and decimal strings', () => {
        assert.equal(toMinorBigInt(0), 0n);
        assert.equal(toMinorBigInt('0'), 0n);
        assert.equal(toMinorBigInt(null), 0n);
        assert.equal(toMinorBigInt(undefined), 0n);
        assert.equal(toMinorBigInt(''), 0n);

        assert.equal(toMinorBigInt(150), 15000n);
        assert.equal(toMinorBigInt(150.25), 15025n);
        assert.equal(toMinorBigInt('150.25'), 15025n);
        assert.equal(toMinorBigInt('-150.25'), -15025n);
        assert.equal(toMinorBigInt('5000'), 5000n); // already minor integer string
        assert.equal(toMinorBigInt(5000n), 5000n);
    });

    it('2. toMinorBigInt rejects NaN, Infinity, and invalid string formats', () => {
        assert.throws(() => toMinorBigInt(NaN), /Invalid non-finite number/);
        assert.throws(() => toMinorBigInt(Infinity), /Invalid non-finite number/);
        assert.throws(() => toMinorBigInt('invalid_money'), /Cannot parse 'invalid_money'/);
    });

    it('3. minorToSafeNumber succeeds within MAX_SAFE_INTEGER boundary', () => {
        // Exactly at MAX_SAFE_MINOR
        const maxVal = minorToSafeNumber(MAX_SAFE_MINOR, 'testMax');
        assert.equal(maxVal, Number(MAX_SAFE_MINOR) / 100);

        // Exactly at MIN_SAFE_MINOR
        const minVal = minorToSafeNumber(MIN_SAFE_MINOR, 'testMin');
        assert.equal(minVal, Number(MIN_SAFE_MINOR) / 100);

        // Typical transactions
        assert.equal(minorToSafeNumber(15000n), 150.00);
        assert.equal(minorToSafeNumber(-25050n), -250.50);
        assert.equal(minorToSafeNumber('5000000'), 50000.00);
    });

    it('4. minorToSafeNumber throws RangeError if minor exceeds MAX_SAFE_INTEGER', () => {
        const unsafeAbove = MAX_SAFE_MINOR + 1n;
        assert.throws(() => {
            minorToSafeNumber(unsafeAbove, 'adversarialOverflow');
        }, (err) => {
            assert.ok(err instanceof RangeError);
            assert.match(err.message, /exceeds Number.MAX_SAFE_INTEGER/);
            return true;
        });

        const unsafeBelow = MIN_SAFE_MINOR - 1n;
        assert.throws(() => {
            minorToSafeNumber(unsafeBelow, 'adversarialUnderflow');
        }, (err) => {
            assert.ok(err instanceof RangeError);
            assert.match(err.message, /exceeds Number.MAX_SAFE_INTEGER/);
            return true;
        });
    });

    it('5. parseDecimalToSafeNumber parses decimal numbers and strings safely', () => {
        assert.equal(parseDecimalToSafeNumber('123.45'), 123.45);
        assert.equal(parseDecimalToSafeNumber('-123.45'), -123.45);
        assert.equal(parseDecimalToSafeNumber(100.50), 100.50);
        assert.equal(parseDecimalToSafeNumber(null), 0);
        assert.equal(parseDecimalToSafeNumber(undefined), 0);
    });

    it('6. formatSafeMoney formats safely across currency codes', () => {
        const formattedDop = formatSafeMoney(150.25, 'DOP');
        assert.ok(formattedDop.includes('150.25'));

        const formattedFromMinor = formatSafeMoney(15025n, 'DOP', true);
        assert.ok(formattedFromMinor.includes('150.25'));
    });
});
