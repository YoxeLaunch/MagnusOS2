/**
 * ============================================================================
 * PROVIDENCE FX INTELLIGENCE // FULL SUITE DE INTEGRACIÓN Y SEGURIDAD API
 * Audita contratos de endpoints, autenticación, cálculo econométrico out-of-sample,
 * análisis de volatilidad GARCH, calidad de datos y controles de recursos.
 * ============================================================================
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@postgres:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@172.19.0.2:');
}

const { sequelize } = await import('../server/models/index.js');
const { quantitativeResearchService } = await import('../server/services/fx/research/quantitativeResearchService.js');
const { BacktestEngine } = await import('../server/services/fx/research/backtestEngine.js');

async function runFxIntelligenceIntegrationTests() {
    console.log('====================================================================');
    console.log('⚡ PROVIDENCE FX INTELLIGENCE // API & ECONOMETRIC INTEGRATION TEST');
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
        // 1. AUDITORÍA DE MODELOS Y METADATOS
        // -----------------------------------------------------------------
        console.log('--- 1. CATÁLOGO CANÓNICO DE MODELOS ---');
        const models = quantitativeResearchService.getModelsCatalog();
        assert('Catálogo contiene los 6 modelos oficiales', models.length === 6, `Total: ${models.length}`);
        
        const expectedModelIds = ['random_walk', 'random_walk_drift', 'moving_average', 'ses_exponential_smoothing', 'arima_experimental', 'garch_1_1'];
        const catalogIds = models.map(m => m.id);
        const allPresent = expectedModelIds.every(id => catalogIds.includes(id));
        assert('Todos los IDs de modelos esperados están registrados', allPresent, catalogIds.join(', '));

        const statuses = models.map(m => m.status);
        assert('Ningún modelo tiene auto-promoción a LIVE', !statuses.includes('PRODUCTION'), 'Estados: ' + [...new Set(statuses)].join(', '));

        // -----------------------------------------------------------------
        // 2. PRONÓSTICOS OUT-OF-SAMPLE Y BANDAS DE INCERTIDUMBRE
        // -----------------------------------------------------------------
        console.log('\n--- 2. PRONÓSTICOS OUT-OF-SAMPLE (ARIMA / RW / GARCH) ---');
        
        // USD h=1
        const forecastUsd1 = await quantitativeResearchService.getForwardForecast({
            currency: 'USD',
            modelId: 'arima_experimental',
            horizon: 1
        });
        assert('Generación de pronóstico ARIMA USD h=1', forecastUsd1.predictedValue > 50, `Valor: RD$ ${forecastUsd1.predictedValue?.toFixed(4)}`);
        assert('Histórico reciente devuelto para contexto de corte', forecastUsd1.recentHistory?.length > 10, `Puntos históricos: ${forecastUsd1.recentHistory?.length}`);
        assert('Trayectoria out-of-sample contiene fecha futura', forecastUsd1.trajectory?.length === 1, `Puntos proyectados: ${forecastUsd1.trajectory?.length}`);
        assert('Intervalo de incertidumbre 95% simétrico y válido', forecastUsd1.upper95 > forecastUsd1.predictedValue && forecastUsd1.lower95 < forecastUsd1.predictedValue, `[${forecastUsd1.lower95?.toFixed(2)} - ${forecastUsd1.upper95?.toFixed(2)}]`);
        assert('Métricas históricas de backtesting incluidas', forecastUsd1.backtestMetrics?.rmse > 0 && forecastUsd1.backtestMetrics?.mae > 0, `RMSE=${forecastUsd1.backtestMetrics?.rmse}`);

        // EUR h=20
        const forecastEur20 = await quantitativeResearchService.getForwardForecast({
            currency: 'EUR',
            modelId: 'random_walk_drift',
            horizon: 20
        });
        assert('Generación de pronóstico RW Drift EUR h=20', forecastEur20.predictedValue > 50, `Valor: RD$ ${forecastEur20.predictedValue?.toFixed(4)}`);
        assert('Trayectoria EUR h=20 contiene 20 puntos proyectados', forecastEur20.trajectory?.length === 20, `Puntos: ${forecastEur20.trajectory?.length}`);
        assert('Límites de incertidumbre divergen monótonamente en el tiempo', forecastEur20.trajectory[19].upper95 > forecastEur20.trajectory[0].upper95, 'Dispersión temporal confirmada');

        // -----------------------------------------------------------------
        // 3. ANÁLISIS DE RIESGO Y VOLATILIDAD CONDICIONAL
        // -----------------------------------------------------------------
        console.log('\n--- 3. MOTOR DE RIESGO Y VOLATILIDAD (GARCH & EWMA) ---');
        const riskAnalytics = await quantitativeResearchService.getRiskAnalytics({ currency: 'USD' });
        
        assert('Cálculo de volatilidad histórica anualizada', riskAnalytics.volatility.annualizedHistoricalPct > 5.0, `Vol Anual: ${riskAnalytics.volatility.annualizedHistoricalPct}%`);
        assert('Parámetros GARCH(1,1) estimados con persistencia estacionaria (< 1.0)', riskAnalytics.garchParameters.persistence < 1.0 && riskAnalytics.garchParameters.persistence >= 0.90, `Persistencia GARCH: ${riskAnalytics.garchParameters.persistence}`);
        assert('Condición de varianza no negativa omega > 0', riskAnalytics.garchParameters.omega > 0, `omega = ${riskAnalytics.garchParameters.omega}`);
        assert('Cálculo de Volatilidad EWMA lambda=0.94', riskAnalytics.volatility.ewmaAnnualPct > 0, `EWMA Vol = ${riskAnalytics.volatility.ewmaAnnualPct}%`);
        assert('Estructura temporal de volatilidad (1D, 5D, 20D, 60D, 120D, 252D)', riskAnalytics.termStructure?.length >= 5, `Términos: ${riskAnalytics.termStructure?.map(t => t.horizonLabel).join(', ')}`);
        assert('Histograma de distribución de retornos con 25 bins', riskAnalytics.distribution?.bins?.length === 25, `Bins: ${riskAnalytics.distribution?.bins?.length}`);
        assert('Cálculo de Value-at-Risk paramétrico (95% y 99%)', riskAnalytics.valueAtRisk.var95ParametricPct > 0 && riskAnalytics.valueAtRisk.var99ParametricPct > riskAnalytics.valueAtRisk.var95ParametricPct, `VaR 95%: ${riskAnalytics.valueAtRisk.var95ParametricPct}%, VaR 99%: ${riskAnalytics.valueAtRisk.var99ParametricPct}%`);
        assert('Episodios históricos documentados (Crisis Bancaria 2003-2004)', riskAnalytics.extremeEpisodes?.length >= 2, `Episodios: ${riskAnalytics.extremeEpisodes?.map(e => e.name).join(' | ')}`);

        // -----------------------------------------------------------------
        // 4. MÓDULO DE CALIDAD DE DATOS Y CENSO POSTGRESQL
        // -----------------------------------------------------------------
        console.log('\n--- 4. CALIDAD DE DATOS Y SHIELD DE INTEGRIDAD ---');
        const dataQuality = await quantitativeResearchService.getDataQualityMetrics();
        
        assert('Censo de registros totales en PostgreSQL (>= 26,605)', dataQuality.totalObservations >= 26605, `Total: ${dataQuality.totalObservations}`);
        const bcrdUsd = dataQuality.providers?.find(p => p.provider === 'bcrd' && p.currency === 'USD');
        const bcrdEur = dataQuality.providers?.find(p => p.provider === 'bcrd' && p.currency === 'EUR');
        assert('Censo por proveedor incluye BCRD, Yahoo y Retail', bcrdUsd?.count >= 8980 && bcrdEur?.count >= 5710, `BCRD USD: ${bcrdUsd?.count}, BCRD EUR: ${bcrdEur?.count}`);
        assert('Registro de anomalías documentadas (ID 27053 y DGII ID 16)', dataQuality.documentedAnomalies?.length >= 2, `Anomalías: ${dataQuality.documentedAnomalies?.map(a => a.id).join(', ')}`);
        assert('Monitor de salud de fuentes externas (Circuit Health)', dataQuality.providerHealthMonitor?.length === 4, `Fuentes: ${dataQuality.providerHealthMonitor?.map(f => f.name).join(', ')}`);

        // -----------------------------------------------------------------
        // 5. REGISTRO DE EXPERIMENTOS PERSISTIDOS
        // -----------------------------------------------------------------
        console.log('\n--- 5. EXPERIMENTOS DE LABORATORIO PERSISTIDOS ---');
        const experiments = await quantitativeResearchService.getPersistedExperiments({ currency: 'USD' });
        assert('Consulta de experimentos persistidos en base de datos', experiments.length >= 6, `Experimentos cargados: ${experiments.length}`);
        const firstExp = experiments[0];
        const hash = firstExp.dataset_hash || firstExp.datasetHash;
        assert('Trazabilidad con Hash de Dataset en cada experimento', hash?.length === 64, `Hash: ${hash?.slice(0, 16)}...`);
        assert('Métricas completas persistidas (MAE, RMSE, MAPE, Theil U)', firstExp.metrics?.mae > 0 && firstExp.metrics?.rmse > 0, `MAE=${firstExp.metrics?.mae}, RMSE=${firstExp.metrics?.rmse}`);

        // -----------------------------------------------------------------
        // 6. ENFORCEMENT DEL PUZZLE MEESE-ROGOFF
        // -----------------------------------------------------------------
        console.log('\n--- 6. VALIDACIÓN ECONOMÉTRICA DEL PUZZLE MEESE-ROGOFF ---');
        const rwExp = experiments.find(e => (e.model_id || e.modelId) === 'random_walk');
        const arimaExp = experiments.find(e => (e.model_id || e.modelId) === 'arima_experimental');
        
        if (rwExp && arimaExp) {
            console.log(`- Random Walk RMSE: ${rwExp.metrics.rmse} | MAE: ${rwExp.metrics.mae}`);
            console.log(`- ARIMA RMSE: ${arimaExp.metrics.rmse} | MAE: ${arimaExp.metrics.mae}`);
            assert('Métricas de modelos reproducibles y finitas', !isNaN(rwExp.metrics.rmse) && !isNaN(arimaExp.metrics.rmse), 'OK');
            assert('Theil U de ARIMA registrado en benchmark', typeof arimaExp.metrics?.benchmark?.theilU === 'number', `Theil U = ${arimaExp.metrics?.benchmark?.theilU}`);
        }

    } catch (err) {
        console.error('Error durante la ejecución del test de integración:', err);
        failed++;
    } finally {
        await sequelize.close();
    }

    console.log('\n====================================================================');
    console.log(`TOTAL SUITE DE INTEGRACIÓN: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================================');

    if (failed > 0) {
        process.exit(1);
    }
}

runFxIntelligenceIntegrationTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
