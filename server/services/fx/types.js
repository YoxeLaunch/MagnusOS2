/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // TYPES & CONSTANTS
 * Domain models, classification enums and canonical institution mapping
 * ============================================================================
 */

export const RATE_TYPES = {
    MARKET: 'MARKET',                         // e.g. Yahoo Finance spot
    OFFICIAL_REFERENCE: 'OFFICIAL_REFERENCE', // e.g. Banco Central de la Rep. Dominicana (BCRD)
    RETAIL_BANK: 'RETAIL_BANK',               // Commercial Dominican banks (Banreservas, Popular, etc.)
    AGGREGATOR: 'AGGREGATOR'                  // Platforms aggregating multiple sources (TasaReal, InfoDolar)
};

export const VALIDATION_STATUS = {
    VERIFIED: 'VERIFIED',         // Difference <= 0.05
    ACCEPTABLE: 'ACCEPTABLE',     // Difference <= 0.15
    WARNING: 'WARNING',           // Difference <= 0.50
    CONFLICT: 'CONFLICT',         // Difference > 0.50
    SINGLE_SOURCE: 'SINGLE_SOURCE'// Observed in only 1 active provider
};

export const CONFIDENCE_SCORES = {
    [VALIDATION_STATUS.VERIFIED]: 1.00,
    [VALIDATION_STATUS.ACCEPTABLE]: 0.85,
    [VALIDATION_STATUS.WARNING]: 0.60,
    [VALIDATION_STATUS.CONFLICT]: 0.30,
    [VALIDATION_STATUS.SINGLE_SOURCE]: 0.75
};

export const CIRCUIT_BREAKER_STATES = {
    CLOSED: 'CLOSED',       // Normal operation
    OPEN: 'OPEN',           // Tripped, rejecting requests during cooldown
    HALF_OPEN: 'HALF_OPEN'  // Testing recovery with a single request
};

/**
 * Canonical dictionary of Dominican financial institutions.
 * Maps multiple naming aliases from different providers to a single canonical ID and official name.
 */
export const INSTITUTION_REGISTRY = [
    {
        id: 'banreservas',
        name: 'Banreservas',
        fullName: 'Banco de Reservas de la República Dominicana',
        aliases: ['banreservas', 'banco de reservas', 'banco reservas', 'reservas'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'banreservas'
    },
    {
        id: 'popular',
        name: 'Banco Popular',
        fullName: 'Banco Popular Dominicano',
        aliases: ['popular', 'banco popular', 'banco popular dominicano', 'bpd'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'popular'
    },
    {
        id: 'bhd',
        name: 'Banco BHD',
        fullName: 'Banco BHD',
        aliases: ['bhd', 'banco bhd', 'banco bhd leon', 'bhd leon'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'bhd'
    },
    {
        id: 'scotiabank',
        name: 'Scotiabank',
        fullName: 'Scotiabank República Dominicana',
        aliases: ['scotiabank', 'scotia', 'banco scotiabank'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'scotiabank'
    },
    {
        id: 'santa_cruz',
        name: 'Banco Santa Cruz',
        fullName: 'Banco Santa Cruz',
        aliases: ['santa cruz', 'banco santa cruz', 'bsc'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'santacruz'
    },
    {
        id: 'lafise',
        name: 'Banco Lafise',
        fullName: 'Banco Lafise República Dominicana',
        aliases: ['lafise', 'banco lafise', 'banco lafise dominicana'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'lafise'
    },
    {
        id: 'banesco',
        name: 'Banesco',
        fullName: 'Banesco Banco Múltiple',
        aliases: ['banesco', 'banco banesco'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'banesco'
    },
    {
        id: 'promerica',
        name: 'Banco Promerica',
        fullName: 'Banco Promerica República Dominicana',
        aliases: ['promerica', 'banco promerica'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'promerica'
    },
    {
        id: 'vimenca',
        name: 'Banco Vimenca',
        fullName: 'Banco Vimenca',
        aliases: ['vimenca', 'banco vimenca'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'vimenca'
    },
    {
        id: 'bonanza',
        name: 'Bonanza Banco',
        fullName: 'Bonanza Banco de Ahorro y Crédito',
        aliases: ['bonanza', 'bonanza banco', 'banco bonanza'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'bonanza'
    },
    {
        id: 'motor_credito',
        name: 'Motor Crédito',
        fullName: 'Banco de Ahorro y Crédito Motor Crédito',
        aliases: ['motor credito', 'motor crédito', 'banco motor credito'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'motorcredito'
    },
    {
        id: 'bellbank',
        name: 'Bell Bank',
        fullName: 'Banco de Ahorro y Crédito Bell Bank',
        aliases: ['bell bank', 'bellbank', 'banco bellbank'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'bellbank'
    },
    {
        id: 'ademi',
        name: 'Banco Ademi',
        fullName: 'Banco Múltiple Ademi',
        aliases: ['ademi', 'banco ademi'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'ademi'
    },
    {
        id: 'confisa',
        name: 'Banco Confisa',
        fullName: 'Banco de Ahorro y Crédito Confisa',
        aliases: ['confisa', 'banco confisa'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'confisa'
    },
    {
        id: 'qik',
        name: 'Qik Banco Digital',
        fullName: 'Qik Banco Digital Dominicano',
        aliases: ['qik', 'banco qik', 'qik banco digital'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'qik'
    },
    {
        id: 'apap',
        name: 'Asociación Popular (APAP)',
        fullName: 'Asociación Popular de Ahorros y Préstamos',
        aliases: ['apap', 'asociacion popular', 'asociación popular', 'asociación popular de ahorros y préstamos', 'asoc popular'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'apap'
    },
    {
        id: 'alnap',
        name: 'La Nacional (ALNAP)',
        fullName: 'Asociación La Nacional de Ahorros y Préstamos',
        aliases: ['alnap', 'la nacional', 'asociacion la nacional', 'asociación la nacional'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'alnap'
    },
    {
        id: 'acap',
        name: 'Asociación Cibao (ACAP)',
        fullName: 'Asociación Cibao de Ahorros y Préstamos',
        aliases: ['acap', 'asociacion cibao', 'asociación cibao', 'asociación cibao de ahorros y préstamos'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'acap'
    },
    {
        id: 'caribe_express',
        name: 'Caribe Express',
        fullName: 'Agente de Cambio Caribe Express',
        aliases: ['caribe express', 'caribe pack'],
        type: RATE_TYPES.RETAIL_BANK,
        logo: 'caribeexpress'
    },
    // Referencias Institucionales
    {
        id: 'bcrd',
        name: 'Banco Central RD',
        fullName: 'Banco Central de la República Dominicana',
        aliases: ['banco central', 'bcrd', 'banco central de la republica dominicana', 'banco central rd'],
        type: RATE_TYPES.OFFICIAL_REFERENCE,
        logo: 'bcrd'
    },
    {
        id: 'yahoo',
        name: 'Mercado Spot (Yahoo)',
        fullName: 'Yahoo Finance FX Market Ticker (DOP=X)',
        aliases: ['yahoo', 'yahoo finance', 'mercado spot', 'interbancario'],
        type: RATE_TYPES.MARKET,
        logo: 'yahoo'
    }
];
