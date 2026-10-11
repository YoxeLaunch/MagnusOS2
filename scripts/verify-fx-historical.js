/**
 * ============================================================================
 * PROVIDENCE FX // AUTOMATED VERIFICATION & QUALITY AUDIT SUITE
 * Validates integrity, decimal precision, deduplication, time-series continuity,
 * and live scheduler compatibility across all ingested observations.
 * ============================================================================
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

// Ensure host can connect to docker postgres if needed
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@postgres:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@172.19.0.2:');
}

const { sequelize, FxRateObservation, FxProviderHealth } = await import('../server/models/index.js');
const { fxService } = await import('../server/services/fx/fxService.js');

async function runAudit() {
    console.log('===============================================================');
    console.log('PROVIDENCE FX // RUNNING AUTOMATED AUDIT & VERIFICATION SUITE');
    console.log('===============================================================');

    const results = {
        passed: 0,
        failed: 0,
        checks: []
    };

    function record(name, pass, detail) {
        if (pass) results.passed++;
        else results.failed++;
        results.checks.push({ name, pass: pass ? 'PASS' : 'FAIL', detail });
        console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${detail}`);
    }

    try {
        // Test 1: Total records count
        const total = await FxRateObservation.count();
        record('Total Ingested Observations', total >= 25000, `Found ${total} observations in database`);

        // Test 2: Check for any duplicate records
        const [dupRes] = await sequelize.query(`
            SELECT provider, institution_id, base_currency, quote_currency, rate_type, observed_at, COUNT(*) as c
            FROM public.fx_rate_observations
            GROUP BY provider, institution_id, base_currency, quote_currency, rate_type, observed_at
            HAVING COUNT(*) > 1;
        `);
        record('Zero Duplicates (Strict Idempotency)', dupRes.length === 0, `${dupRes.length} duplicate groups detected`);

        // Test 3: Pre-existing live data conservation (tasareal + infodolar pre-existing observations)
        const [liveRes] = await sequelize.query(`
            SELECT provider, COUNT(*) as c
            FROM public.fx_rate_observations
            WHERE provider IN ('tasareal', 'infodolar')
            GROUP BY provider;
        `);
        const preExistingCount = liveRes.reduce((acc, row) => acc + parseInt(row.c, 10), 0);
        record('Preservation of Existing Live Data', preExistingCount >= 537, `Preserved ${preExistingCount} observations for commercial providers`);

        // Test 4: Decimal Precision and Exact Money Integrity
        const [exactRes] = await sequelize.query(`
            SELECT COUNT(*) as c
            FROM public.fx_rate_observations
            WHERE buy IS NOT NULL AND buy_exact IS NULL;
        `);
        const missingExact = parseInt(exactRes[0].c, 10);
        record('Exact-Money Decimal Precision (NUMERIC 12,6)', missingExact === 0, `${missingExact} records with missing buy_exact`);

        // Test 5: No negative or zero values
        const [zeroRes] = await sequelize.query(`
            SELECT COUNT(*) as c
            FROM public.fx_rate_observations
            WHERE (buy IS NOT NULL AND buy <= 0) OR (sell IS NOT NULL AND sell <= 0);
        `);
        const zeroCount = parseInt(zeroRes[0].c, 10);
        record('Non-zero and Positive Rates', zeroCount === 0, `${zeroCount} records with non-positive rates`);

        // Test 6: Inverted spread anomaly check (buy > sell on commercial banks)
        const [spreadRes] = await sequelize.query(`
            SELECT COUNT(*) as c
            FROM public.fx_rate_observations
            WHERE rate_type = 'RETAIL_BANK' AND buy IS NOT NULL AND sell IS NOT NULL AND sell < buy;
        `);
        const invertedSpreads = parseInt(spreadRes[0].c, 10);
        record('Commercial Spread Invariant (buy <= sell)', invertedSpreads === 0, `${invertedSpreads} commercial records with inverted spreads`);

        // Test 7: Valid currency pairs
        const [pairRes] = await sequelize.query(`
            SELECT COUNT(*) as c
            FROM public.fx_rate_observations
            WHERE base_currency NOT IN ('USD', 'EUR') OR quote_currency != 'DOP';
        `);
        const invalidPairs = parseInt(pairRes[0].c, 10);
        record('Valid ISO Currency Pairs (USD/DOP & EUR/DOP)', invalidPairs === 0, `${invalidPairs} invalid currency pairs`);

        // Test 8: Economic date integrity
        const [dateRes] = await sequelize.query(`
            SELECT COUNT(*) as c
            FROM public.fx_rate_observations
            WHERE economic_date IS NULL;
        `);
        const nullDates = parseInt(dateRes[0].c, 10);
        record('Economic Date Alignment', nullDates === 0, `${nullDates} records missing economic_date`);

        // Test 9: BCRD Earliest Date Verification
        const [bcrdDates] = await sequelize.query(`
            SELECT 
                base_currency, 
                MIN(economic_date) as min_date, 
                MAX(economic_date) as max_date,
                COUNT(*) as count
            FROM public.fx_rate_observations
            WHERE provider = 'bcrd'
            GROUP BY base_currency;
        `);
        const usdMin = bcrdDates.find(r => r.base_currency === 'USD')?.min_date;
        const eurMin = bcrdDates.find(r => r.base_currency === 'EUR')?.min_date;
        record('BCRD Official USD Earliest Date (1991)', usdMin === '1991-01-02', `Earliest BCRD USD is ${usdMin}`);
        record('BCRD Official EUR Earliest Date (2004)', eurMin === '2004-01-02', `Earliest BCRD EUR is ${eurMin}`);

        // Test 10: Yahoo Finance Series Coverage
        const [yahooDates] = await sequelize.query(`
            SELECT 
                base_currency, 
                MIN(economic_date) as min_date, 
                MAX(economic_date) as max_date,
                COUNT(*) as count
            FROM public.fx_rate_observations
            WHERE provider = 'yahoo'
            GROUP BY base_currency;
        `);
        const yahooUsdMin = yahooDates.find(r => r.base_currency === 'USD')?.min_date;
        const yahooEurMin = yahooDates.find(r => r.base_currency === 'EUR')?.min_date;
        record('Yahoo Finance Market USD History (2003+)', yahooUsdMin <= '2004-01-01', `Earliest Yahoo USD is ${yahooUsdMin}`);
        record('Yahoo Finance Market EUR History (2006+)', yahooEurMin <= '2006-06-01', `Earliest Yahoo EUR is ${yahooEurMin}`);

        // Test 11: Live Rates SWR & Scheduler Compatibility
        const liveUsd = await fxService.getRates('USD/DOP', { forceRefresh: false });
        const liveEur = await fxService.getRates('EUR/DOP', { forceRefresh: false });
        record('Live FX SWR Compatibility USD/DOP', Boolean(liveUsd?.summary?.avgSell), `Live USD average sell: ${liveUsd?.summary?.avgSell} DOP`);
        record('Live FX SWR Compatibility EUR/DOP', Boolean(liveEur?.summary?.avgSell || liveEur?.reference?.official?.sell), `Live EUR rate: ${liveEur?.summary?.avgSell || liveEur?.reference?.official?.sell} DOP`);

        // Test 12: Expanded API getHistory execution
        const apiHistory = await fxService.getHistory({
            provider: 'bcrd',
            currency: 'USD',
            from: '1991-01-01',
            to: '1992-12-31',
            limit: 600
        });
        record('Multi-Year Historical API Query', apiHistory?.points?.length >= 500, `Returned ${apiHistory?.points?.length} points for 1991-1992`);

        const yearlyAgg = await fxService.getHistory({
            provider: 'bcrd',
            currency: 'USD',
            frequency: 'yearly',
            from: '1991-01-01',
            to: '2026-12-31'
        });
        record('Yearly Macroeconomic Aggregation API', yearlyAgg?.points?.length === 36, `Calculated ${yearlyAgg?.points?.length} years of continuous annual aggregations`);

    } catch (e) {
        console.error('Audit exception:', e);
        record('Audit Execution Exception', false, e.message);
    } finally {
        await sequelize.close();
    }

    console.log('===============================================================');
    console.log(`AUDIT FINISHED: ${results.passed} PASSED, ${results.failed} FAILED`);
    console.log('===============================================================');
    return results;
}

runAudit();
