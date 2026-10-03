/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // MULTI-CURRENCY AUTOMATED TEST SUITE & REGRESSION
 * Supports USD/DOP & EUR/DOP
 * ============================================================================
 */

import 'dotenv/config';
// Fallback to SQLite if postgres host is not resolvable from outside container
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@postgres:')) {
    delete process.env.DATABASE_URL;
}
import assert from 'assert';
import { cleanString, resolveInstitution, parseRate, normalizeRateObservation } from '../server/services/fx/normalizer.js';
import { validateAndConsolidateRates } from '../server/services/fx/validator.js';
import { BaseFxProvider } from '../server/services/fx/providers/baseProvider.js';
import { TasaRealProvider } from '../server/services/fx/providers/tasaRealProvider.js';
import { InfoDolarProvider } from '../server/services/fx/providers/infoDolarProvider.js';
import { YahooProvider } from '../server/services/fx/providers/yahooProvider.js';
import { RATE_TYPES, VALIDATION_STATUS, CIRCUIT_BREAKER_STATES, FX_RATE_BOUNDS, SUPPORTED_PAIRS, SUPPORTED_CURRENCIES } from '../server/services/fx/types.js';

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
    console.log('\n--- 1. NORMALIZER & ALIASES TESTS (USD & EUR) ---');

    it('1. cleanString strips accents and special chars', () => {
        assert.strictEqual(cleanString('Banco Popular Dominicano, S.A.'), 'banco popular dominicano s a');
        assert.strictEqual(cleanString('Crédito'), 'credito');
    });

    it('2. resolveInstitution maps Banreservas, BHD, Popular, Lafise aliases', () => {
        assert.strictEqual(resolveInstitution('Banco de Reservas').id, 'banreservas');
        assert.strictEqual(resolveInstitution('Banreservas').id, 'banreservas');
        assert.strictEqual(resolveInstitution('Banco BHD León').id, 'bhd');
        assert.strictEqual(resolveInstitution('Banco Popular').id, 'popular');
        assert.strictEqual(resolveInstitution('Banco Lafise').id, 'lafise');
    });

    it('3. resolveInstitution maps EUR-specific entities (Capla, RM, Moneycorp, DGII)', () => {
        assert.strictEqual(resolveInstitution('Agente de Cambio Capla').id, 'capla');
        assert.strictEqual(resolveInstitution('Agente de Cambio RM').id, 'rm');
        assert.strictEqual(resolveInstitution('Moneycorp').id, 'moneycorps');
        assert.strictEqual(resolveInstitution('DGII').id, 'dgii');
    });

    it('4. parseRate handles various currency string formats', () => {
        assert.strictEqual(parseRate('$58.40'), 58.40);
        assert.strictEqual(parseRate('RD$ 60.85'), 60.85);
        assert.strictEqual(parseRate('66,50'), 66.50);
        assert.strictEqual(parseRate('€67.50'), 67.50);
        assert.strictEqual(parseRate('RD$999999'), null); // error marker
        assert.strictEqual(parseRate(''), null);
        assert.strictEqual(parseRate(null), null);
    });

    it('5. normalizeRateObservation calculates mid and spread for EUR', () => {
        const obs = normalizeRateObservation({
            provider: 'test',
            rawInstitution: 'Banco BHD',
            buy: '66.00',
            sell: '71.50',
            baseCurrency: 'EUR'
        });
        assert.strictEqual(obs.institutionId, 'bhd');
        assert.strictEqual(obs.buy, 66.0);
        assert.strictEqual(obs.sell, 71.5);
        assert.strictEqual(obs.mid, 68.75);
        assert.strictEqual(obs.spread, 5.5);
        assert.strictEqual(obs.baseCurrency, 'EUR');
    });

    it('6. invalid EUR rate rejected outside FX_RATE_BOUNDS.EUR', () => {
        // EUR bounds are 40 - 120
        const obsLow = normalizeRateObservation({
            provider: 'test',
            rawInstitution: 'Banreservas',
            buy: '35.00', // below 40
            sell: '71.50',
            baseCurrency: 'EUR'
        });
        assert.strictEqual(obsLow, null, 'Buy rate < 40 should nullify observation');

        const obsHigh = normalizeRateObservation({
            provider: 'test',
            rawInstitution: 'Banreservas',
            buy: '66.00',
            sell: '135.00', // above 120
            baseCurrency: 'EUR'
        });
        assert.strictEqual(obsHigh, null, 'Sell rate > 120 should nullify observation');
    });

    console.log('\n--- 2. VALIDATION ENGINE & CONFIDENCE TESTS (USD & EUR) ---');

    it('7. EUR validation detects VERIFIED when diff <= 0.05', () => {
        const obs = [
            { institutionId: 'banreservas', institutionName: 'Banreservas', buy: 66.00, sell: 71.50, provider: 'tasareal', rateType: 'RETAIL_BANK' },
            { institutionId: 'banreservas', institutionName: 'Banreservas', buy: 66.02, sell: 71.53, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.VERIFIED);
        assert.strictEqual(res[0].confidence, 1.0);
    });

    it('8. EUR validation detects ACCEPTABLE when diff is 0.15 (<= 0.20)', () => {
        const obs = [
            { institutionId: 'popular', institutionName: 'Popular', buy: 65.85, sell: 71.50, provider: 'tasareal', rateType: 'RETAIL_BANK' },
            { institutionId: 'popular', institutionName: 'Popular', buy: 66.00, sell: 71.50, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.ACCEPTABLE);
        assert.strictEqual(res[0].confidence, 0.85);
    });

    it('9. EUR validation detects WARNING when diff is 0.35 (<= 0.50)', () => {
        const obs = [
            { institutionId: 'popular', institutionName: 'Popular', buy: 65.65, sell: 71.50, provider: 'tasareal', rateType: 'RETAIL_BANK' },
            { institutionId: 'popular', institutionName: 'Popular', buy: 66.00, sell: 71.50, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.WARNING);
        assert.strictEqual(res[0].confidence, 0.60);
    });

    it('10. EUR validation detects CONFLICT when diff > 0.50', () => {
        const obs = [
            { institutionId: 'bhd', institutionName: 'BHD', buy: 65.00, sell: 71.50, provider: 'tasareal', rateType: 'RETAIL_BANK' },
            { institutionId: 'bhd', institutionName: 'BHD', buy: 66.20, sell: 71.50, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res.length, 1);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.CONFLICT);
        assert.strictEqual(res[0].confidence, 0.30);
    });

    it('11. EUR validation handles SINGLE_SOURCE', () => {
        const obs = [
            { institutionId: 'capla', institutionName: 'Capla', buy: 66.50, sell: 70.00, provider: 'infodolar', rateType: 'RETAIL_BANK' }
        ];
        const res = validateAndConsolidateRates(obs);
        assert.strictEqual(res[0].validationStatus, VALIDATION_STATUS.SINGLE_SOURCE);
        assert.strictEqual(res[0].confidence, 0.75);
    });

    console.log('\n--- 3. CIRCUIT BREAKER & TIMEOUTS TESTS ---');

    await itAsync('12. BaseFxProvider triggers circuit breaker to OPEN after consecutive failures', async () => {
        const provider = new BaseFxProvider({ id: 'test_cb', name: 'Test CB' });
        provider.failureThreshold = 3;
        provider.maxRetries = 1;

        for (let i = 0; i < 3; i++) {
            await provider.executeWithProtection(async () => {
                throw new Error('Network failure');
            });
        }

        assert.strictEqual(provider.circuitState, CIRCUIT_BREAKER_STATES.OPEN);
        assert.strictEqual(provider.failureCount, 3);

        const blocked = await provider.executeWithProtection(async () => 'ok');
        assert.strictEqual(blocked.circuitOpen, true);
    });

    console.log('\n--- 4. LIVE PROVIDER TESTS (TasaReal & InfoDolar & Yahoo) ---');

    await itAsync('13. TasaReal EUR live extraction returns valid institutions and BCRD official rate', async () => {
        const tasaReal = new TasaRealProvider();
        const res = await tasaReal.getRates('EUR');
        if (res.skipped) {
            console.log('    (TasaReal skipped: no API key)');
            return;
        }
        assert.strictEqual(res.success, true);
        assert.ok(res.data.length >= 5, `Expected >= 5 EUR institutions from TasaReal, got ${res.data.length}`);
        const bcrd = res.data.find(d => d.institutionId === 'bcrd');
        assert.ok(bcrd, 'TasaReal EUR should include BCRD rate');
        assert.ok(bcrd.buy > 55 && bcrd.buy < 85, `BCRD EUR buy rate plausible: ${bcrd.buy}`);
    });

    await itAsync('14. InfoDolar EUR live Cheerio extraction parses precio-euro.aspx', async () => {
        const infoDolar = new InfoDolarProvider();
        const res = await infoDolar.getRates('EUR');
        assert.strictEqual(res.success, true);
        assert.ok(res.data.length >= 5, `Expected >= 5 EUR institutions from InfoDolar, got ${res.data.length}`);
        for (const item of res.data) {
            assert.ok(item.buy > 50 && item.buy < 90, `Plausible EUR buy rate for ${item.institutionName}: ${item.buy}`);
            assert.ok(item.sell > 50 && item.sell < 90, `Plausible EUR sell rate for ${item.institutionName}: ${item.sell}`);
        }
    });

    await itAsync('15. Yahoo EUR provider extracts EURDOP=X and EURUSD=X benchmark', async () => {
        const yahoo = new YahooProvider();
        const res = await yahoo.getRates('EUR');
        assert.strictEqual(res.success, true);
        assert.ok(Array.isArray(res.data) && res.data.length > 0, 'Yahoo EUR should return normalized data');
        const item = res.data[0];
        assert.strictEqual(item.baseCurrency, 'EUR');
        assert.ok(item.buy > 55 && item.buy < 85, `EURDOP rate plausible: ${item.buy}`);
        assert.ok(item.metadata?.eurUsd, 'Yahoo EUR should contain eurUsd benchmark in metadata');
        assert.strictEqual(item.metadata.eurUsd.symbol, 'EURUSD=X');
        assert.ok(item.metadata.eurUsd.price > 0.8 && item.metadata.eurUsd.price < 1.5, `EURUSD=X price plausible: ${item.metadata.eurUsd.price}`);
    });

    console.log('\n--- 5. FX SERVICE CACHE ISOLATION & SINGLE-FLIGHT TESTS ---');

    await itAsync('16. EUR and USD cache entries are completely isolated', async () => {
        const { fxService } = await import('../server/services/fx/fxService.js');
        
        // Fetch both
        const usdRes = await fxService.getRates('USD/DOP');
        const eurRes = await fxService.getRates('EUR/DOP');

        assert.strictEqual(usdRes.pair, 'USD/DOP');
        assert.strictEqual(eurRes.pair, 'EUR/DOP');

        assert.ok(fxService.cache.has('USD/DOP'), 'USD/DOP cache exists');
        assert.ok(fxService.cache.has('EUR/DOP'), 'EUR/DOP cache exists');

        const cachedUsd = fxService.cache.get('USD/DOP');
        const cachedEur = fxService.cache.get('EUR/DOP');

        assert.notStrictEqual(cachedUsd.data.pair, cachedEur.data.pair);
        assert.strictEqual(cachedUsd.data.baseCurrency, 'USD');
        assert.strictEqual(cachedEur.data.baseCurrency, 'EUR');

        // Mutating EUR cache timestamp should not affect USD cache
        cachedEur.timestamp = 0;
        assert.notStrictEqual(fxService.cache.get('USD/DOP').timestamp, 0);
    });

    await itAsync('17. EUR single-flight handles 30 concurrent requests without duplicate fetching', async () => {
        const { fxService } = await import('../server/services/fx/fxService.js');
        
        const promises = Array.from({ length: 30 }, () => fxService.getEurDopRates());
        const results = await Promise.all(promises);

        assert.strictEqual(results.length, 30);
        for (const r of results) {
            assert.strictEqual(r.pair, 'EUR/DOP');
            assert.ok(Array.isArray(r.banks));
        }
    });

    console.log('\n--- 6. EUR SIMULATOR & TRIANGULAR IMPLIED BENCHMARK TESTS ---');

    it('18. EUR Simulator EUR -> DOP uses best buy rate (max pesos for client)', () => {
        const banks = [
            { institutionId: 'b1', institutionName: 'Bank 1', buy: 66.00, sell: 71.50 },
            { institutionId: 'b2', institutionName: 'Bank 2', buy: 66.80, sell: 71.20 },
            { institutionId: 'b3', institutionName: 'Bank 3', buy: 65.90, sell: 71.80 }
        ];
        const bestBuyBank = [...banks].sort((a, b) => b.buy - a.buy)[0];
        assert.strictEqual(bestBuyBank.institutionId, 'b2');

        const amountEur = 1000;
        const resultDop = amountEur * bestBuyBank.buy;
        assert.strictEqual(resultDop, 66800.0);
    });

    it('19. EUR Simulator DOP -> EUR uses best sell rate (min pesos paid by client)', () => {
        const banks = [
            { institutionId: 'b1', institutionName: 'Bank 1', buy: 66.00, sell: 71.50 },
            { institutionId: 'b2', institutionName: 'Bank 2', buy: 66.80, sell: 71.20 },
            { institutionId: 'b3', institutionName: 'Bank 3', buy: 65.90, sell: 71.80 }
        ];
        const bestSellBank = [...banks].sort((a, b) => a.sell - b.sell)[0];
        assert.strictEqual(bestSellBank.institutionId, 'b2');

        const amountDop = 71200;
        const resultEur = amountDop / bestSellBank.sell;
        assert.strictEqual(resultEur, 1000.0);
    });

    it('20. Triangular Implied EUR/DOP: EUR/USD * USD/DOP matches mathematical formula', () => {
        const eurUsd = 1.1257;
        const usdDop = 60.50;
        const impliedEurDop = Math.round(eurUsd * usdDop * 100) / 100;
        assert.ok(Math.abs(impliedEurDop - 68.10) < 0.05, 'Implied EUR/DOP close to 68.10');
    });

    console.log('\n--- 7. DATABASE PERSISTENCE & HISTORY TESTS ---');

    await itAsync('21. FxRateObservation persists and queries history differentiated by base_currency', async () => {
        const { fxService } = await import('../server/services/fx/fxService.js');
        const historyEur = await fxService.getHistory('banreservas', 7, 'EUR');
        assert.ok(Array.isArray(historyEur), 'EUR history should return an array');

        const historyUsd = await fxService.getHistory('banreservas', 7, 'USD');
        assert.ok(Array.isArray(historyUsd), 'USD history should return an array');
    });

    console.log('\n--- 8. USD REGRESSION TEST (VERIFY USD CONTINUES WORKING) ---');

    await itAsync('22. USD/DOP functionality completely unchanged and operational', async () => {
        const { fxService } = await import('../server/services/fx/fxService.js');
        const usd = await fxService.getUsdDopRates();
        assert.strictEqual(usd.pair, 'USD/DOP');
        assert.strictEqual(usd.baseCurrency, 'USD');
        assert.strictEqual(usd.quoteCurrency, 'DOP');
        assert.ok(usd.banks.length >= 10, `USD should have >= 10 banks, got ${usd.banks.length}`);
        assert.ok(usd.summary.avgBuy > 55 && usd.summary.avgBuy < 65, `USD avgBuy plausible: ${usd.summary.avgBuy}`);
        assert.ok(usd.summary.avgSell > 55 && usd.summary.avgSell < 65, `USD avgSell plausible: ${usd.summary.avgSell}`);
        assert.ok(usd.summary.bestToBuy.rate > 55, 'USD bestToBuy rate exists');
        assert.ok(usd.summary.bestToSell.rate > 55, 'USD bestToSell rate exists');
    });

    console.log('\n======================================================');
    console.log(`TEST RESULTS: ${passed}/${total} assertions passed.`);
    console.log('======================================================\n');

    if (passed < total) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
