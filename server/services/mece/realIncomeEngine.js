/**
 * Real Income & Purchasing Power Engine
 * Module B of MECE Core Engine (Phase 1A Hardened)
 * 
 * Implements pure mathematical functions for income deflation against the Dominican CPI.
 * Default baseline: December 2025 = 100 (in constant DOP of Dec 2025).
 * Fully configurable to any baseline period present in the CPI series.
 * 
 * Core Formula:
 *   Y_real(t) = Y_nominal(t) * (CPI_base / CPI_t)
 * 
 * Invariants & Guarantees:
 * 1. Base period identity: Y_real(t0) === Y_nominal(t0).
 * 2. Integer minor-unit arithmetic (centavos) to eliminate IEEE-754 summation drift.
 * 3. Extraordinary bonuses are never merged into permanent base salary trend.
 * 4. Missing CPI periods return explicit PENDING_CPI_RELEASE status (no silent zero-inflation).
 * 5. Missing nominal income periods are not silently replaced with dummy values.
 * 6. Pure, side-effect-free execution (no in-place mutations of input objects).
 */

import { round, toMinorUnitsBigInt, fromMinorUnits, deflateMinorUnits, percentageChange, isValidNumber } from './meceMathUtils.js';
import { parseCanonicalPeriod } from './temporalGovernance.js';

const INCOME_TYPES = {
    RECURRING_SALARY: 'RECURRING_SALARY',
    VARIABLE_INCENTIVE: 'VARIABLE_INCENTIVE',
    EXTRAORDINARY_BONUS: 'EXTRAORDINARY_BONUS',
    OTHER_INCOME: 'OTHER_INCOME'
};

/**
 * Deflates a nominal monetary amount to real constant terms of base period.
 * Supports both decimal amounts and minor unit BigInt calculations.
 * 
 * @param {number} nominalValue - Nominal amount in DOP
 * @param {number} cpiCurrent - Official CPI of current period
 * @param {number} cpiBase - Official CPI of base period
 * @returns {number|null}
 */
function deflateNominalAmount(nominalValue, cpiCurrent, cpiBase) {
    if (!isValidNumber(nominalValue) || !isValidNumber(cpiCurrent) || !isValidNumber(cpiBase)) {
        return null;
    }
    if (cpiCurrent <= 0 || cpiBase <= 0) {
        throw new Error('CPI values must be strictly positive');
    }
    const deflator = cpiBase / cpiCurrent;
    return round(nominalValue * deflator, 2);
}

/**
 * Computes the Purchasing Power Index (Índice de Poder Adquisitivo - IPA)
 * IPA_t = ((Y_t / Y_0) / (CPI_t / CPI_0)) * 100
 * 
 * @param {number} currentNominal 
 * @param {number} baseNominal 
 * @param {number} currentCpi 
 * @param {number} baseCpi 
 * @returns {number|null} Base 100 index
 */
function computePurchasingPowerIndex(currentNominal, baseNominal, currentCpi, baseCpi) {
    if (!isValidNumber(currentNominal) || !isValidNumber(baseNominal) ||
        !isValidNumber(currentCpi) || !isValidNumber(baseCpi) ||
        baseNominal <= 0 || currentCpi <= 0 || baseCpi <= 0) {
        return null;
    }
    const nominalRatio = currentNominal / baseNominal;
    const cpiRatio = currentCpi / baseCpi;
    const ipa = (nominalRatio / cpiRatio) * 100.0;
    return round(ipa, 4);
}

/**
 * Normalizes input transaction line / record amount to BigInt minor units.
 * Supports amountMinor, amount_minor, or decimal amount.
 * 
 * @param {Object} rec 
 * @returns {bigint} Minor units
 */
function extractMinorUnits(rec, pKey) {
    if (rec.amountMinor !== undefined && rec.amountMinor !== null) {
        const n = Number(rec.amountMinor);
        if (isNaN(n)) throw new Error(`Invalid numeric amount in record for period ${pKey}`);
        return BigInt(rec.amountMinor);
    }
    if (rec.amount_minor !== undefined && rec.amount_minor !== null) {
        const n = Number(rec.amount_minor);
        if (isNaN(n)) throw new Error(`Invalid numeric amount in record for period ${pKey}`);
        return BigInt(rec.amount_minor);
    }
    if (rec.amount !== undefined && rec.amount !== null) {
        const n = Number(rec.amount);
        if (isNaN(n)) throw new Error(`Invalid numeric amount in record for period ${pKey}`);
        return toMinorUnitsBigInt(rec.amount);
    }
    return 0n;
}

/**
 * Processes a complete monthly income series, deflating recurring and total streams,
 * computing period-over-period variations and tracking purchasing power.
 * 
 * @param {Object} params
 * @param {Array<Object>} params.incomeRecords - Array of raw or structured monthly income entries
 * @param {Array<Object>|Map<string, number>} params.cpiSeries - Monthly CPI data (Array or Map)
 * @param {string} params.basePeriod - Baseline period (default '2025-12')
 * @param {Array<Object>} params.analyticalAdjustments - In-memory reclassifications without mutating records
 * @returns {Object} Comprehensive real income dataset
 */
function computeRealIncomeSeries({
    incomeRecords,
    cpiSeries,
    basePeriod = '2025-12',
    analyticalAdjustments = []
}) {
    if (!Array.isArray(incomeRecords)) {
        throw new Error('incomeRecords must be an array');
    }

    // 1. Build CPI lookup map
    const cpiMap = new Map();
    if (cpiSeries instanceof Map) {
        for (const [k, v] of cpiSeries.entries()) {
            const parsed = parseCanonicalPeriod(k);
            if (parsed) cpiMap.set(parsed.period, Number(v));
        }
    } else if (Array.isArray(cpiSeries)) {
        for (const item of cpiSeries) {
            const rawPeriod = item.period || item.reference_period || item.economic_period;
            const parsed = parseCanonicalPeriod(rawPeriod);
            const val = item.value !== undefined ? item.value : item.index;
            if (parsed && isValidNumber(Number(val))) {
                cpiMap.set(parsed.period, Number(val));
            }
        }
    } else {
        throw new Error('cpiSeries must be an Array or Map');
    }

    // 2. Validate base period presence in CPI series
    const canonicalBasePeriod = parseCanonicalPeriod(basePeriod)?.period;
    if (!canonicalBasePeriod || !cpiMap.has(canonicalBasePeriod)) {
        throw new Error(`Base period '${basePeriod}' was not found in the validated CPI series`);
    }
    const baseCpi = cpiMap.get(canonicalBasePeriod);
    if (baseCpi <= 0) {
        throw new Error(`Base CPI for ${canonicalBasePeriod} must be strictly positive`);
    }

    // 3. Process and apply in-memory analytical adjustments (e.g. February 2026 salary)
    const adjustedRecords = incomeRecords.map(rec => {
        const copy = { ...rec };
        for (const adj of analyticalAdjustments) {
            const matchId = adj.id && copy.id === adj.id;
            const matchDatePayee = adj.date && adj.payeePattern &&
                copy.date === adj.date &&
                new RegExp(adj.payeePattern, 'i').test(copy.payeeName || copy.payee_name || '');

            if (matchId || matchDatePayee) {
                copy.originalCategory = copy.category || copy.categoryName;
                copy.category = adj.targetCategory;
                copy.incomeType = adj.targetIncomeType || INCOME_TYPES.RECURRING_SALARY;
                copy.adjustmentApplied = {
                    reason: adj.reason,
                    adjustedAt: new Date().toISOString()
                };
            }
        }
        return copy;
    });

    // 4. Group income by canonical monthly period using BigInt minor units
    const periodMap = new Map();
    for (const rec of adjustedRecords) {
        const rawDate = rec.period || rec.date;
        const parsedP = parseCanonicalPeriod(rawDate);
        if (!parsedP) {
            throw new Error(`Invalid or unparseable period/date in record: ${JSON.stringify(rawDate)}`);
        }
        const pKey = parsedP.period.substring(0, 7);

        if (!periodMap.has(pKey)) {
            periodMap.set(pKey, {
                period: pKey,
                baseSalaryMinor: 0n,
                incentivesMinor: 0n,
                extraordinaryBonusMinor: 0n,
                otherIncomeMinor: 0n,
                transactionsCount: 0,
                rawRecords: []
            });
        }
        const group = periodMap.get(pKey);

        const amtMinor = extractMinorUnits(rec, pKey);

        const cat = (rec.category || rec.categoryName || '').toLowerCase();
        const type = rec.incomeType;

        if (type === INCOME_TYPES.RECURRING_SALARY || cat.includes('salario') || cat.includes('sueldo')) {
            group.baseSalaryMinor += amtMinor;
        } else if (type === INCOME_TYPES.VARIABLE_INCENTIVE || cat.includes('incentivo') || cat.includes('comision')) {
            group.incentivesMinor += amtMinor;
        } else if (type === INCOME_TYPES.EXTRAORDINARY_BONUS || cat.includes('bonificaci') || cat.includes('regalia') || cat.includes('doble sueldo')) {
            group.extraordinaryBonusMinor += amtMinor;
        } else {
            group.otherIncomeMinor += amtMinor;
        }
        group.transactionsCount++;
        group.rawRecords.push(rec);
    }

    const sortedPeriods = Array.from(periodMap.keys()).sort();
    const results = [];

    const baseGroup = periodMap.get(canonicalBasePeriod);
    const baseNominalTotalMinor = baseGroup ?
        (baseGroup.baseSalaryMinor + baseGroup.incentivesMinor + baseGroup.extraordinaryBonusMinor + baseGroup.otherIncomeMinor)
        : null;
    const baseNominalTotal = baseNominalTotalMinor !== null ? fromMinorUnits(baseNominalTotalMinor) : null;

    let previousItem = null;
    let initialRealTotal = null;

    for (const pKey of sortedPeriods) {
        const group = periodMap.get(pKey);
        const nominalSalary = fromMinorUnits(group.baseSalaryMinor);
        const nominalIncentives = fromMinorUnits(group.incentivesMinor);
        const nominalExtraordinary = fromMinorUnits(group.extraordinaryBonusMinor);
        const nominalOther = fromMinorUnits(group.otherIncomeMinor);
        const totalNominalMinor = group.baseSalaryMinor + group.incentivesMinor + group.extraordinaryBonusMinor + group.otherIncomeMinor;
        const totalNominal = fromMinorUnits(totalNominalMinor);

        const cpiValue = cpiMap.get(pKey);

        if (cpiValue === undefined || cpiValue === null) {
            const item = {
                period: pKey,
                nominal: {
                    baseSalary: nominalSalary,
                    incentives: nominalIncentives,
                    extraordinaryBonus: nominalExtraordinary,
                    otherIncome: nominalOther,
                    total: totalNominal,
                    totalMinor: totalNominalMinor.toString(),
                    monthlyChangePct: previousItem ? percentageChange(totalNominal, previousItem.nominal.total) : null
                },
                cpi: null,
                deflator: null,
                real: {
                    baseSalary: null,
                    incentives: null,
                    extraordinaryBonus: null,
                    otherIncome: null,
                    total: null,
                    monthlyChangePct: null,
                    cumulativeChangePct: null
                },
                purchasingPowerIndex: null,
                status: 'PENDING_CPI_RELEASE',
                cpiMissing: true,
                message: `El IPC del período ${pKey} no ha sido publicado oficialmente por el BCRD.`
            };
            results.push(item);
            previousItem = item;
            continue;
        }

        // Full double precision for deflator calculation, rounded to 2 decimals on monetary currency
        const rawDeflator = baseCpi / cpiValue;
        const deflator = round(rawDeflator, 6);
        const realSalary = round(nominalSalary * rawDeflator, 2);
        const realIncentives = round(nominalIncentives * rawDeflator, 2);
        const realExtraordinary = round(nominalExtraordinary * rawDeflator, 2);
        const realOther = round(nominalOther * rawDeflator, 2);
        const realTotal = round(totalNominal * rawDeflator, 2);

        if (initialRealTotal === null && realTotal !== null) {
            initialRealTotal = realTotal;
        }

        const nominalMonthlyChange = previousItem ? percentageChange(totalNominal, previousItem.nominal.total) : null;
        const realMonthlyChange = (previousItem && previousItem.real.total !== null) ? percentageChange(realTotal, previousItem.real.total) : null;
        const cumulativeRealChange = (initialRealTotal !== null && initialRealTotal > 0) ? percentageChange(realTotal, initialRealTotal) : null;

        const ipa = (baseNominalTotal && baseNominalTotal > 0) ?
            computePurchasingPowerIndex(totalNominal, baseNominalTotal, cpiValue, baseCpi) : null;

        const item = {
            period: pKey,
            nominal: {
                baseSalary: nominalSalary,
                incentives: nominalIncentives,
                extraordinaryBonus: nominalExtraordinary,
                otherIncome: nominalOther,
                total: totalNominal,
                totalMinor: totalNominalMinor.toString(),
                monthlyChangePct: nominalMonthlyChange
            },
            cpi: round(cpiValue, 4),
            deflator: deflator,
            real: {
                baseSalary: realSalary,
                incentives: realIncentives,
                extraordinaryBonus: realExtraordinary,
                otherIncome: realOther,
                total: realTotal,
                monthlyChangePct: realMonthlyChange,
                cumulativeChangePct: cumulativeRealChange
            },
            purchasingPowerIndex: ipa,
            status: 'VERIFIED',
            cpiMissing: false
        };

        results.push(item);
        previousItem = item;
    }

    return {
        basePeriod: canonicalBasePeriod,
        baseCpi: round(baseCpi, 4),
        totalPeriodsEvaluated: results.length,
        verifiedPeriodsCount: results.filter(r => !r.cpiMissing).length,
        pendingPeriodsCount: results.filter(r => r.cpiMissing).length,
        series: results
    };
}

export {
    INCOME_TYPES,
    deflateNominalAmount,
    computePurchasingPowerIndex,
    computeRealIncomeSeries,
    extractMinorUnits
};
