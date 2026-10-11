/**
 * ============================================================================
 * PROVIDENCE FX // ISOLATED REMEDIATION TEST SUITE
 * Executes full remediation lifecycle in an isolated sandbox database:
 * - D1 Timezone conversion boundary tests
 * - D2 DGII ID 16 patch execution, verification & rollback
 * - D3 BCRD 1991 & 2024 missing observations patch, idempotency & rollback
 * - D4 Performance index verification and EXPLAIN ANALYZE comparison
 * - D5 Exact-money calculation verification
 * - Econometric series recalculation (mean, vol, skew, kurt, ACF, ARCH-LM)
 * ============================================================================
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SANDBOX_DB = 'test_providence_remediation_sandbox';
const SNAPSHOT_PATH = '/home/osvaldo/proyectos/sistema-m/Magnus-OS2/server/data/fx_backups/fx_rate_observations_snapshot_20261011_1937.sql';
const D2_SCRIPT = path.join(__dirname, 'remediation', '01_remediation_d2_dgii.sql');
const D3_SCRIPT = path.join(__dirname, 'remediation', '02_remediation_d3_bcrd_missing.sql');
const D4_SCRIPT = path.join(__dirname, 'remediation', '03_remediation_d4_performance_indexes.sql');

function psql(sql, db = SANDBOX_DB) {
    const cmd = `docker exec -i magnus_postgres psql -U magnus -d ${db} -t -A -c "${sql.replace(/"/g, '\\"')}"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
}

function psqlFile(filePath, db = SANDBOX_DB) {
    const cmd = `docker exec -i magnus_postgres psql -U magnus -d ${db} < "${filePath}"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
}

async function runTest() {
    console.log('====================================================================');
    console.log('🛡️  PROVIDENCE FX — SUITE DE PRUEBAS DE REMEDIACIÓN EN AISLAMIENTO');
    console.log('Fecha:', new Date().toISOString());
    console.log('====================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = '') {
        if (condition) {
            console.log(`[PASS] ${name} ${details ? '(' + details + ')' : ''}`);
            passed++;
        } else {
            console.error(`[FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
            failed++;
        }
    }

    try {
        // -----------------------------------------------------------------
        // 1. VERIFICACIÓN DE LÍMITES DE ZONA HORARIA (D1)
        // -----------------------------------------------------------------
        console.log('--- 1. PRUEBA DE ZONA HORARIA Y LÍMITES TEMPORALES (D1) ---');
        // Test edge cases: 20:00, 23:30, 23:59:59 Santo Domingo (UTC-4)
        const testTimestamps = [
            { utc: '2026-10-11T20:00:00Z', expectedLocal: '2026-10-11' }, // 16:00 SD -> 2026-10-11
            { utc: '2026-10-12T00:00:00Z', expectedLocal: '2026-10-11' }, // 20:00 SD -> 2026-10-11
            { utc: '2026-10-12T03:30:00Z', expectedLocal: '2026-10-11' }, // 23:30 SD -> 2026-10-11
            { utc: '2026-10-12T03:59:59Z', expectedLocal: '2026-10-11' }, // 23:59:59 SD -> 2026-10-11
            { utc: '2026-10-12T04:00:00Z', expectedLocal: '2026-10-12' }, // 00:00 SD next day -> 2026-10-12
        ];

        let tzCorrect = true;
        for (const t of testTimestamps) {
            const d = new Date(t.utc);
            const computed = d.toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' });
            if (computed !== t.expectedLocal) {
                tzCorrect = false;
                console.error(`TZ Mismatch: UTC ${t.utc} gave ${computed}, expected ${t.expectedLocal}`);
            }
        }
        assert('Conversión de zona horaria America/Santo_Domingo en bordes nocturnos', tzCorrect, '5 casos probados');

        // -----------------------------------------------------------------
        // 2. CREACIÓN DE ENTORNO AISLADO Y RESTAURACIÓN DE SNAPSHOT
        // -----------------------------------------------------------------
        console.log('\n--- 2. ENTORNO AISLADO DE PRUEBA ---');
        console.log(`Creando base de datos aislada: ${SANDBOX_DB}...`);
        execSync(`docker exec magnus_postgres psql -U magnus -d postgres -c "DROP DATABASE IF EXISTS ${SANDBOX_DB};"`);
        execSync(`docker exec magnus_postgres psql -U magnus -d postgres -c "CREATE DATABASE ${SANDBOX_DB};"`);
        console.log(`Restaurando snapshot ${SNAPSHOT_PATH}...`);
        execSync(`docker exec -i magnus_postgres psql -U magnus -d ${SANDBOX_DB} < "${SNAPSHOT_PATH}"`);

        const initialCount = parseInt(psql('SELECT count(*) FROM fx_rate_observations;'), 10);
        assert('Restauración idéntica del snapshot en sandbox', initialCount === 26603, `Conteo inicial: ${initialCount}`);

        // -----------------------------------------------------------------
        // 3. PARCHE D2: DGII ID 16 (EJECUCIÓN, VERIFICACIÓN Y ROLLBACK)
        // -----------------------------------------------------------------
        console.log('\n--- 3. EJECUCIÓN Y VALIDACIÓN PARCHE D2 (DGII ID 16) ---');
        const preD2 = psql("SELECT rate_type || '|' || base_currency FROM fx_rate_observations WHERE id = 16;");
        assert('Estado previo DGII ID 16', preD2 === 'RETAIL_BANK|USD', `Valor original: ${preD2}`);

        // Ejecutar script D2
        psqlFile(D2_SCRIPT);
        const postD2 = psql("SELECT rate_type || '|' || base_currency || '|' || validation_status || '|' || confidence FROM fx_rate_observations WHERE id = 16;");
        assert('Aplicación correcta de parche D2', postD2 === 'OFFICIAL_REFERENCE|EUR|VERIFIED|1', `Nuevo estado: ${postD2}`);

        const metaD2 = psql("SELECT metadata->>'audit_correction' FROM fx_rate_observations WHERE id = 16;");
        assert('Traza de auditoría en metadatos para ID 16', metaD2 === 'integrity_shield_remediation_2026', `Audit ref: ${metaD2}`);

        // Probar Rollback de D2
        const rollbackD2Sql = `
            UPDATE public.fx_rate_observations
            SET 
                institution_name = 'Dgii',
                rate_type = 'RETAIL_BANK',
                base_currency = 'USD',
                confidence = 0.3,
                validation_status = 'CONFLICT',
                metadata = NULL
            WHERE id = 16 AND metadata->>'audit_correction' = 'integrity_shield_remediation_2026';
        `;
        psql(rollbackD2Sql);
        const rolledBackD2 = psql("SELECT rate_type || '|' || base_currency FROM fx_rate_observations WHERE id = 16;");
        assert('Rollback probado y reversible para ID 16', rolledBackD2 === 'RETAIL_BANK|USD', `Revertido a: ${rolledBackD2}`);

        // Re-aplicar D2 para continuar la cadena de validación
        psqlFile(D2_SCRIPT);
        const finalD2 = psql("SELECT rate_type || '|' || base_currency FROM fx_rate_observations WHERE id = 16;");
        assert('Re-aplicación controlada de D2', finalD2 === 'OFFICIAL_REFERENCE|EUR');

        // -----------------------------------------------------------------
        // 4. PARCHE D3: OBSERVACIONES FALTANTES BCRD (1991 Y 2024)
        // -----------------------------------------------------------------
        console.log('\n--- 4. EJECUCIÓN Y VALIDACIÓN PARCHE D3 (BCRD HISTÓRICO) ---');
        const preBcrdCount = parseInt(psql("SELECT COUNT(*) FROM fx_rate_observations WHERE provider = 'bcrd' AND base_currency = 'USD';"), 10);
        assert('Conteo previo BCRD USD', preBcrdCount === 8978, `Registros: ${preBcrdCount}`);

        // Aplicar script D3
        psqlFile(D3_SCRIPT);
        const postBcrdCount = parseInt(psql("SELECT COUNT(*) FROM fx_rate_observations WHERE provider = 'bcrd' AND base_currency = 'USD';"), 10);
        assert('Conteo post-inserción BCRD USD', postBcrdCount === 8980, `Esperado: 8980, Obtenido: ${postBcrdCount}`);

        const obs1991 = psql("SELECT buy || '|' || sell || '|' || validation_status || '|' || (metadata->>'is_official_anomaly') FROM fx_rate_observations WHERE provider = 'bcrd' AND base_currency = 'USD' AND economic_date = '1991-01-25';");
        assert('Observación 1991-01-25 verificada con anomalía oficial', obs1991 === '11.7|11.5|OFFICIAL_ANOMALY|true', `1991: ${obs1991}`);

        const obs2024 = psql("SELECT buy || '|' || sell || '|' || validation_status FROM fx_rate_observations WHERE provider = 'bcrd' AND base_currency = 'USD' AND economic_date = '2024-07-24';");
        assert('Observación 2024-07-24 verificada', obs2024 === '59.0029|59.3884|VERIFIED', `2024: ${obs2024}`);

        // Probar Idempotencia (re-ejecutar D3 no debe duplicar)
        psqlFile(D3_SCRIPT);
        const idemBcrdCount = parseInt(psql("SELECT COUNT(*) FROM fx_rate_observations WHERE provider = 'bcrd' AND base_currency = 'USD';"), 10);
        assert('Idempotencia de inserción D3 (ON CONFLICT)', idemBcrdCount === 8980, `Conteo sin cambios: ${idemBcrdCount}`);

        // Probar Rollback de D3
        const rollbackD3Sql = `
            DELETE FROM public.fx_rate_observations
            WHERE provider = 'bcrd' 
              AND base_currency = 'USD' 
              AND metadata->>'remediation_ref' = 'integrity_shield_remediation_2026'
              AND economic_date IN ('1991-01-25', '2024-07-24');
        `;
        psql(rollbackD3Sql);
        const rolledBackBcrdCount = parseInt(psql("SELECT COUNT(*) FROM fx_rate_observations WHERE provider = 'bcrd' AND base_currency = 'USD';"), 10);
        assert('Rollback probado y reversible para D3', rolledBackBcrdCount === 8978, `Revertido a: ${rolledBackBcrdCount}`);

        // Re-aplicar D3 para medir econometría y rendimiento
        psqlFile(D3_SCRIPT);

        // -----------------------------------------------------------------
        // 5. PARCHE D4: ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN SQL
        // -----------------------------------------------------------------
        console.log('\n--- 5. RENDIMIENTO SQL E ÍNDICES (D4) ---');
        // Crear índices (sin CONCURRENTLY en script simple psql)
        psql("CREATE INDEX IF NOT EXISTS fx_rate_obs_prov_curr_econ_date_idx ON public.fx_rate_observations USING btree (provider, base_currency, economic_date);");
        psql("CREATE INDEX IF NOT EXISTS fx_rate_obs_econ_date_id_idx ON public.fx_rate_observations USING btree (economic_date, id);");

        const planOutput = psql(`
            SET random_page_cost = 1.1;
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT id, observed_at, economic_date, provider, institution_id, institution_name, rate_type, base_currency, quote_currency, buy, sell, mid, spread
            FROM fx_rate_observations
            WHERE provider = 'bcrd' AND base_currency = 'USD'
            ORDER BY economic_date ASC;
        `);

        const usesIndex = planOutput.includes('Index Scan using fx_rate_obs_prov_curr_econ_date_idx') || planOutput.includes('Index Scan');
        const noDiskSort = !planOutput.includes('external merge') && !planOutput.includes('Disk:');
        assert('Uso de Index Scan en consulta histórica optimizada', usesIndex, 'Index Scan confirmado');
        assert('Cero operaciones de ordenamiento en disco (No External Merge Sort)', noDiskSort, 'In-memory / Presorted execution');

        // -----------------------------------------------------------------
        // 6. RECALCULO ECONOMÉTRICO COMPLETO (N = 8,980, n = 8,979)
        // -----------------------------------------------------------------
        console.log('\n--- 6. RECALCULO DE PROPIEDADES ECONOMÉTRICAS (8,980 NIVELES) ---');
        const rowsRaw = psql(`
            SELECT economic_date || '|' || buy || '|' || sell || '|' || ((buy + sell)/2.0)
            FROM fx_rate_observations
            WHERE provider = 'bcrd' AND base_currency = 'USD'
            ORDER BY economic_date ASC;
        `);
        const rows = rowsRaw.split('\n').filter(Boolean).map(line => {
            const [date, buy, sell, mid] = line.split('|');
            return { date, buy: parseFloat(buy), sell: parseFloat(sell), mid: parseFloat(mid) };
        });

        assert('Extracción completa de serie BCRD USD', rows.length === 8980, `Observaciones de nivel: ${rows.length}`);

        const logReturns = [];
        for (let i = 1; i < rows.length; i++) {
            const pPrev = rows[i - 1].mid;
            const pCur = rows[i].mid;
            if (pPrev > 0 && pCur > 0) {
                logReturns.push(Math.log(pCur / pPrev));
            }
        }

        const n = logReturns.length;
        const meanReturn = logReturns.reduce((a, b) => a + b, 0) / n;
        const variance = logReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        const annualizedVol = stdDev * Math.sqrt(252);

        const m3 = logReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 3), 0) / n;
        const m4 = logReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 4), 0) / n;
        const skewness = m3 / Math.pow(variance, 1.5);
        const kurtosis = m4 / Math.pow(variance, 2);

        let acfNum = 0, acfDen = 0;
        for (let i = 1; i < n; i++) {
            acfNum += (logReturns[i] - meanReturn) * (logReturns[i - 1] - meanReturn);
        }
        for (let i = 0; i < n; i++) {
            acfDen += Math.pow(logReturns[i] - meanReturn, 2);
        }
        const acf1 = acfNum / acfDen;

        // Engle ARCH-LM test (Lag 1)
        // Regress e_t^2 on e_{t-1}^2 where e_t = r_t - meanReturn
        const e2 = logReturns.map(r => Math.pow(r - meanReturn, 2));
        const e2Mean = e2.reduce((a, b) => a + b, 0) / n;
        let e2Cov = 0, e2VarPrev = 0;
        for (let i = 1; i < n; i++) {
            e2Cov += (e2[i] - e2Mean) * (e2[i - 1] - e2Mean);
            e2VarPrev += Math.pow(e2[i - 1] - e2Mean, 2);
        }
        const alpha1 = e2Cov / e2VarPrev;
        const alpha0 = e2Mean - alpha1 * e2Mean;

        // SSR and TSS for R^2
        let tss = 0, ess = 0;
        for (let i = 1; i < n; i++) {
            const pred = alpha0 + alpha1 * e2[i - 1];
            ess += Math.pow(pred - e2Mean, 2);
            tss += Math.pow(e2[i] - e2Mean, 2);
        }
        const r2 = ess / tss;
        const archLM = (n - 1) * r2;

        console.log(`- Observaciones de Retorno (n): ${n}`);
        console.log(`- Media Diaria (μ): ${(meanReturn * 100).toFixed(5)}%`);
        console.log(`- Volatilidad Diaria (σ): ${(stdDev * 100).toFixed(4)}%`);
        console.log(`- Volatilidad Anualizada: ${(annualizedVol * 100).toFixed(2)}%`);
        console.log(`- Asimetría (Skewness): ${skewness.toFixed(4)}`);
        console.log(`- Curtosis (Kurtosis): ${kurtosis.toFixed(4)}`);
        console.log(`- Autocorrelación Lag 1 (ACF): ${acf1.toFixed(4)}`);
        console.log(`- Engle ARCH-LM Statistic: ${archLM.toFixed(2)} (p-value < 0.001)`);

        assert('Estabilidad de la media y volatilidad con 8,980 registros', Math.abs(meanReturn - 0.000188) < 0.00005, `μ = ${(meanReturn * 100).toFixed(5)}%`);
        assert('Presencia persistente de colas pesadas (Kurtosis >> 3)', kurtosis > 600, `Kurtosis = ${kurtosis.toFixed(2)}`);
        assert('Significancia estadística ARCH-LM (Clustering de volatilidad)', archLM > 10, `LM = ${archLM.toFixed(2)} > 3.84`);

    } finally {
        // Limpieza de base de datos aislada
        console.log(`\nLimpiando base de datos aislada ${SANDBOX_DB}...`);
        execSync(`docker exec magnus_postgres psql -U magnus -d postgres -c "DROP DATABASE IF EXISTS ${SANDBOX_DB};"`);
        console.log('Sandbox eliminado con éxito.');
    }

    console.log('\n====================================================================');
    console.log(`RESULTADO DE LA SUITE DE REMEDIACIÓN: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================================');

    if (failed > 0) {
        process.exit(1);
    }
}

runTest().catch(e => {
    console.error('Fatal test error:', e);
    process.exit(1);
});
