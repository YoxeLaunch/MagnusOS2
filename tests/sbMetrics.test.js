import test from 'node:test';
import assert from 'node:assert/strict';
import {
    assessSbVolumeAnomalies,
    calculateHhi,
    classifyHhi,
    getSbOperationalStatus
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
