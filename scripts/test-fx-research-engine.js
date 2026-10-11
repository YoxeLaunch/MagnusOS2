/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE TEST SUITE
 * Validates statistical series preparation, baseline models, ARIMA, GARCH,
 * and zero-lookahead walk-forward backtesting engine.
 * ============================================================================
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@postgres:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@172.19.0.2:');
}

const { sequelize, FxRateObservation } = await import('../server/models/index.js');
const { SeriesPreparation } = await import('../server/services/fx/research/seriesPreparation.js');
const { RandomWalkModel, RandomWalkWithDriftModel, MovingAverageModel, SimpleExponentialSmoothingModel } = await import('../server/services/fx/research/models/baselineModels.js');
const { ArimaModel } = await import('../server/services/fx/research/models/arimaModel.js');
const { GarchModel } = await import('../server/services/fx/research/models/garchModel.js');
const { BacktestEngine } = await import('../server/services/fx/research/backtestEngine.js');
const { quantitativeResearchService } = await import('../server/services/fx/research/quantitativeResearchService.js');

async function runResearchTests() {
    console.log('====================================================================');
    console.log('🔬 PROVIDENCE FX // LEVEL 3 QUANTITATIVE RESEARCH ENGINE TEST SUITE');
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
        // 1. CARGA DE DATOS REALES DE SÓLO LECTURA
        // -----------------------------------------------------------------
        console.log('--- 1. CARGA DE DATOS HISTÓRICOS BCRD USD/DOP (READ-ONLY) ---');
        const seriesData = await quantitativeResearchService.getCleanHistoricalSeries({ currency: 'USD', provider: 'bcrd' });
        assert('Carga exitosa de serie histórica limpia', seriesData.pointsCount >= 8970, `Total puntos: ${seriesData.pointsCount}`);
        assert('Generación de Hash SHA-256 de dataset para trazabilidad', seriesData.datasetHash && seriesData.datasetHash.length === 64, `Hash: ${seriesData.datasetHash.slice(0, 16)}...`);

        // -----------------------------------------------------------------
        // 2. PROPIEDADES ESTADÍSTICAS Y CONTROLES ECONOMÉTRICOS
        // -----------------------------------------------------------------
        console.log('\n--- 2. PERFIL ESTADÍSTICO Y DETECCIÓN DE QUIEBRES ---');
        const stats = SeriesPreparation.computeDescriptiveStatistics(seriesData.returns);
        assert('Media diaria en rango esperado (+0.01% - +0.03%)', stats.mean > 0.0001 && stats.mean < 0.0003, `Media = ${(stats.mean * 100).toFixed(5)}%`);
        assert('Volatilidad anualizada coherente (~9.6%)', stats.annualizedVolatility > 0.08 && stats.annualizedVolatility < 0.12, `Vol = ${(stats.annualizedVolatility * 100).toFixed(2)}%`);
        assert('Asimetría positiva confirmada (colas derechas)', stats.skewness > 10.0, `Skew = ${stats.skewness.toFixed(2)}`);
        assert('Leptocurtosis severa confirmada (Kurtosis >> 3)', stats.kurtosis > 500, `Kurtosis = ${stats.kurtosis.toFixed(2)}`);
        assert('Persistencia en autocorrelación Lag 1 positiva', stats.acf.lag_1 > 0.15, `ACF(1) = ${stats.acf.lag_1.toFixed(4)}`);
        assert('Efecto ARCH-LM estadísticamente significativo (p < 0.001)', stats.archLm.pValue < 0.001 && stats.archLm.hasVolatilityClustering, `LM = ${stats.archLm.statistic.toFixed(2)}, p = ${stats.archLm.pValue.toExponential(3)}`);
        assert('Prueba ADF de estacionariedad sobre retornos logarítmicos', stats.stationarity.isStationary, `t-stat = ${stats.stationarity.adfTStat.toFixed(2)} < -2.86`);
        assert('Detección de quiebre estructural de la Crisis Bancaria 2003-2004', stats.structuralBreaks.some(b => b.episode === 'CRISIS_BANCARIA_DOMINICANA_2003_2004'), 'Episodio 2003-2004 detectado');

        // -----------------------------------------------------------------
        // 3. MODELOS DE REFERENCIA (BASELINES)
        // -----------------------------------------------------------------
        console.log('\n--- 3. AJUSTE Y PRONÓSTICO DE MODELOS DE REFERENCIA ---');
        const trainSlice = seriesData.points.slice(0, 1000);
        const currentOrigin = seriesData.points[1000];

        // Random Walk
        const rw = new RandomWalkModel();
        rw.fit(trainSlice);
        const rwPred = rw.predict(currentOrigin, 1);
        assert('Random Walk P(t+1) == P(t)', rwPred.predictedValue === currentOrigin.price, `RW: ${rwPred.predictedValue}`);

        // Random Walk with Drift
        const rwDrift = new RandomWalkWithDriftModel();
        rwDrift.fit(trainSlice);
        const rwDriftPred = rwDrift.predict(currentOrigin, 5);
        assert('Random Walk with Drift incorpora tendencia in-sample', rwDriftPred.predictedValue > currentOrigin.price, `RW Drift (h=5): ${rwDriftPred.predictedValue.toFixed(4)}`);

        // Moving Average
        const sma = new MovingAverageModel({ window: 20 });
        sma.fit(trainSlice);
        const smaPred = sma.predict(currentOrigin, 1);
        assert('Moving Average SMA(20) calculado', typeof smaPred.predictedValue === 'number' && smaPred.predictedValue > 0, `SMA: ${smaPred.predictedValue.toFixed(4)}`);

        // Simple Exponential Smoothing
        const ses = new SimpleExponentialSmoothingModel();
        ses.fit(trainSlice);
        const sesPred = ses.predict(currentOrigin, 1);
        assert('SES optimiza alfa in-sample', ses.optimalAlpha >= 0.05 && ses.optimalAlpha <= 0.95, `Alpha optimizado = ${ses.optimalAlpha}`);

        // -----------------------------------------------------------------
        // 4. MODELOS AVANZADOS (ARIMA & GARCH)
        // -----------------------------------------------------------------
        console.log('\n--- 4. MODELOS AVANZADOS EXPERIMENTALES (ARIMA & GARCH) ---');

        // ARIMA(1,1,0)
        const arima = new ArimaModel({ p: 1, d: 1, q: 0 });
        arima.fit(trainSlice);
        const arimaPred = arima.predict(currentOrigin, 1);
        assert('ARIMA(1,1,0) estima coeficiente autorregresivo phi (|phi| < 1)', Math.abs(arima.phi) < 1.0, `phi = ${arima.phi.toFixed(4)}`);
        assert('ARIMA genera estadístico Ljung-Box Q en residuos', typeof arima.ljungBoxQ === 'number', `Ljung-Box Q = ${arima.ljungBoxQ.toFixed(2)}`);

        // GARCH(1,1)
        const garch = new GarchModel();
        garch.fit(trainSlice);
        const garchPred = garch.predict(currentOrigin, 1);
        const garchVol = garch.predictVolatility(1);
        assert('GARCH(1,1) satisface condición de persistencia estacionaria (alpha + beta < 1)', (garch.alpha + garch.beta) < 1.0, `alpha=${garch.alpha}, beta=${garch.beta}, pers=${(garch.alpha + garch.beta).toFixed(4)}`);
        assert('GARCH(1,1) proyecta volatilidad condicional anualizada', garchVol.forecastAnnualVol > 0, `Vol proyectada = ${(garchVol.forecastAnnualVol * 100).toFixed(2)}%`);
        assert('GARCH genera bandas de intervalo al 95%', garchPred.lower95 < garchPred.predictedValue && garchPred.upper95 > garchPred.predictedValue, `[${garchPred.lower95.toFixed(2)}, ${garchPred.upper95.toFixed(2)}]`);

        // -----------------------------------------------------------------
        // 5. MOTOR DE BACKTESTING WALK-FORWARD (ZERO LOOKAHEAD LEAKAGE)
        // -----------------------------------------------------------------
        console.log('\n--- 5. VALIDACIÓN WALK-FORWARD REPRODUCIBLE ---');
        // Backtest sobre las últimas 150 observaciones con horizonte h=1
        const backtestSlice = seriesData.points.slice(-150);
        const wfResult = BacktestEngine.runWalkForward({
            modelId: 'random_walk_drift',
            points: backtestSlice,
            horizon: 1,
            trainRatio: 0.70,
            stepSize: 2
        });

        assert('Ejecución walk-forward con conteo de pronósticos fuera de muestra', wfResult.forecastCount > 20, `Pronósticos OOS: ${wfResult.forecastCount}`);
        assert('Cálculo de MAE y RMSE fuera de muestra', wfResult.metrics.mae > 0 && wfResult.metrics.rmse > 0, `MAE = ${wfResult.metrics.mae}, RMSE = ${wfResult.metrics.rmse}`);
        assert('Cálculo de cobertura de intervalos al 95%', wfResult.metrics.coverageRate95Pct > 80, `Cobertura = ${wfResult.metrics.coverageRate95Pct}%`);
        assert('Comparación con Random Walk (Theil U / Skill score)', typeof wfResult.metrics.benchmark.theilU === 'number', `Theil's U = ${wfResult.metrics.benchmark.theilU}`);

        // -----------------------------------------------------------------
        // 6. SUITE DE BENCHMARK MULTIMODELO (HORIZONTE h=1)
        // -----------------------------------------------------------------
        console.log('\n--- 6. BENCHMARK COMPARATIVO MULTIMODELO (TODOS LOS MODELOS) ---');
        const benchmarkSuite = await quantitativeResearchService.runBenchmarkSuite({
            currency: 'USD',
            horizon: 1,
            stepSize: 10 // Step moderado para benchmark ágil
        });

        assert('Benchmark evaluó todos los 6 modelos', benchmarkSuite.benchmarkLeaderboard.length === 6, `Modelos evaluados: ${benchmarkSuite.benchmarkLeaderboard.length}`);
        console.log('\n--- TABLA DE BENCHMARK RESULTANTE ---');
        console.table(benchmarkSuite.benchmarkLeaderboard.map(b => ({
            Modelo: b.modelName,
            Categoría: b.category,
            MAE: b.metrics.mae,
            RMSE: b.metrics.rmse,
            MAPE: `${b.metrics.mape}%`,
            'Theil U': b.metrics.benchmark?.theilU,
            'Supera RW': b.metrics.benchmark?.beatsRandomWalk ? 'SÍ' : 'NO'
        })));

    } catch (e) {
        console.error('Error en suite de pruebas de investigación:', e);
        failed++;
    } finally {
        await sequelize.close();
    }

    console.log('\n====================================================================');
    console.log(`RESULTADO DE LA SUITE ECONOMÉTRICA: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================================');

    if (failed > 0) {
        process.exit(1);
    }
}

runResearchTests().catch(e => {
    console.error('Fatal test error:', e);
    process.exit(1);
});
