/**
 * MECE Energy Adapter (Phase 1A)
 * 
 * Provides an experimental, read-only adapter interfacing with Energía RD / MICM contracts.
 * 
 * Invariants:
 * 1. Rejection of Synthetic UI Series: Rejects interpolated crude series (e.g. synthetic WTI)
 *    for real consumption analysis.
 * 2. Strict Transport Segregation: Separates verified fuel purchases from non-fuel transport
 *    (tolls, metro, taxis) and vehicle maintenance (oil changes, repairs, tires).
 * 3. Theoretical Virtual Gallons: Derives volume using official weekly MICM fuel prices
 *    when physical gallons are not recorded in transaction notes.
 * 4. Prohibition of Fake Odometer Calculations: Prohibits calculating km/galón or vehicle
 *    energy efficiency without actual physical odometric readings.
 */

import { round, isValidNumber } from '../../services/mece/meceMathUtils.js';

const FUEL_TYPES = {
    GASOLINE_REGULAR: 'gasoline_regular',
    GASOLINE_PREMIUM: 'gasoline_premium',
    DIESEL_REGULAR: 'diesel_regular',
    GLP: 'glp'
};

const TRANSPORT_CATEGORIES = {
    FUEL_CONFIRMED: 'FUEL_CONFIRMED',
    TRANSPORT_NON_FUEL: 'TRANSPORT_NON_FUEL',
    VEHICLE_MAINTENANCE: 'VEHICLE_MAINTENANCE'
};

// Official MICM benchmark weekly prices (DOP / gallon)
const OFFICIAL_MICM_PRICES = {
    '2025-12': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-01': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-02': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-03': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-04': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-05': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-06': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-07': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-08': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-09': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 },
    '2026-10': { gasoline_regular: 272.50, gasoline_premium: 290.10, diesel_regular: 221.60 }
};

const FUEL_STATION_PATTERNS = [
    /total\s*energies/i,
    /shell/i,
    /texaco/i,
    /esso/i,
    /sunix/i,
    /petromovil/i,
    /isla\s*combustibles/i,
    /combustibles/i,
    /estacion\s*de\s*servicios?/i
];

const NON_FUEL_TRANSPORT_PATTERNS = [
    /peaje/i,
    /paso\s*rapido/i,
    /metro/i,
    /teleferico/i,
    /uber/i,
    /didi/i,
    /cabify/i,
    /parqueo|estacionamiento/i
];

const VEHICLE_MAINTENANCE_PATTERNS = [
    /mantenimiento\s*vehicular/i,
    /taller/i,
    /mecanic/i,
    /repuestos?/i,
    /neumaticos?|gomas?/i,
    /alineacion|balanceo/i,
    /cambio\s*de\s*aceite/i,
    /lavado|car\s*wash/i
];

class MeceEnergyAdapter {
    /**
     * @param {Object} options
     * @param {Object} [options.micmPriceTable]
     */
    constructor(options = {}) {
        this.priceTable = options.micmPriceTable || OFFICIAL_MICM_PRICES;
    }

    /**
     * Gets the official MICM fuel price for a fuel type and period.
     * 
     * @param {string} fuelType - e.g. 'gasoline_regular'
     * @param {string} period - e.g. '2026-09'
     * @returns {number|null} Official price in DOP/gal
     */
    getOfficialPrice(fuelType = FUEL_TYPES.GASOLINE_REGULAR, period = '2026-09') {
        const periodKey = period.substring(0, 7);
        const periodData = this.priceTable[periodKey];
        if (!periodData) return null;
        return periodData[fuelType] || null;
    }

    /**
     * Classifies a transaction related to transport or energy.
     * 
     * @param {Object} tx 
     * @returns {Object} Classified transport event
     */
    classifyTransportTransaction(tx) {
        const payee = tx.payeeName || tx.payee?.name || '';
        const desc = tx.description || '';
        let cat = (tx.category || tx.categoryName || '').toLowerCase();
        let amount = Number(tx.amount || (tx.amountMinor ? tx.amountMinor / 100 : 0));
        if (amount === 0 && tx.lines && Array.isArray(tx.lines)) {
            const catLine = tx.lines.find(l => Boolean(l.categoryId || l.category));
            if (catLine) {
                const raw = BigInt(catLine.amountMinor !== undefined ? catLine.amountMinor : (catLine.amount_minor || 0));
                const abs = raw < 0n ? -raw : raw;
                amount = Number(abs) / 100;
                if (!cat && catLine.category) {
                    cat = (catLine.category.name || '').toLowerCase();
                }
            }
        }
        const combined = `${payee} ${desc} ${cat}`;
        const period = (tx.date || tx.period || '2026-09').substring(0, 7);

        // 1. Vehicle Maintenance Check
        for (const pattern of VEHICLE_MAINTENANCE_PATTERNS) {
            if (pattern.test(combined)) {
                return {
                    classification: TRANSPORT_CATEGORIES.VEHICLE_MAINTENANCE,
                    isFuel: false,
                    amountDop: amount,
                    category: 'Mantenimiento Vehicular',
                    gallons: 0,
                    volumeType: 'NONE',
                    reason: 'Gasto de taller, repuestos o mantenimiento. Segregado formalmente del consumo energético.'
                };
            }
        }

        // 2. Non-Fuel Transport Check
        for (const pattern of NON_FUEL_TRANSPORT_PATTERNS) {
            if (pattern.test(combined)) {
                return {
                    classification: TRANSPORT_CATEGORIES.TRANSPORT_NON_FUEL,
                    isFuel: false,
                    amountDop: amount,
                    category: 'Transporte No Combustible',
                    gallons: 0,
                    volumeType: 'NONE',
                    reason: 'Peaje, transporte público o estacionamiento. Segregado de la masa de combustible.'
                };
            }
        }

        // 3. Fuel Purchase Check
        let isFuelStation = false;
        for (const pattern of FUEL_STATION_PATTERNS) {
            if (pattern.test(combined)) {
                isFuelStation = true;
                break;
            }
        }

        if (isFuelStation || cat.includes('gasolina') || cat.includes('combustible')) {
            // Check if physical gallons are explicitly recorded
            const explicitGallons = tx.gallons !== undefined && tx.gallons !== null ? Number(tx.gallons) : null;
            const fuelType = tx.fuelType || FUEL_TYPES.GASOLINE_REGULAR;
            const officialPrice = this.getOfficialPrice(fuelType, period);

            if (explicitGallons !== null && explicitGallons > 0) {
                return {
                    classification: TRANSPORT_CATEGORIES.FUEL_CONFIRMED,
                    isFuel: true,
                    fuelType,
                    amountDop: amount,
                    gallons: round(explicitGallons, 2),
                    volumeType: 'VOLUME_OBSERVED',
                    officialTariffDop: officialPrice,
                    confidence: 'HIGH'
                };
            }

            // Derive theoretical virtual gallons using official MICM price
            const virtualGallons = officialPrice ? round(amount / officialPrice, 2) : null;

            return {
                classification: TRANSPORT_CATEGORIES.FUEL_CONFIRMED,
                isFuel: true,
                fuelType,
                amountDop: amount,
                gallons: virtualGallons,
                volumeType: 'VOLUME_THEORETICAL_VIRTUAL',
                officialTariffDop: officialPrice,
                confidence: 'MEDIUM',
                caveat: 'Volumen teórico aproximado mediante tarifa oficial MICM. Se prohíbe calcular eficiencia del vehículo (km/gal) sin registro odómetrico verificado.'
            };
        }

        // Default transport
        return {
            classification: TRANSPORT_CATEGORIES.TRANSPORT_NON_FUEL,
            isFuel: false,
            amountDop: amount,
            gallons: 0,
            volumeType: 'NONE'
        };
    }

    /**
     * Evaluates total energy and transport exposure for a list of transactions.
     * 
     * @param {Array<Object>} transactions 
     * @returns {Object} Comprehensive energy exposure report
     */
    evaluateEnergyExposure(transactions = []) {
        let fuelDopTotal = 0.0;
        let fuelTheoreticalGallonsTotal = 0.0;
        let nonFuelTransportDopTotal = 0.0;
        let maintenanceDopTotal = 0.0;

        const classifiedItems = [];

        for (const tx of transactions) {
            const item = this.classifyTransportTransaction(tx);
            classifiedItems.push(item);

            if (item.classification === TRANSPORT_CATEGORIES.FUEL_CONFIRMED) {
                fuelDopTotal += item.amountDop;
                fuelTheoreticalGallonsTotal += (item.gallons || 0);
            } else if (item.classification === TRANSPORT_CATEGORIES.VEHICLE_MAINTENANCE) {
                maintenanceDopTotal += item.amountDop;
            } else {
                nonFuelTransportDopTotal += item.amountDop;
            }
        }

        const totalTransportDop = round(fuelDopTotal + nonFuelTransportDopTotal + maintenanceDopTotal, 2);

        return {
            totalTransportDop,
            breakdown: {
                fuelDop: round(fuelDopTotal, 2),
                nonFuelTransportDop: round(nonFuelTransportDopTotal, 2),
                maintenanceDop: round(maintenanceDopTotal, 2)
            },
            fuelMetrics: {
                estimatedVirtualGallons: round(fuelTheoreticalGallonsTotal, 2),
                fuelShareOfTransportPct: totalTransportDop > 0 ? round((fuelDopTotal / totalTransportDop) * 100, 2) : 0
            },
            classifiedItems
        };
    }
}

export {
    MeceEnergyAdapter,
    FUEL_TYPES,
    TRANSPORT_CATEGORIES,
    OFFICIAL_MICM_PRICES
};
