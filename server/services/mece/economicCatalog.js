/**
 * Universal Economic Data Catalog (MECE Master Catalog)
 * Module A of MECE Core Engine
 * 
 * Supports the 8 canonical impact families (IMP-01 to IMP-08).
 * Enables multi-family assignment without raw time-series data duplication.
 * Strictly separates OBSERVED, DERIVED, ESTIMATED, and SCENARIO indicators.
 * Explicitly rejects visual interpolations (such as FuelDetailModal.tsx synthetic series).
 */

const IMPACT_FAMILIES = {
    'IMP-01': {
        code: 'IMP-01',
        name: 'Cambiario y Sector Externo',
        description: 'Cotizaciones spot, spreads cambiarios, reservas y paridades internacionales'
    },
    'IMP-02': {
        code: 'IMP-02',
        name: 'Energético y Combustibles',
        description: 'Precios regulados de hidrocarburos, crudo internacional y subsidios'
    },
    'IMP-03': {
        code: 'IMP-03',
        name: 'Inflacionario y Precios al Consumidor',
        description: 'Índices de precios, canasta familiar, inflación general y subyacente'
    },
    'IMP-04': {
        code: 'IMP-04',
        name: 'Monetario, Crediticio y Bancario',
        description: 'Tasas de política monetaria (TPM), tasas activas/pasivas y agregados'
    },
    'IMP-05': {
        code: 'IMP-05',
        name: 'Laboral y Poder Adquisitivo',
        description: 'Ingresos laborales, masa salarial, deflactación y poder de compra'
    },
    'IMP-06': {
        code: 'IMP-06',
        name: 'Fiscal y Regulatorio',
        description: 'Tasas impositivas, aranceles, subsidios focalizados y retenciones'
    },
    'IMP-07': {
        code: 'IMP-07',
        name: 'Patrimonial y Financiero Personal',
        description: 'Net worth, rendimientos de certificados, liquidez y apalancamiento'
    },
    'IMP-08': {
        code: 'IMP-08',
        name: 'Actividad Económica y Consumo',
        description: 'IMAE, PIB trimestral, ventas comerciales y confianza del consumidor'
    }
};

const DATA_TYPES = {
    OBSERVED: 'OBSERVED',     // Dato directamente medido o publicado por autoridad oficial
    DERIVED: 'DERIVED',       // Cálculo matemático exacto a partir de datos observados (ej. inflación mensual)
    ESTIMATED: 'ESTIMATED',   // Estimación econométrica o aproximada condicionada a supuestos explícitos
    SCENARIO: 'SCENARIO'      // Simulación contrafáctica o choque hipotético (+5% FX, etc.)
};

const FREQUENCIES = {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    ANNUAL: 'ANNUAL',
    EVENT_DRIVEN: 'EVENT_DRIVEN'
};

const QUALITY_STATUSES = {
    VERIFIED: 'VERIFIED',       // Calidad contrastada y verificada contra fuentes oficiales
    PROVISIONAL: 'PROVISIONAL', // Cifra preliminar sujeta a revisión oficial
    SIMULATED: 'SIMULATED',     // Proyección de escenario sintético
    CONFLICT: 'CONFLICT'        // Discrepancia no resuelta entre fuentes
};

/**
 * Master catalog definition of canonical economic indicators
 */
const MASTER_CATALOG = [
    // --- IMP-01: Cambiario ---
    {
        id: 'USD_DOP_OFFICIAL',
        name: 'USD/DOP Tasa de Referencia Oficial BCRD',
        description: 'Promedio ponderado spot interbancario publicado diariamente por el BCRD.',
        families: ['IMP-01', 'IMP-07'],
        unit: 'DOP_PER_USD',
        frequency: FREQUENCIES.DAILY,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'EUR_DOP_OFFICIAL',
        name: 'EUR/DOP Tasa de Referencia Oficial BCRD',
        description: 'Cotización representativa del euro frente al peso dominicano.',
        families: ['IMP-01'],
        unit: 'DOP_PER_EUR',
        frequency: FREQUENCIES.DAILY,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'FX_DEPRECIATION_SHOCK_5PCT',
        name: 'Escenario Choque Cambiario +5%',
        description: 'Simulación contrafáctica de depreciación del 5% del DOP frente al USD.',
        families: ['IMP-01', 'IMP-05', 'IMP-07'],
        unit: 'DOP_PER_USD',
        frequency: FREQUENCIES.EVENT_DRIVEN,
        type: DATA_TYPES.SCENARIO,
        sourceInstitution: 'MAGNUS_ENGINE',
        sourceUrl: null,
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.SIMULATED
    },

    // --- IMP-02: Energético ---
    {
        id: 'FUEL_PRICE_GASOLINA_PREMIUM',
        name: 'Precio Oficial Gasolina Premium MICM',
        description: 'Precio regulado de venta al público por galón fijado semanalmente por el MICM.',
        families: ['IMP-02', 'IMP-08'],
        unit: 'DOP_PER_GALLON',
        frequency: FREQUENCIES.WEEKLY,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'MICM',
        sourceUrl: 'https://micm.gob.do/precios-de-combustibles',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'FUEL_PRICE_GASOLINA_REGULAR',
        name: 'Precio Oficial Gasolina Regular MICM',
        description: 'Precio regulado de venta al público por galón fijado semanalmente por el MICM.',
        families: ['IMP-02', 'IMP-08'],
        unit: 'DOP_PER_GALLON',
        frequency: FREQUENCIES.WEEKLY,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'MICM',
        sourceUrl: 'https://micm.gob.do/precios-de-combustibles',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'FUEL_VIRTUAL_GALLONS_ESTIMATE',
        name: 'Volumen Virtual de Combustible Estimado',
        description: 'Estimación matemática del volumen en galones: Desembolso DOP / Precio MICM.',
        families: ['IMP-02', 'IMP-05'],
        unit: 'GALLONS',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.ESTIMATED,
        sourceInstitution: 'MAGNUS_ENGINE',
        sourceUrl: null,
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },

    // --- IMP-03: Inflacionario ---
    {
        id: 'CPI_NATIONAL_INDEX',
        name: 'Índice de Precios al Consumidor Nacional',
        description: 'Nivel oficial del IPC dominicano (Base Octubre 2019 - Septiembre 2020 = 100).',
        families: ['IMP-03', 'IMP-05', 'IMP-07'],
        unit: 'INDEX_POINTS',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'BCRD',
        sourceUrl: 'https://cdn.bancentral.gov.do/documents/estadisticas/precios/documents/ipc_base_2019-2020.xls',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'INFLATION_MONTHLY_RATE',
        name: 'Tasa de Inflación Mensual',
        description: 'Variación porcentual intermensual calculada: 100 * (IPC_t / IPC_{t-1} - 1).',
        families: ['IMP-03', 'IMP-05'],
        unit: 'PERCENT',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.DERIVED,
        sourceInstitution: 'BCRD',
        sourceUrl: null,
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'INFLATION_YOY_RATE',
        name: 'Tasa de Inflación Interanual',
        description: 'Variación porcentual interanual: 100 * (IPC_t / IPC_{t-12} - 1).',
        families: ['IMP-03'],
        unit: 'PERCENT',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.DERIVED,
        sourceInstitution: 'BCRD',
        sourceUrl: null,
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'CPI_CORE_INDEX',
        name: 'Índice de Inflación Subyacente',
        description: 'IPC excluyendo bienes agrícolas volátiles, combustibles y servicios administrados.',
        families: ['IMP-03'],
        unit: 'INDEX_POINTS',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'BCRD',
        sourceUrl: 'https://cdn.bancentral.gov.do/documents/estadisticas/precios/documents/ipc_subyacente_base_2019-2020.xlsx',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },

    // --- IMP-04: Monetario y Crediticio ---
    {
        id: 'TPM_RATE',
        name: 'Tasa de Política Monetaria (TPM)',
        description: 'Tasa objetivo a un día del Banco Central de la República Dominicana.',
        families: ['IMP-04'],
        unit: 'PERCENT_ANNUAL',
        frequency: FREQUENCIES.EVENT_DRIVEN,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'SB_WEIGHTED_PASSIVE_RATE',
        name: 'Tasa Pasiva Promedio Ponderada Bancos Múltiples',
        description: 'Retorno ponderado en depósitos y certificados emitido por la Superintendencia de Bancos.',
        families: ['IMP-04', 'IMP-07'],
        unit: 'PERCENT_ANNUAL',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'SB',
        sourceUrl: 'https://sb.gob.do/',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },

    // --- IMP-05: Laboral y Poder Adquisitivo ---
    {
        id: 'REAL_INCOME_MONTHLY',
        name: 'Ingreso Laboral Real en Pesos Constantes',
        description: 'Ingreso nominal deflactado contra IPC oficial en pesos del período base.',
        families: ['IMP-05', 'IMP-07'],
        unit: 'DOP_CONSTANT',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.DERIVED,
        sourceInstitution: 'MAGNUS_ENGINE',
        sourceUrl: null,
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },
    {
        id: 'PURCHASING_POWER_INDEX',
        name: 'Índice de Poder Adquisitivo Salarial (IPA)',
        description: 'Relación base 100 entre crecimiento salarial nominal y variación del IPC.',
        families: ['IMP-05'],
        unit: 'INDEX_POINTS',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.DERIVED,
        sourceInstitution: 'MAGNUS_ENGINE',
        sourceUrl: null,
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },

    // --- IMP-06: Fiscal y Regulatorio ---
    {
        id: 'DIGITAL_SERVICES_TAX_RATE',
        name: 'Tasa Impositiva a Servicios Digitales Transfronterizos',
        description: 'Carga tributaria o retención regulatoria aplicable a software y suscripciones del exterior.',
        families: ['IMP-06', 'IMP-01'],
        unit: 'PERCENT',
        frequency: FREQUENCIES.ANNUAL,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'DGII',
        sourceUrl: 'https://dgii.gov.do/',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.PROVISIONAL
    },

    // --- IMP-07: Patrimonial y Financiero Personal ---
    {
        id: 'NET_WORTH_REAL',
        name: 'Patrimonio Neto Deflactado (Real Net Worth)',
        description: 'Activos netos del usuario deflactados por el nivel de precios nacional.',
        families: ['IMP-07', 'IMP-05'],
        unit: 'DOP_CONSTANT',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.DERIVED,
        sourceInstitution: 'MAGNUS_ENGINE',
        sourceUrl: null,
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    },

    // --- IMP-08: Actividad Económica y Consumo ---
    {
        id: 'IMAE_YOY_RATE',
        name: 'IMAE (Actividad Económica Interanual)',
        description: 'Índice Mensual de Actividad Económica publicado por el BCRD.',
        families: ['IMP-08'],
        unit: 'PERCENT',
        frequency: FREQUENCIES.MONTHLY,
        type: DATA_TYPES.OBSERVED,
        sourceInstitution: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        isVisualInterpolation: false,
        qualityStatus: QUALITY_STATUSES.VERIFIED
    }
];

class EconomicCatalogService {
    constructor() {
        this.indicators = new Map();
        for (const ind of MASTER_CATALOG) {
            this.registerIndicator(ind);
        }
    }

    /**
     * Registers an indicator in the catalog with validation.
     * Enforces strict quality invariants (rejects visual interpolations).
     */
    registerIndicator(indicator) {
        if (!indicator.id || typeof indicator.id !== 'string') {
            throw new Error('Indicator must have a valid string ID');
        }
        if (!indicator.families || !Array.isArray(indicator.families) || indicator.families.length === 0) {
            throw new Error(`Indicator ${indicator.id} must belong to at least one impact family`);
        }
        for (const fam of indicator.families) {
            if (!IMPACT_FAMILIES[fam]) {
                throw new Error(`Indicator ${indicator.id} references invalid family ${fam}`);
            }
        }
        if (!DATA_TYPES[indicator.type]) {
            throw new Error(`Indicator ${indicator.id} has invalid type ${indicator.type}`);
        }
        if (indicator.isVisualInterpolation === true) {
            throw new Error(`SECURITY/QUALITY ERROR: Indicator ${indicator.id} is flagged as a visual interpolation and cannot be registered in MECE scientific catalog`);
        }

        this.indicators.set(indicator.id, Object.freeze({ ...indicator }));
    }

    getIndicator(id) {
        return this.indicators.get(id) || null;
    }

    getAllIndicators() {
        return Array.from(this.indicators.values());
    }

    getIndicatorsByFamily(familyCode) {
        if (!IMPACT_FAMILIES[familyCode]) {
            throw new Error(`Unknown impact family: ${familyCode}`);
        }
        return Array.from(this.indicators.values()).filter(ind => ind.families.includes(familyCode));
    }

    getIndicatorsByType(type) {
        if (!DATA_TYPES[type]) {
            throw new Error(`Unknown data type: ${type}`);
        }
        return Array.from(this.indicators.values()).filter(ind => ind.type === type);
    }

    getFamilies() {
        return Object.values(IMPACT_FAMILIES);
    }

    listFamilies() {
        return this.getFamilies();
    }

    listIndicators() {
        return Array.from(this.indicators.values());
    }

    validateObservation(indicatorId, value) {
        const ind = this.getIndicator(indicatorId);
        if (!ind) {
            return { valid: false, error: `Indicator ${indicatorId} not registered in catalog` };
        }
        if (value === null || value === undefined || typeof value !== 'number' || !Number.isFinite(value)) {
            return { valid: false, error: `Value must be a finite number` };
        }
        return { valid: true };
    }
}

const economicCatalog = new EconomicCatalogService();

export {
    economicCatalog,
    getUniversalCatalog: () => economicCatalog,
    IMPACT_FAMILIES,
    DATA_TYPES,
    FREQUENCIES,
    QUALITY_STATUSES
};

