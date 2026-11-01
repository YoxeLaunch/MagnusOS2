import test from 'node:test';
import assert from 'node:assert/strict';
import {
    assessSbVolumeAnomalies,
    calculateHhi,
    classifyHhi,
    getSbOperationalStatus,
    determineSbFreshness,
    buildSbTemporalMeta
} from '../server/services/sb/sbMetrics.js';

test('SB HHI uses percentage shares on the 0-10000 scale', () => {
    assert.equal(calculateHhi([50, 50]), 5000);
    // Known universe: 40%, 30%, 20%, 10% => 40² + 30² + 20² + 10² = 3,000.
    assert.equal(calculateHhi([40, 30, 20, 10]), 3000);
    assert.equal(classifyHhi(2024.84), 'MODERATE_CONCENTRATION');
});

test('SB operational status refuses enabled ingestion without credentials', () => {
    assert.equal(getSbOperationalStatus({ enabled: true, hasPrimaryKey: false, hasSecondaryKey: false }), 'MISCONFIGURED');
    assert.equal(getSbOperationalStatus({ enabled: true, hasPrimaryKey: true, hasSecondaryKey: false }), 'HEALTHY');
});

test('SB volume monitoring warns without blocking an entity or record decline', () => {
    assert.deepEqual(assessSbVolumeAnomalies({
        current: { entityCount: 39, recordCount: 2136 },
        previous: { entityCount: 40, recordCount: 2184 }
    }), [{ code: 'ENTITY_COUNT_CHANGED', current: 39, previous: 40 }]);
    assert.equal(assessSbVolumeAnomalies({
        current: { entityCount: 40, recordCount: 1900 },
        previous: { entityCount: 40, recordCount: 2184 }
    })[0].code, 'RECORD_COUNT_DROP');
});

test('SB freshness evaluates temporal boundaries correctly', () => {
    const fixedNow = new Date('2026-11-01T00:00:00Z');

    // Septiembre 2026 terminó el 2026-09-30 (32 días al 1 de nov -> CURRENT)
    assert.equal(determineSbFreshness({
        referencePeriod: '2026-09',
        recordCount: 2202,
        entityCount: 40,
        now: fixedNow
    }), 'CURRENT');

    // Agosto 2026 terminó el 2026-08-31 (62 días al 1 de nov -> CURRENT dentro del rezago regulatorio <= 75 días)
    assert.equal(determineSbFreshness({
        referencePeriod: '2026-08',
        recordCount: 2136,
        entityCount: 39,
        now: fixedNow
    }), 'CURRENT');

    // Mayo 2026 terminó el 2026-05-31 (>150 días -> STALE)
    assert.equal(determineSbFreshness({
        referencePeriod: '2026-05',
        recordCount: 2182,
        entityCount: 40,
        now: fixedNow
    }), 'STALE');

    // Entidades incompletas (<30) -> PARTIAL
    assert.equal(determineSbFreshness({
        referencePeriod: '2026-09',
        recordCount: 500,
        entityCount: 15,
        now: fixedNow
    }), 'PARTIAL');

    // Sin datos -> UNAVAILABLE
    assert.equal(determineSbFreshness({
        referencePeriod: null,
        recordCount: 0,
        entityCount: 0,
        now: fixedNow
    }), 'UNAVAILABLE');
});

test('buildSbTemporalMeta formats canonical contract matching specification', () => {
    const meta = buildSbTemporalMeta({
        referencePeriod: '2026-09',
        syncRun: {
            id: 10,
            executed_at: '2026-10-19T20:56:40.698Z',
            metadata: { completedAt: '2026-10-19T20:56:40.698Z' }
        },
        recordCount: 2202,
        entityCount: 40,
        now: new Date('2026-11-01T00:00:00Z')
    });

    assert.equal(meta.source, 'SB v2 API');
    assert.equal(meta.referencePeriod, '2026-09');
    assert.equal(meta.publishedAt, '2026-10-19T20:56:40.698Z');
    assert.equal(meta.syncedAt, '2026-10-19T20:56:40.698Z');
    assert.equal(meta.freshness, 'CURRENT');
    assert.equal(meta.snapshotId, 10);
});
