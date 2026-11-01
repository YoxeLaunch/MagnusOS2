/**
 * Small, dependency-free financial and operational helpers for SB v2.
 * They are deliberately kept outside controllers to make their assumptions testable.
 */

export const calculateHhi = (balances) => {
    const total = balances.reduce((sum, balance) => sum + Number(balance || 0), 0);
    if (total <= 0) return 0;
    return Number(balances
        .reduce((sum, balance) => {
            const sharePct = (Number(balance || 0) / total) * 100;
            return sum + (sharePct ** 2);
        }, 0)
        .toFixed(2));
};

export const classifyHhi = (value) => {
    if (value < 1500) return 'LOW_CONCENTRATION';
    if (value <= 2500) return 'MODERATE_CONCENTRATION';
    return 'HIGH_CONCENTRATION';
};

export const getSbOperationalStatus = ({ enabled, hasPrimaryKey, hasSecondaryKey }) => {
    if (!enabled) return 'DISABLED';
    if (!hasPrimaryKey && !hasSecondaryKey) return 'MISCONFIGURED';
    return 'HEALTHY';
};

export const assessSbVolumeAnomalies = ({ current, previous, recordDropThresholdPct = 10 }) => {
    if (!previous) return [];

    const warnings = [];
    if (current.entityCount !== previous.entityCount) {
        warnings.push({
            code: 'ENTITY_COUNT_CHANGED',
            current: current.entityCount,
            previous: previous.entityCount
        });
    }

    if (previous.recordCount > 0) {
        const changePct = ((current.recordCount - previous.recordCount) / previous.recordCount) * 100;
        if (changePct <= -recordDropThresholdPct) {
            warnings.push({
                code: 'RECORD_COUNT_DROP',
                current: current.recordCount,
                previous: previous.recordCount,
                changePct: Number(changePct.toFixed(2))
            });
        }
    }

    return warnings;
};

/**
 * Evalúa el estado de frescura temporal de un corte oficial SB.
 * Estados canónicos: 'CURRENT' | 'STALE' | 'PARTIAL' | 'UNAVAILABLE'
 */
export const determineSbFreshness = ({ referencePeriod, recordCount, entityCount, now = new Date() }) => {
    if (!referencePeriod || !recordCount || recordCount <= 0) {
        return 'UNAVAILABLE';
    }
    if (typeof entityCount === 'number' && entityCount < 30) {
        return 'PARTIAL';
    }

    const [yearStr, monthStr] = referencePeriod.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
        return 'UNAVAILABLE';
    }

    // El corte mensual oficial SB finaliza el último día del mes correspondiente
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const nowUtc = new Date(now.getTime());
    const ageDays = (nowUtc.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays < 0) {
        return 'PARTIAL';
    }

    // Rezago regulatorio habitual de la Superintendencia de Bancos: 30 a 75 días
    if (ageDays <= 75) {
        return 'CURRENT';
    }

    return 'STALE';
};

/**
 * Construye el metadato temporal canónico para respuestas SB.
 */
export const buildSbTemporalMeta = ({ referencePeriod, syncRun = null, recordCount = 0, entityCount = 0, now = new Date() }) => {
    const freshness = determineSbFreshness({ referencePeriod, recordCount, entityCount, now });
    return {
        source: 'SB v2 API',
        referencePeriod: referencePeriod || null,
        publishedAt: syncRun?.metadata?.completedAt || null,
        syncedAt: syncRun?.executed_at ? new Date(syncRun.executed_at).toISOString() : null,
        freshness,
        snapshotId: syncRun?.id ?? null
    };
};

