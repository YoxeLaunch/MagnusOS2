/**
 * Temporal Governance & Anti-Lookahead Shield for MECE
 * 
 * Enforces bi-temporal integrity across economic observations:
 * 1. Event Time (Economic Period: period_start -> period_end)
 * 2. Release Time (published_at / valid_from -> valid_to)
 * 3. System Ingestion Time (retrieved_at)
 * 
 * Guarantees zero-lookahead bias during backtests and historical simulations.
 */

const SPANISH_MONTHS = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
};

/**
 * Standardizes a period string to canonical ISO format ('YYYY-MM' or 'YYYY-MM-DD').
 * Provides start and end dates.
 */
function parseCanonicalPeriod(rawPeriod) {
    if (!rawPeriod || typeof rawPeriod !== 'string') {
        return null;
    }
    const clean = rawPeriod.trim().toLowerCase();

    // ISO Monthly: YYYY-MM
    if (/^\d{4}-\d{2}$/.test(clean)) {
        const [year, month] = clean.split('-').map(Number);
        if (month < 1 || month > 12) return null;
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        return {
            period: clean,
            periodStart: `${clean}-01`,
            periodEnd: `${clean}-${String(lastDay).padStart(2, '0')}`,
            frequency: 'MONTHLY'
        };
    }

    // ISO Daily: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        return {
            period: clean,
            periodStart: clean,
            periodEnd: clean,
            frequency: 'DAILY'
        };
    }

    // Spanish Monthly: "Agosto 2026"
    const monthMatch = clean.match(/^([a-z]+)\s+(\d{4})$/);
    if (monthMatch && SPANISH_MONTHS[monthMatch[1]]) {
        const month = SPANISH_MONTHS[monthMatch[1]];
        const year = monthMatch[2];
        const period = `${year}-${month}`;
        const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
        return {
            period,
            periodStart: `${period}-01`,
            periodEnd: `${period}-${String(lastDay).padStart(2, '0')}`,
            frequency: 'MONTHLY'
        };
    }

    // Spanish Daily: "12 de Octubre 2026"
    const dayMatch = clean.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+(\d{4})$/);
    if (dayMatch && SPANISH_MONTHS[dayMatch[2]]) {
        const day = String(dayMatch[1]).padStart(2, '0');
        const month = SPANISH_MONTHS[dayMatch[2]];
        const year = dayMatch[3];
        const period = `${year}-${month}-${day}`;
        return {
            period,
            periodStart: period,
            periodEnd: period,
            frequency: 'DAILY'
        };
    }

    return null;
}

/**
 * Checks whether an economic observation was officially available in the public domain
 * as of a given simulation/cutoff timestamp (Zero-Lookahead Guarantee).
 * 
 * @param {Object} observation - Economic observation object
 * @param {Date|string} cutoffTimestamp - Simulation point in time (as-of date)
 * @param {Object} options - { strict: boolean }
 * @returns {Object} { available: boolean, reason: string }
 */
function isObservationAvailableAt(observation, cutoffTimestamp, { strict = true } = {}) {
    if (!cutoffTimestamp) {
        throw new Error('cutoffTimestamp is required for temporal availability evaluation');
    }
    const cutoff = new Date(cutoffTimestamp).getTime();
    if (isNaN(cutoff)) {
        throw new Error(`Invalid cutoffTimestamp: ${cutoffTimestamp}`);
    }

    // Case 1: Observation has explicit published_at
    if (observation.published_at) {
        const pubTime = new Date(observation.published_at).getTime();
        if (isNaN(pubTime)) {
            return {
                available: false,
                reason: 'MALFORMED_PUBLICATION_TIMESTAMP'
            };
        }
        if (pubTime > cutoff) {
            return {
                available: false,
                reason: 'LOOKAHEAD_VIOLATION_PUBLISHED_AFTER_CUTOFF',
                publishedAt: observation.published_at,
                cutoffDate: new Date(cutoff).toISOString()
            };
        }
        // Also check if valid_to is set and already superseded before cutoff
        if (observation.valid_to) {
            const validTo = new Date(observation.valid_to).getTime();
            if (validTo <= cutoff) {
                return {
                    available: false,
                    reason: 'SUPERSEDED_BY_NEWER_REVISION',
                    validTo: observation.valid_to
                };
            }
        }
        return { available: true, reason: 'VERIFIED_OFFICIAL_RELEASE' };
    }

    // Case 2: published_at is NULL / unknown
    if (strict) {
        return {
            available: false,
            reason: 'LOOKAHEAD_PROTECTION_BLOCKED_MISSING_PUBLISHED_AT',
            note: 'In strict backtesting mode, observations without verifiable publication timestamp are rejected'
        };
    }

    // Permissive mode: allow descriptive analysis with explicit caveat
    return {
        available: true,
        reason: 'PERMISSIVE_FALLBACK_UNVERIFIED_PUBLICATION',
        warning: 'Observation used without official publication timestamp; invalid for backtesting'
    };
}

/**
 * Resolves precedence among multiple revisions of the same indicator and period.
 * Selects the latest revision officially published as of cutoffTimestamp.
 * 
 * @param {Array<Object>} observations - Array of candidate observation records
 * @param {Date|string} cutoffTimestamp - Cutoff point in time
 * @returns {Object|null} The prevailing observation or null if none available
 */
function resolvePrevailingObservation(observations, cutoffTimestamp) {
    if (!Array.isArray(observations) || observations.length === 0) {
        return null;
    }

    // Filter by availability
    const available = observations.filter(obs => {
        const check = isObservationAvailableAt(obs, cutoffTimestamp, { strict: true });
        return check.available;
    });

    if (available.length === 0) {
        return null;
    }

    // Sort by revision_number DESC, then published_at DESC, then id DESC
    available.sort((a, b) => {
        const revA = Number(a.revision || a.revision_number || 1);
        const revB = Number(b.revision || b.revision_number || 1);
        if (revB !== revA) return revB - revA;

        const pubA = a.published_at ? new Date(a.published_at).getTime() : 0;
        const pubB = b.published_at ? new Date(b.published_at).getTime() : 0;
        return pubB - pubA;
    });

    return available[0];
}

/**
 * Evaluates publication status of a monthly indicator as of reference date.
 * E.g., for CPI of October 2026 evaluated on 2026-10-31, returns PENDING_RELEASE.
 */
function getMonthlyIndicatorPublicationStatus(period, referenceDate = '2026-10-31') {
    const p = parseCanonicalPeriod(period);
    if (!p) return { status: 'INVALID_PERIOD' };

    const ref = new Date(referenceDate);
    const [pYear, pMonth] = p.period.split('-').map(Number);
    const endOfMonth = new Date(Date.UTC(pYear, pMonth, 0, 23, 59, 59));

    // If reference date is on or before the end of the target economic month:
    if (ref.getTime() <= endOfMonth.getTime()) {
        return {
            status: 'PENDING_RELEASE',
            period: p.period,
            economicPeriodEnd: p.periodEnd,
            message: `El mes ${p.period} aún se encuentra en curso o cerrando al ${referenceDate}. La publicación oficial por BCRD ocurre habitualmente a mediados del mes subsiguiente.`,
            isAvailable: false
        };
    }

    // If economic month is past, but within early days of subsequent month (< 15th):
    const expectedReleaseEarliest = new Date(Date.UTC(pYear, pMonth, 5));
    if (ref.getTime() < expectedReleaseEarliest.getTime()) {
        return {
            status: 'IN_COMPILATION',
            period: p.period,
            expectedReleaseWindow: `${pYear}-${String(pMonth + 1).padStart(2, '0')}-05 to ${pYear}-${String(pMonth + 1).padStart(2, '0')}-13`,
            isAvailable: false
        };
    }

    return {
        status: 'ELIGIBLE_FOR_PUBLICATION',
        period: p.period,
        isAvailable: true
    };
}

export {
    parseCanonicalPeriod,
    isObservationAvailableAt,
    isObservationAvailableAt as isAvailableAtCutoff,
    resolvePrevailingObservation,
    getMonthlyIndicatorPublicationStatus
};

