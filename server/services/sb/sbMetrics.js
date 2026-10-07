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
