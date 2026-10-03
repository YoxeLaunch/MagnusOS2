/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // NORMALIZATION ENGINE
 * Resolves institution identities, cleans rate numbers, and computes metrics
 * ============================================================================
 */

import { INSTITUTION_REGISTRY, RATE_TYPES, FX_RATE_BOUNDS } from './types.js';

/**
 * Normaliza una cadena de texto para comparación libre de acentos y puntuación
 */
export function cleanString(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9\s]/g, ' ')   // Quitar caracteres especiales
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Resuelve una entidad bancaria a su identificador canónico mediante aliases explícitos
 */
export function resolveInstitution(rawName, defaultType = RATE_TYPES.RETAIL_BANK) {
    const cleaned = cleanString(rawName);
    if (!cleaned) {
        return {
            id: 'desconocido',
            name: 'Entidad Desconocida',
            type: defaultType
        };
    }

    // 1. Búsqueda por alias exacto en el registro canónico
    for (const inst of INSTITUTION_REGISTRY) {
        for (const alias of inst.aliases) {
            const cleanedAlias = cleanString(alias);
            if (cleaned === cleanedAlias) {
                return {
                    id: inst.id,
                    name: inst.name,
                    fullName: inst.fullName,
                    type: inst.type,
                    logo: inst.logo
                };
            }
        }
    }

    // 2. Búsqueda por inclusión de tokens de longitud significativa (>= 4 caracteres)
    for (const inst of INSTITUTION_REGISTRY) {
        for (const alias of inst.aliases) {
            const cleanedAlias = cleanString(alias);
            if (cleanedAlias.length >= 4 && (cleaned.includes(cleanedAlias) || cleanedAlias.includes(cleaned))) {
                return {
                    id: inst.id,
                    name: inst.name,
                    fullName: inst.fullName,
                    type: inst.type,
                    logo: inst.logo
                };
            }
        }
    }

    // 3. Fallback seguro: generar slug canónico sin romper
    const slug = cleaned.replace(/\s+/g, '_').slice(0, 30);
    const prettyName = rawName.trim().charAt(0).toUpperCase() + rawName.trim().slice(1);

    return {
        id: slug,
        name: prettyName,
        fullName: prettyName,
        type: defaultType,
        logo: 'bank'
    };
}

/**
 * Limpia y convierte cualquier representación numérica (string con $, RD, comas, etc.) a Float
 */
export function parseRate(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (!value || typeof value !== 'string') return null;

    // Detectar marcadores de error conocidos como 999999 o N/A
    if (value.includes('999999') || value.toLowerCase().includes('n/a')) {
        return null;
    }

    // Reemplazar comas por puntos si vienen en formato decimal europeo
    const cleaned = value.replace(/[^0-9.,]/g, '').trim();
    if (!cleaned) return null;

    // Si tiene coma y punto, asumimos formato 1,234.56 o 1.234,56
    let normalized = cleaned;
    if (cleaned.includes(',') && cleaned.includes('.')) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
            normalized = cleaned.replace(/,/g, '');
        } else {
            normalized = cleaned.replace(/\./g, '').replace(',', '.');
        }
    } else if (cleaned.includes(',')) {
        normalized = cleaned.replace(',', '.');
    }

    const num = parseFloat(normalized);
    return Number.isFinite(num) && num > 0 ? Math.round(num * 10000) / 10000 : null;
}

/**
 * Normaliza una observación cruda de cualquier proveedor a la estructura común
 */
export function normalizeRateObservation({
    provider,
    rawInstitution,
    buy,
    sell,
    baseCurrency = 'USD',
    quoteCurrency = 'DOP',
    observedAt = new Date(),
    providerUpdatedAt = null,
    rateType = null,
    metadata = {}
}) {
    const resolved = resolveInstitution(rawInstitution, rateType || RATE_TYPES.RETAIL_BANK);
    const buyNum = parseRate(buy);
    const sellNum = parseRate(sell);

    const base = (baseCurrency || 'USD').toUpperCase();
    const quote = (quoteCurrency || 'DOP').toUpperCase();

    // Validación de plausibilidad según moneda base (USD: 40-100, EUR: 40-120)
    const bounds = FX_RATE_BOUNDS[base] || { min: 40, max: 120 };
    const isPlausible = (r) => r === null || (r >= bounds.min && r <= bounds.max);

    if (!isPlausible(buyNum) || !isPlausible(sellNum)) {
        return null;
    }

    let mid = null;
    let spread = null;

    if (buyNum !== null && sellNum !== null) {
        mid = Math.round(((buyNum + sellNum) / 2) * 10000) / 10000;
        spread = Math.round((sellNum - buyNum) * 10000) / 10000;
    } else if (buyNum !== null) {
        mid = buyNum;
    } else if (sellNum !== null) {
        mid = sellNum;
    }

    return {
        provider,
        institutionId: resolved.id,
        institutionName: resolved.name,
        fullName: resolved.fullName || resolved.name,
        rateType: resolved.type,
        logo: resolved.logo,
        baseCurrency: base,
        quoteCurrency: quote,
        buy: buyNum,
        sell: sellNum,
        mid,
        spread,
        observedAt: observedAt instanceof Date ? observedAt.toISOString() : observedAt,
        providerUpdatedAt: providerUpdatedAt ? (providerUpdatedAt instanceof Date ? providerUpdatedAt.toISOString() : providerUpdatedAt) : null,
        metadata
    };
}

