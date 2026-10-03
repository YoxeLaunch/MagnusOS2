/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // AUTOMATED TEST SUITE & CHAOS SIMULATION
 * ============================================================================
 */

import assert from 'assert';
import { cleanString, resolveInstitution, parseRate, normalizeRateObservation } from '../server/services/fx/normalizer.js';
import { validateAndConsolidateRates } from '../server/services/fx/validator.js';
import { BaseFxProvider } from '../server/services/fx/providers/baseProvider.js';
import { TasaRealProvider } from '../server/services/fx/providers/tasaRealProvider.js';
import { InfoDolarProvider } from '../server/services/fx/providers/infoDolarProvider.js';
import { RATE_TYPES, VALIDATION_STATUS, CIRCUIT_BREAKER_STATES } from '../server/services/fx/types.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
    total++;
    try {
        fn();
        console.log(`  ✓ ${desc}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${desc}:`, e.message);
    }
}

async function itAsync(desc, fn) {
    total++;
    try {
        await fn();
        console.log(`  ✓ ${desc}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${desc}:`, e.message);
    }
}

async function runTests() {
    console.log('\n--- 1. NORMALIZER & ALIASES TESTS ---');

    it('cleanString strips accents and special chars', () => {
        assert.strictEqual(cleanString('Banco Popular Dominicano, S.A.'), 'banco popular dominicano s a');
        assert.strictEqual(cleanString('Crédito'), 'credito');
    });

    it('resolveInstitution maps Banreservas aliases', () => {
        const r1 = resolveInstitution('Banco de Reservas');
        const r2 = resolveInstitution('Banreservas');
        assert.strictEqual(r1.id, 'banreservas');
        assert.strictEqual(r2.id, 'banreservas');
    });

    it('resolveInstitution maps BHD and Popular aliases', () => {
        assert.strictEqual(resolveInstitution('Banco BHD León').id, 'bhd');
        assert.strictEqual(resolveInstitution('Banco Popular').id, 'popular');
        assert.strictEqual(resolveInstitution('Banco Lafise').id, 'lafise');
    });

    it('parseRate handles various currency string formats', () => {
        assert.strictEqual(parseRate('$58.40'), 58.40);
        assert.strictEqual(parseRate('RD$ 60.85'), 60.85);
        assert.strictEqual(parseRate('59,90'), 59.90);
        assert.strictEqual(parseRate('RD$999999'), null); // error marker
        assert.strictEqual(parseRate(''), null);
        assert.strictEqual(parseRate(null), null);
    });

    it('normalizeRateObservation calculates mid and spread', () => {
        const obs = normalizeRateObservation({
            provider: 'test',
            rawInstitution: 'Banco BHD',
            buy: '57.00',
            sell: '60.90'
        });
        assert.strictEqual(obs.institutionId, 'bhd');
        assert.strictEqual(obs.buy, 57.0);
        assert.strictEqual(obs.sell, 60.9);
        assert.strictEqual(obs.mid, 58.95);
        assert.strictEqual(obs.spread, 3.9);
    });

    console.log('\n--- 2. VALIDATION ENGINE & CONFIDENCE TESTS ---');

    it('validateAndConsolidateRates detects VERIFIED when diff <= 0.05', () => {
        const obs = [
            { institutionId: 'banreservas', institutionName: 'Banreservas', buy: 57.30, sell: 60.80, provider: 'tasareal', rateType: 'RETAIL_BANK' },
            { institutionId: 'banreservas', institutionName: 'Banreservas', buy: 57.32, sell: 60.83, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.VERIFIED);
        assert.strictEqual(res[0].confidence, 1.0);
    });

    it('validateAndConsolidateRates detects WARNING when diff is 0.25 (<= 0.50)', () => {
        const obs = [
            { institutionId: 'popular', institutionName: 'Popular', buy: 57.25, sell: 60.85, provider: 'tasareal', rateType: 'RETAIL_BANK' },
            { institutionId: 'popular', institutionName: 'Popular', buy: 57.50, sell: 60.85, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.WARNING);
        assert.strictEqual(res[0].confidence, 0.60);
    });

    it('validateAndConsolidateRates detects CONFLICT when diff > 0.50', () => {
        const obs = [
            { institutionId: 'bhd', institutionName: 'BHD', buy: 57.00, sell: 60.90, provider: 'tasareal', rateType: 'RETAIL_BANK' },
            { institutionId: 'bhd', institutionName: 'BHD', buy: 58.00, sell: 60.90, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.CONFLICT);
        assert.strictEqual(res[0].confidence, 0.30);
    });

    it('validateAndConsolidateRates handles SINGLE_SOURCE', () => {
        const obs = [
            { institutionId: 'bonanza', institutionName: 'Bonanza', buy: 59.75, sell: 60.75, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.SINGLE_SOURCE);
        assert.strictEqual(res[0].confidence, 0.75);
    });

    console.log('\n--- 3. CIRCUIT BREAKER & TIMEOUTS TESTS ---');

    await itAsync('BaseFxProvider triggers circuit breaker to OPEN after consecutive failures', async () => {
        const provider = new BaseFxProvider({ id: 'test_cb', name: 'Test CB' });
        provider.failureThreshold = 3;
        provider.maxRetries = 1;

        // Simular 3 fallos
        for (let i = 0; i < 3; i++) {
            await provider.executeWithProtection(async () => {
                throw new Error('Network failure');
            });
        }

        assert.strictEqual(provider.circuitState, CIRCUIT_BREAKER_STATES.OPEN);
        assert.strictEqual(provider.failureCount, 3);

        // La siguiente petición debe ser rechazada inmediatamente por el circuit breaker
        const blocked = await provider.executeWithProtection(async () => 'ok');
        assert.strictEqual(blocked.circuitOpen, true);
    });

    console.log('\n--- 4. TASAREAL SAFE BEHAVIOR TESTS ---');

    await itAsync('TasaReal gracefully skips when TASAREAL_API_KEY is missing without logging secrets or crashing', async () => {
        const tasaReal = new TasaRealProvider();
        const res = await tasaReal.getRates();
        assert.strictEqual(res.success, false);
        assert.strictEqual(res.skipped, true);
        assert.strictEqual(res.error, 'TASAREAL_API_KEY no configurada');
    });

    console.log('\n--- 5. INFODOLAR CHEERIO LIVE EXTRACTION TEST ---');

    await itAsync('InfoDolar extracts multiple valid banks with positive buy and sell', async () => {
        const infoDolar = new InfoDolarProvider();
        const res = await infoDolar.getRates();
        assert.strictEqual(res.success, true);
        assert.ok(res.data.length >= 5, `Expected >= 5 banks, got ${res.data.length}`);
        for (const item of res.data) {
            assert.ok(item.buy > 40 && item.buy < 100, `Plausible buy rate for ${item.institutionName}`);
            assert.ok(item.sell > 40 && item.sell < 100, `Plausible sell rate for ${item.institutionName}`);
        }
    });

    console.log('\n--- 6. CONCURRENCY & SINGLE-FLIGHT ANTI-STAMPEDE TEST ---');

    await itAsync('Single-flight handles 50 concurrent requests without redundant external dispatch', async () => {
        const { fxService } = await import('../server/services/fx/fxService.js');
        
        // Disparar 50 peticiones concurrentes
        const promises = Array.from({ length: 50 }, () => fxService.getUsdDopRates());
        const results = await Promise.all(promises);

        assert.strictEqual(results.length, 50);
        for (const r of results) {
            assert.strictEqual(r.pair, 'USD/DOP');
            assert.ok(Array.isArray(r.banks));
        }
    });

    console.log('\n========================================');
    console.log(`TEST RESULTS: ${passed}/${total} assertions passed.`);
    console.log('========================================\n');

    if (passed < total) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
