/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // VALIDATION & CONFIDENCE ENGINE
 * Performs cross-provider consistency checks and derives confidence scores
 * ============================================================================
 */

import { VALIDATION_STATUS, CONFIDENCE_SCORES } from './types.js';

export const FX_THRESHOLDS = {
    VERIFIED: parseFloat(process.env.FX_DIFF_VERIFIED || '0.05'),
    ACCEPTABLE: parseFloat(process.env.FX_DIFF_ACCEPTABLE || '0.15'),
    WARNING: parseFloat(process.env.FX_DIFF_WARNING || '0.50')
};

/**
 * Evalúa la discrepancia numérica entre dos valores de tasa
 */
function classifyDifference(diff) {
    if (diff === null || isNaN(diff)) return VALIDATION_STATUS.SINGLE_SOURCE;
    if (diff <= FX_THRESHOLDS.VERIFIED) return VALIDATION_STATUS.VERIFIED;
    if (diff <= FX_THRESHOLDS.ACCEPTABLE) return VALIDATION_STATUS.ACCEPTABLE;
    if (diff <= FX_THRESHOLDS.WARNING) return VALIDATION_STATUS.WARNING;
    return VALIDATION_STATUS.CONFLICT;
}

/**
 * Determina el estado de validación general combinando compra y venta (el más severo prevalece)
 */
function mergeStatuses(statusBuy, statusSell) {
    const severityOrder = [
        VALIDATION_STATUS.CONFLICT,
        VALIDATION_STATUS.WARNING,
        VALIDATION_STATUS.ACCEPTABLE,
        VALIDATION_STATUS.SINGLE_SOURCE,
        VALIDATION_STATUS.VERIFIED
    ];

    for (const s of severityOrder) {
        if (statusBuy === s || statusSell === s) return s;
    }
    return VALIDATION_STATUS.VERIFIED;
}

/**
 * Valida un conjunto de observaciones agrupadas por institución procedentes de varios proveedores
 * @param {Array} observations - Lista de observaciones normalizadas de todos los providers activos
 * @returns {Array} Lista de tasas consolidadas por banco con status y confidence
 */
export function validateAndConsolidateRates(observations) {
    // 1. Agrupar por institutionId
    const groups = new Map();
    for (const obs of observations) {
        if (!obs || !obs.institutionId) continue;
        if (!groups.has(obs.institutionId)) {
            groups.set(obs.institutionId, []);
        }
        groups.get(obs.institutionId).push(obs);
    }

    const consolidated = [];

    for (const [institutionId, obsList] of groups.entries()) {
        const first = obsList[0];

        // Caso A: Solo 1 proveedor tiene datos de esta institución
        if (obsList.length === 1) {
            consolidated.push({
                institutionId,
                institutionName: first.institutionName,
                fullName: first.fullName,
                rateType: first.rateType,
                logo: first.logo,
                buy: first.buy,
                sell: first.sell,
                mid: first.mid,
                spread: first.spread,
                validationStatus: VALIDATION_STATUS.SINGLE_SOURCE,
                confidence: CONFIDENCE_SCORES[VALIDATION_STATUS.SINGLE_SOURCE],
                observedAt: first.observedAt,
                providerUpdatedAt: first.providerUpdatedAt,
                providers: [first.provider],
                observations: obsList.map(o => ({
                    provider: o.provider,
                    buy: o.buy,
                    sell: o.sell,
                    observedAt: o.observedAt
                })),
                differences: null
            });
            continue;
        }

        // Caso B: Múltiples proveedores observaron esta institución (ej. TasaReal vs InfoDolar)
        // Extraer valores válidos de compra y venta
        const validBuys = obsList.map(o => o.buy).filter(v => typeof v === 'number' && v > 0);
        const validSells = obsList.map(o => o.sell).filter(v => typeof v === 'number' && v > 0);

        let maxDiffBuy = 0;
        let maxDiffSell = 0;

        if (validBuys.length > 1) {
            maxDiffBuy = Math.max(...validBuys) - Math.min(...validBuys);
            maxDiffBuy = Math.round(maxDiffBuy * 10000) / 10000;
        }

        if (validSells.length > 1) {
            maxDiffSell = Math.max(...validSells) - Math.min(...validSells);
            maxDiffSell = Math.round(maxDiffSell * 10000) / 10000;
        }

        const statusBuy = validBuys.length > 1 ? classifyDifference(maxDiffBuy) : VALIDATION_STATUS.VERIFIED;
        const statusSell = validSells.length > 1 ? classifyDifference(maxDiffSell) : VALIDATION_STATUS.VERIFIED;
        const overallStatus = mergeStatuses(statusBuy, statusSell);
        const confidence = CONFIDENCE_SCORES[overallStatus];

        // Priorizar TasaReal como dato principal si está presente, de lo contrario el promedio o InfoDolar
        const tasaRealObs = obsList.find(o => o.provider === 'tasareal');
        const primaryObs = tasaRealObs || obsList[0];

        // Si hay conflicto severo (>0.50 DOP), se usa el primary pero se preservan las observaciones
        const finalBuy = primaryObs.buy;
        const finalSell = primaryObs.sell;
        const finalMid = (finalBuy !== null && finalSell !== null) ? Math.round(((finalBuy + finalSell) / 2) * 10000) / 10000 : null;
        const finalSpread = (finalBuy !== null && finalSell !== null) ? Math.round((finalSell - finalBuy) * 10000) / 10000 : null;

        consolidated.push({
            institutionId,
            institutionName: primaryObs.institutionName,
            fullName: primaryObs.fullName,
            rateType: primaryObs.rateType,
            logo: primaryObs.logo,
            buy: finalBuy,
            sell: finalSell,
            mid: finalMid,
            spread: finalSpread,
            validationStatus: overallStatus,
            confidence,
            observedAt: primaryObs.observedAt,
            providerUpdatedAt: primaryObs.providerUpdatedAt,
            providers: obsList.map(o => o.provider),
            observations: obsList.map(o => ({
                provider: o.provider,
                buy: o.buy,
                sell: o.sell,
                observedAt: o.observedAt
            })),
            differences: {
                differenceBuy: maxDiffBuy,
                differenceSell: maxDiffSell
            }
        });
    }

    return consolidated;
}
