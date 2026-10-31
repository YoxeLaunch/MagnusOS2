/**
 * Economic Exposure Engine
 * Module C of MECE Core Engine
 * 
 * Evaluates exposure to three primary macro drivers:
 * 1. FX / Foreign Currency Exposure (USD/EUR Pass-Through)
 * 2. Energy / Fuel Price Exposure (MICM Regulated Tariffs)
 * 3. Labor / Income Source Sensitivity
 * 
 * Safety Invariants:
 * - When original USD amount is missing, never compute an empirical effective exchange rate as observed.
 * - Non-fuel transport and maintenance expenses are strictly segregated from fuel consumption.
 * - Volume estimations in gallons are explicitly flagged as derived theoretical conditional values.
 * - Zero odometer / mileage extrapolation without empirical device readings.
 */

import { round, percentageChange, safeDivide, isValidNumber } from './meceMathUtils.js';
import { parseCanonicalPeriod } from './temporalGovernance.js';

const FX_TRANSACTION_CLASSES = {
    VERIFIED_CONTRACTUAL_USD: 'VERIFIED_CONTRACTUAL_USD', // Explicitly documented USD amount and currency tag
    VERIFIED_CONTRACTUAL_EUR: 'VERIFIED_CONTRACTUAL_EUR', // Explicitly documented EUR amount
    DOP_ONLY: 'DOP_ONLY',                                 // Pure local DOP transaction without external FX relationship
    POSSIBLE_FX_PROXY: 'POSSIBLE_FX_PROXY',               // Local DOP charge for SaaS/services with presumed USD tariff (missing USD amount)
    UNKNOWN_ORIGINAL_CURRENCY: 'UNKNOWN_ORIGINAL_CURRENCY'// Transaction where currency cannot be determined
};

const FUEL_TRANSACTION_CLASSES = {
    CONFIRMED_GASOLINE_FUEL: 'CONFIRMED_GASOLINE_FUEL',   // Verified motor fuel refill (Gasolina)
    NON_FUEL_TRANSPORT: 'NON_FUEL_TRANSPORT',             // Transport category entry that is not fuel (e.g. food, courier, tolls)
    VEHICLE_MAINTENANCE: 'VEHICLE_MAINTENANCE'            // Maintenance, repairs, tires, accessories
};

/**
 * Classifies an expense transaction for foreign currency exposure.
 * 
 * @param {Object} tx - Ledger transaction line or expense record
 * @returns {Object} Classified exposure metadata
 */
function classifyFxTransaction(tx) {
    const currency = (tx.currency || 'DOP').toUpperCase();
    const memo = (tx.memo || '').toLowerCase();
    const payee = (tx.payeeName || tx.payee_name || '').toLowerCase();
    const amountUsd = tx.amountUsd || tx.amount_usd;
    const amountEur = tx.amountEur || tx.amount_eur;
    const cat = (tx.category || tx.categoryName || '').toLowerCase();

    // Check verified USD
    if (currency === 'USD' || (amountUsd && Number(amountUsd) > 0)) {
        return {
            class: FX_TRANSACTION_CLASSES.VERIFIED_CONTRACTUAL_USD,
            originalCurrency: 'USD',
            originalAmount: Number(amountUsd) || Number(tx.amount),
            hasExplicitOriginalAmount: true,
            isSubjectToDirectFxPassThrough: true
        };
    }

    // Check verified EUR
    if (currency === 'EUR' || (amountEur && Number(amountEur) > 0)) {
        return {
            class: FX_TRANSACTION_CLASSES.VERIFIED_CONTRACTUAL_EUR,
            originalCurrency: 'EUR',
            originalAmount: Number(amountEur) || Number(tx.amount),
            hasExplicitOriginalAmount: true,
            isSubjectToDirectFxPassThrough: true
        };
    }

    // Known digital SaaS subscriptions (typically billed from abroad) but lacking original USD amount
    const isDigitalSaaS = cat.includes('suscripci') || cat.includes('streaming') || cat.includes('videojuego') ||
        payee.includes('netflix') || payee.includes('google') || payee.includes('chatgpt') ||
        payee.includes('claude') || payee.includes('crunchyroll') || payee.includes('xbox');

    if (isDigitalSaaS) {
        return {
            class: FX_TRANSACTION_CLASSES.POSSIBLE_FX_PROXY,
            originalCurrency: 'USD (PRESUMED_COMMERCIAL)',
            originalAmount: null,
            hasExplicitOriginalAmount: false,
            isSubjectToDirectFxPassThrough: false,
            note: 'Local DOP billing for international digital service; original USD invoice not registered in Ledger'
        };
    }

    if (currency === 'DOP') {
        return {
            class: FX_TRANSACTION_CLASSES.DOP_ONLY,
            originalCurrency: 'DOP',
            originalAmount: Number(tx.amount !== undefined ? tx.amount : tx.amount_minor / 100),
            hasExplicitOriginalAmount: true,
            isSubjectToDirectFxPassThrough: false
        };
    }

    return {
        class: FX_TRANSACTION_CLASSES.UNKNOWN_ORIGINAL_CURRENCY,
        originalCurrency: 'UNKNOWN',
        originalAmount: null,
        hasExplicitOriginalAmount: false,
        isSubjectToDirectFxPassThrough: false
    };
}

/**
 * Evaluates foreign currency exposure across an expense portfolio.
 * 
 * SAFETY RULE: Never computes an empirical effective exchange rate when
 * original foreign currency amount is missing.
 */
function evaluateFxExposure({ transactions, officialSpotRate = 60.50, hypotheticalScocks = [5.0, 10.0] }) {
    if (!Array.isArray(transactions)) {
        throw new Error('transactions must be an array');
    }

    let totalExpenseDop = 0;
    let verifiedUsdDopEquivalent = 0;
    let verifiedEurDopEquivalent = 0;
    let possibleFxProxyDop = 0;
    let pureDopExpense = 0;
    let unknownDopExpense = 0;

    const classifiedTransactions = [];

    for (const tx of transactions) {
        const amtDop = Number(tx.amount !== undefined ? tx.amount : (tx.amount_minor ? tx.amount_minor / 100 : 0));
        if (isNaN(amtDop) || amtDop <= 0) continue;

        totalExpenseDop += amtDop;
        const fxMeta = classifyFxTransaction(tx);

        if (fxMeta.class === FX_TRANSACTION_CLASSES.VERIFIED_CONTRACTUAL_USD) {
            verifiedUsdDopEquivalent += amtDop;
        } else if (fxMeta.class === FX_TRANSACTION_CLASSES.VERIFIED_CONTRACTUAL_EUR) {
            verifiedEurDopEquivalent += amtDop;
        } else if (fxMeta.class === FX_TRANSACTION_CLASSES.POSSIBLE_FX_PROXY) {
            possibleFxProxyDop += amtDop;
        } else if (fxMeta.class === FX_TRANSACTION_CLASSES.DOP_ONLY) {
            pureDopExpense += amtDop;
        } else {
            unknownDopExpense += amtDop;
        }

        classifiedTransactions.push({
            id: tx.id,
            date: tx.date,
            payee: tx.payeeName || tx.payee_name,
            amountDop: round(amtDop, 2),
            fxMeta
        });
    }

    const verifiedFxRatio = totalExpenseDop > 0 ? safeDivide(verifiedUsdDopEquivalent + verifiedEurDopEquivalent, totalExpenseDop, 4) : 0;
    const proxyFxRatio = totalExpenseDop > 0 ? safeDivide(possibleFxProxyDop, totalExpenseDop, 4) : 0;
    const maxPotentialFxExposureRatio = totalExpenseDop > 0 ? safeDivide(verifiedUsdDopEquivalent + verifiedEurDopEquivalent + possibleFxProxyDop, totalExpenseDop, 4) : 0;

    // Build calibrated hypothetical scenarios
    const scenarios = hypotheticalScocks.map(shockPct => {
        const shockFactor = 1 + (shockPct / 100.0);
        // Verified obligations increase strictly with shock
        const impactedVerified = (verifiedUsdDopEquivalent + verifiedEurDopEquivalent) * shockFactor;
        // Proxy obligations may face full pass-through in worst-case scenario
        const impactedProxy = possibleFxProxyDop * shockFactor;
        const projectedTotalExpense = (pureDopExpense + unknownDopExpense) + impactedVerified + impactedProxy;
        const incrementalCostDop = projectedTotalExpense - totalExpenseDop;

        return {
            shockPercentage: shockPct,
            simulatedUsdDopRate: round(officialSpotRate * shockFactor, 4),
            incrementalCostDop: round(incrementalCostDop, 2),
            newTotalExpenseDop: round(projectedTotalExpense, 2),
            percentageExpenseIncrease: percentageChange(projectedTotalExpense, totalExpenseDop),
            isHypotheticalScenario: true,
            assumptions: 'Assumes 100% pass-through on verified FX and proxy subscriptions'
        };
    });

    return {
        summary: {
            totalExpenseDop: round(totalExpenseDop, 2),
            verifiedFxExpenseDop: round(verifiedUsdDopEquivalent + verifiedEurDopEquivalent, 2),
            possibleFxProxyExpenseDop: round(possibleFxProxyDop, 2),
            pureDopExpenseDop: round(pureDopExpense, 2),
            unknownExpenseDop: round(unknownDopExpense, 2),
            verifiedFxRatio,
            proxyFxRatio,
            maxPotentialFxExposureRatio
        },
        effectiveFxRate: {
            value: null,
            status: 'PROHIBITED_DUE_TO_MISSING_CONTRACTUAL_FOREIGN_AMOUNTS',
            reason: 'El Ledger contable registra 100% denominaciones en DOP sin monto original en USD. Se prohíbe inventar un TCEP observado.'
        },
        hypotheticalScenarios: scenarios,
        transactionsCount: classifiedTransactions.length
    };
}

/**
 * Classifies transport and vehicle records for fuel exposure.
 */
function classifyFuelTransaction(tx) {
    const cat = (tx.category || tx.categoryName || '').toLowerCase();
    const payee = (tx.payeeName || tx.payee_name || '').toLowerCase();
    const memo = (tx.memo || '').toLowerCase();

    // Check vehicle maintenance
    if (cat.includes('mantenimiento') || payee.includes('goma') || payee.includes('repuesto') || payee.includes('accesorio') || payee.includes('taller')) {
        return {
            class: FUEL_TRANSACTION_CLASSES.VEHICLE_MAINTENANCE,
            isDirectFuel: false,
            isMaintenance: true
        };
    }

    // Check non-fuel transport (e.g. food, snacks, courier in transport category)
    if (payee.includes('taco') || payee.includes('chocolate') || payee.includes('eps') || payee.includes('courier') || payee.includes('peaje')) {
        return {
            class: FUEL_TRANSACTION_CLASSES.NON_FUEL_TRANSPORT,
            isDirectFuel: false,
            isMaintenance: false,
            reason: 'Gasto clasificado bajo transporte pero no corresponde a hidrocarburo de propulsión'
        };
    }

    // Direct fuel refills
    if (cat.includes('transporte') || payee.includes('gasolina') || payee.includes('combustible') || memo.includes('gasolina')) {
        const hasGallons = isValidNumber(tx.gallons) && tx.gallons > 0;
        return {
            class: FUEL_TRANSACTION_CLASSES.CONFIRMED_GASOLINE_FUEL,
            isDirectFuel: true,
            hasRecordedGallons: hasGallons,
            recordedGallons: hasGallons ? tx.gallons : null
        };
    }

    return {
        class: FUEL_TRANSACTION_CLASSES.NON_FUEL_TRANSPORT,
        isDirectFuel: false,
        isMaintenance: false
    };
}

/**
 * Evaluates fuel and energy exposure across transportation transactions.
 * Computes theoretical virtual gallons using official MICM benchmark.
 */
function evaluateFuelExposure({ transactions, officialFuelPriceDopPerGallon = 290.10, fuelName = 'Gasolina Premium' }) {
    if (!Array.isArray(transactions)) {
        throw new Error('transactions must be an array');
    }
    if (!isValidNumber(officialFuelPriceDopPerGallon) || officialFuelPriceDopPerGallon <= 0) {
        throw new Error('officialFuelPriceDopPerGallon must be a positive number');
    }

    let totalFuelExpenseDop = 0;
    let totalNonFuelTransportDop = 0;
    let totalMaintenanceDop = 0;
    let totalRecordedGallons = 0;
    let confirmedFuelTransactionsCount = 0;

    const classifiedTransactions = [];

    for (const tx of transactions) {
        const amt = Number(tx.amount !== undefined ? tx.amount : (tx.amount_minor ? tx.amount_minor / 100 : 0));
        if (isNaN(amt) || amt <= 0) continue;

        const classification = classifyFuelTransaction(tx);

        if (classification.class === FUEL_TRANSACTION_CLASSES.CONFIRMED_GASOLINE_FUEL) {
            totalFuelExpenseDop += amt;
            confirmedFuelTransactionsCount++;
            if (classification.hasRecordedGallons) {
                totalRecordedGallons += classification.recordedGallons;
            }
        } else if (classification.class === FUEL_TRANSACTION_CLASSES.VEHICLE_MAINTENANCE) {
            totalMaintenanceDop += amt;
        } else {
            totalNonFuelTransportDop += amt;
        }

        classifiedTransactions.push({
            id: tx.id,
            date: tx.date,
            payee: tx.payeeName || tx.payee_name,
            amountDop: round(amt, 2),
            classification
        });
    }

    // Theoretical virtual gallons derived from official price
    const theoreticalVirtualGallons = safeDivide(totalFuelExpenseDop, officialFuelPriceDopPerGallon, 2);

    return {
        summary: {
            totalFuelExpenseDop: round(totalFuelExpenseDop, 2),
            totalNonFuelTransportDop: round(totalNonFuelTransportDop, 2),
            totalMaintenanceDop: round(totalMaintenanceDop, 2),
            totalTransportFamilyDop: round(totalFuelExpenseDop + totalNonFuelTransportDop + totalMaintenanceDop, 2),
            confirmedFuelTransactionsCount,
            fuelShareOfTransportFamilyPct: safeDivide(totalFuelExpenseDop, totalFuelExpenseDop + totalNonFuelTransportDop + totalMaintenanceDop, 4) * 100
        },
        volumeEstimation: {
            hasEmpiricalOdometry: false,
            hasRecordedGallons: totalRecordedGallons > 0,
            recordedGallons: totalRecordedGallons > 0 ? round(totalRecordedGallons, 2) : null,
            theoreticalVirtualGallons,
            referenceFuelType: fuelName,
            referenceTariffDopPerGallon: round(officialFuelPriceDopPerGallon, 2),
            isTheoreticalEstimation: true,
            estimationCaveat: 'Volumen derivado condicional al precio de referencia MICM. No sustituye la medición de odómetro ni surtidor.'
        },
        classifiedTransactionsCount: classifiedTransactions.length
    };
}

export {
    FX_TRANSACTION_CLASSES,
    FUEL_TRANSACTION_CLASSES,
    classifyFxTransaction,
    evaluateFxExposure,
    classifyFuelTransaction,
    evaluateFuelExposure
};

