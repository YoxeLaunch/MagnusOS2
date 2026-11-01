/**
 * MECE FX Adapter (Phase 1A)
 * 
 * Provides an experimental, read-only adapter interfacing with Providence FX contracts.
 * 
 * Invariants:
 * 1. 5-Class FX Exposure Taxonomy:
 *    - VERIFIED_USD_CONTRACT: Contractual USD verified with original foreign amount.
 *    - VERIFIED_EUR_CONTRACT: Contractual EUR verified with original foreign amount.
 *    - DOP_ONLY_DOMESTIC: Pure domestic transaction with 0 currency risk.
 *    - PROBABLE_FX_LINKED: Suspected foreign service billed in DOP without original USD recorded.
 *    - UNKNOWN_CURRENCY: Insufficient metadata.
 * 2. Prohibition of Fabricated TCEP: Under no circumstances may an "observed" effective exchange rate
 *    be calculated if the original foreign currency amount is missing from the transaction records.
 * 3. Deterministic Scenarios: Calibrated hypothetical stress tests (+5%, +10% depreciation)
 *    are strictly flagged as SCENARIO.
 */

import { round, isValidNumber } from '../../services/mece/meceMathUtils.js';

const FX_EXPOSURE_CLASSES = {
    VERIFIED_USD_CONTRACT: 'VERIFIED_USD_CONTRACT',
    VERIFIED_EUR_CONTRACT: 'VERIFIED_EUR_CONTRACT',
    DOP_ONLY_DOMESTIC: 'DOP_ONLY_DOMESTIC',
    PROBABLE_FX_LINKED: 'PROBABLE_FX_LINKED',
    UNKNOWN_CURRENCY: 'UNKNOWN_CURRENCY'
};

const KNOWN_FX_PATTERNS = [
    { pattern: /netflix/i, service: 'Netflix', probableCurrency: 'USD' },
    { pattern: /spotify/i, service: 'Spotify', probableCurrency: 'USD' },
    { pattern: /google\s*(storage|cloud|one|play)/i, service: 'Google Cloud / Services', probableCurrency: 'USD' },
    { pattern: /apple(\.com|\s*services|\s*bill)/i, service: 'Apple Services', probableCurrency: 'USD' },
    { pattern: /amazon(\s*prime|\s*web|\s*video)/i, service: 'Amazon / AWS', probableCurrency: 'USD' },
    { pattern: /github/i, service: 'GitHub', probableCurrency: 'USD' },
    { pattern: /openai|chatgpt/i, service: 'OpenAI', probableCurrency: 'USD' },
    { pattern: /adobe/i, service: 'Adobe Creative Cloud', probableCurrency: 'USD' },
    { pattern: /digitalocean|linode|vultr/i, service: 'Cloud Infrastructure', probableCurrency: 'USD' }
];

class MeceFxAdapter {
    /**
     * @param {Object} options
     * @param {Map<string, number>} [options.spotRates] - Map of date -> spot rate (e.g. '2026-09-30' -> 60.15)
     */
    constructor(options = {}) {
        this.spotRates = options.spotRates || new Map([
            ['2025-12', 60.25],
            ['2026-01', 60.35],
            ['2026-02', 60.40],
            ['2026-03', 60.45],
            ['2026-04', 60.50],
            ['2026-05', 60.60],
            ['2026-06', 60.75],
            ['2026-07', 60.85],
            ['2026-08', 60.90],
            ['2026-09', 61.10],
            ['2026-10', 61.25]
        ]);
    }

    /**
     * Classifies a financial transaction into the 5-class FX taxonomy.
     * 
     * @param {Object} tx - Ledger transaction or expense record
     * @returns {Object} Classified FX exposure
     */
    classifyTransaction(tx) {
        const originalCurrency = (tx.originalCurrency || tx.currency || 'DOP').toUpperCase();
        const originalAmount = tx.originalAmount !== undefined ? Number(tx.originalAmount) : null;
        let dopAmount = Number(tx.amount || (tx.amountMinor ? tx.amountMinor / 100 : 0));
        if (dopAmount === 0 && tx.lines && Array.isArray(tx.lines)) {
            const catLine = tx.lines.find(l => Boolean(l.categoryId || l.category));
            if (catLine) {
                const raw = BigInt(catLine.amountMinor !== undefined ? catLine.amountMinor : (catLine.amount_minor || 0));
                const abs = raw < 0n ? -raw : raw;
                dopAmount = Number(abs) / 100;
            }
        }
        const payee = tx.payeeName || tx.payee?.name || tx.description || '';

        // 1. Contractual USD Verified
        if (originalCurrency === 'USD' && originalAmount !== null && originalAmount > 0) {
            const effectiveRate = dopAmount > 0 ? round(dopAmount / originalAmount, 4) : null;
            return {
                classification: FX_EXPOSURE_CLASSES.VERIFIED_USD_CONTRACT,
                hasDirectExposure: true,
                contractualCurrency: 'USD',
                contractualAmount: originalAmount,
                dopAmount: dopAmount,
                effectiveExchangeRate: effectiveRate,
                rateType: 'OBSERVED_EFFECTIVE',
                confidence: 'HIGH'
            };
        }

        // 2. Contractual EUR Verified
        if (originalCurrency === 'EUR' && originalAmount !== null && originalAmount > 0) {
            const effectiveRate = dopAmount > 0 ? round(dopAmount / originalAmount, 4) : null;
            return {
                classification: FX_EXPOSURE_CLASSES.VERIFIED_EUR_CONTRACT,
                hasDirectExposure: true,
                contractualCurrency: 'EUR',
                contractualAmount: originalAmount,
                dopAmount: dopAmount,
                effectiveExchangeRate: effectiveRate,
                rateType: 'OBSERVED_EFFECTIVE',
                confidence: 'HIGH'
            };
        }

        // 3. Check for Probable Foreign Services billed strictly in DOP
        for (const known of KNOWN_FX_PATTERNS) {
            if (known.pattern.test(payee)) {
                return {
                    classification: FX_EXPOSURE_CLASSES.PROBABLE_FX_LINKED,
                    hasDirectExposure: false,
                    isProxyExposure: true,
                    suspectedCurrency: known.probableCurrency,
                    serviceDetected: known.service,
                    dopAmount: dopAmount,
                    // INVARIANT: Prohibited from calculating an observed TCEP!
                    effectiveExchangeRate: null,
                    rateType: null,
                    reason: 'Pago documentado exclusivamente en DOP. Se prohíbe calcular un tipo de cambio efectivo empírico sin el monto contractual en divisa extranjera.',
                    confidence: 'MEDIUM'
                };
            }
        }

        // 4. Default domestic DOP
        return {
            classification: FX_EXPOSURE_CLASSES.DOP_ONLY_DOMESTIC,
            hasDirectExposure: false,
            contractualCurrency: 'DOP',
            dopAmount: dopAmount,
            effectiveExchangeRate: null,
            rateType: null,
            confidence: 'HIGH'
        };
    }

    /**
     * Evaluates total portfolio FX exposure and computes deterministic sensitivity shocks (+5%, +10%).
     * 
     * @param {Array<Object>} transactions - List of expenses
     * @returns {Object} Comprehensive FX exposure report
     */
    evaluatePortfolioExposure(transactions = []) {
        let verifiedUsdDopTotal = 0.0;
        let verifiedUsdContractualTotal = 0.0;
        let probableFxDopTotal = 0.0;
        let pureDomesticDopTotal = 0.0;
        let unclassifiedDopTotal = 0.0;

        const classifiedItems = [];

        for (const tx of transactions) {
            const item = this.classifyTransaction(tx);
            classifiedItems.push(item);

            if (item.classification === FX_EXPOSURE_CLASSES.VERIFIED_USD_CONTRACT) {
                verifiedUsdDopTotal += item.dopAmount;
                verifiedUsdContractualTotal += (item.contractualAmount || 0);
            } else if (item.classification === FX_EXPOSURE_CLASSES.PROBABLE_FX_LINKED) {
                probableFxDopTotal += item.dopAmount;
            } else if (item.classification === FX_EXPOSURE_CLASSES.DOP_ONLY_DOMESTIC) {
                pureDomesticDopTotal += item.dopAmount;
            } else {
                unclassifiedDopTotal += item.dopAmount;
            }
        }

        const totalEvaluatedDop = round(verifiedUsdDopTotal + probableFxDopTotal + pureDomesticDopTotal + unclassifiedDopTotal, 2);

        // Deterministic Scenarios (+5% and +10% depreciation)
        const shock5PctImpact = round((verifiedUsdDopTotal + probableFxDopTotal) * 0.05, 2);
        const shock10PctImpact = round((verifiedUsdDopTotal + probableFxDopTotal) * 0.10, 2);

        return {
            totalEvaluatedDop,
            breakdown: {
                verifiedUsdDop: round(verifiedUsdDopTotal, 2),
                verifiedUsdContractual: round(verifiedUsdContractualTotal, 2),
                probableFxProxyDop: round(probableFxDopTotal, 2),
                pureDomesticDop: round(pureDomesticDopTotal, 2),
                unclassifiedDop: round(unclassifiedDopTotal, 2)
            },
            shares: {
                verifiedUsdPct: totalEvaluatedDop > 0 ? round((verifiedUsdDopTotal / totalEvaluatedDop) * 100, 2) : 0,
                probableFxPct: totalEvaluatedDop > 0 ? round((probableFxDopTotal / totalEvaluatedDop) * 100, 2) : 0,
                totalExposedPct: totalEvaluatedDop > 0 ? round(((verifiedUsdDopTotal + probableFxDopTotal) / totalEvaluatedDop) * 100, 2) : 0
            },
            scenarios: {
                depreciation_plus_5_pct: {
                    type: 'SCENARIO',
                    shockDescription: 'Depreciación del DOP frente al USD de +5.0%',
                    incrementalMonthlyCostDop: shock5PctImpact,
                    newTotalExposedDop: round(verifiedUsdDopTotal + probableFxDopTotal + shock5PctImpact, 2)
                },
                depreciation_plus_10_pct: {
                    type: 'SCENARIO',
                    shockDescription: 'Depreciación del DOP frente al USD de +10.0%',
                    incrementalMonthlyCostDop: shock10PctImpact,
                    newTotalExposedDop: round(verifiedUsdDopTotal + probableFxDopTotal + shock10PctImpact, 2)
                }
            },
            classifiedItems
        };
    }
}

export {
    MeceFxAdapter,
    FX_EXPOSURE_CLASSES
};
