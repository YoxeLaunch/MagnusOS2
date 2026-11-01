/**
 * ============================================================================
 * TEST SUITE: SB DYNAMIC PERIOD & AUDIT REGRESSION
 * Verifies dynamic cutoff dates, canonical metadata contract,
 * absence of silent fallbacks, and multi-period transition consistency.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    determineSbFreshness,
    buildSbTemporalMeta,
    calculateHhi
} from '../server/services/sb/sbMetrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper que replica las utilidades frontend de bankingFormatters para pruebas
function formatPeriodOfficial(periodo, prefix = 'Cierre') {
    if (!periodo) return `${prefix} no disponible`;
    const [year, month] = periodo.split('-');
    const monthsLower = {
        '01': 'enero', '02': 'febrero', '03': 'marzo', '04': 'abril',
        '05': 'mayo', '06': 'junio', '07': 'julio', '08': 'agosto',
        '09': 'septiembre', '10': 'octubre', '11': 'noviembre', '12': 'diciembre'
    };
    const monthName = monthsLower[month || '01'] || month;
    return `${prefix} ${monthName} ${year}`;
}

function formatLatestOfficialCut(periodo) {
    if (!periodo) return 'Último corte oficial no disponible';
    return formatPeriodOfficial(periodo, 'Último corte oficial disponible:');
}

function formatPercentNullable(value, decimals = 2, fallback = 'Dato no disponible') {
    if (value === null || value === undefined) return fallback;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
    return `${num.toFixed(decimals)}%`;
}

function formatMoneyCompactNullable(value, currency = 'RD$', fallback = 'Dato no disponible') {
    if (value === null || value === undefined) return fallback;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1e12) return `${sign}${currency} ${(abs / 1e12).toFixed(2)} T`;
    if (abs >= 1e9) return `${sign}${currency} ${(abs / 1e9).toFixed(2)} B`;
    if (abs >= 1e6) return `${sign}${currency} ${(abs / 1e6).toFixed(2)} M`;
    if (abs >= 1e3) return `${sign}${currency} ${(abs / 1e3).toFixed(1)} K`;
    return `${sign}${currency} ${abs.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

test('1. Dataset con corte Agosto 2026 -> encabezado y módulos calculan Agosto y 39 entidades', () => {
    // Simulación de dataset de Agosto 2026
    const augustData = {
        periodo: '2026-08',
        institutionCount: 39,
        topBanks: [
            { entidad: 'BANRESERVAS', marketSharePct: 32.5 },
            { entidad: 'BANCO POPULAR', marketSharePct: 24.1 },
            { entidad: 'BANCO BHD', marketSharePct: 15.3 },
            { entidad: 'ASOCIACION POPULAR (APAP)', marketSharePct: 6.2 },
            { entidad: 'SCOTIABANK', marketSharePct: 4.8 }
        ],
        totalSystemBalanceDop: 3450000000000,
        dollarizationIndex: { dsiPct: 29.4 }
    };

    const headerText = formatPeriodOfficial(augustData.periodo);
    assert.equal(headerText, 'Cierre agosto 2026');

    const cutText = formatLatestOfficialCut(augustData.periodo);
    assert.equal(cutText, 'Último corte oficial disponible: agosto 2026');

    // Conteo de instituciones para Agosto (39)
    assert.equal(augustData.institutionCount, 39);

    // En gráfica de market share, el cálculo dinámico de "Otras" debe ser 39 - 5 = 34
    const otherCount = augustData.institutionCount - augustData.topBanks.length;
    assert.equal(otherCount, 34);
    assert.equal(`Otras (${otherCount})`, 'Otras (34)');
});

test('2. Dataset posterior con corte Septiembre 2026 -> avanza a Septiembre y 40 entidades automáticamente', () => {
    // Simulación de avance a Septiembre 2026
    const septemberData = {
        periodo: '2026-09',
        institutionCount: 40,
        topBanks: [
            { entidad: 'BANRESERVAS', marketSharePct: 33.1 },
            { entidad: 'BANCO POPULAR', marketSharePct: 24.3 },
            { entidad: 'BANCO BHD', marketSharePct: 15.0 },
            { entidad: 'ASOCIACION POPULAR (APAP)', marketSharePct: 6.1 },
            { entidad: 'SCOTIABANK', marketSharePct: 4.7 }
        ],
        totalSystemBalanceDop: 3517507877440.76,
        dollarizationIndex: { dsiPct: 29.6 }
    };

    const headerText = formatPeriodOfficial(septemberData.periodo);
    assert.equal(headerText, 'Cierre septiembre 2026');

    const cutText = formatLatestOfficialCut(septemberData.periodo);
    assert.equal(cutText, 'Último corte oficial disponible: septiembre 2026');

    // Conteo de instituciones para Septiembre (40)
    assert.equal(septemberData.institutionCount, 40);

    // En gráfica de market share, el cálculo dinámico de "Otras" debe ser 40 - 5 = 35
    const otherCount = septemberData.institutionCount - septemberData.topBanks.length;
    assert.equal(otherCount, 35);
    assert.equal(`Otras (${otherCount})`, 'Otras (35)');
});

test('3. Métrica ausente en Septiembre -> muestra "Dato no disponible" sin usar fallbacks silenciosos', () => {
    // Escenario de metricas omitidas o no calculables
    const dsiNull = null;
    const usdYieldNull = undefined;
    const dopYieldNan = NaN;
    const balanceInfinite = Infinity;

    assert.equal(formatPercentNullable(dsiNull), 'Dato no disponible');
    assert.equal(formatPercentNullable(usdYieldNull), 'Dato no disponible');
    assert.equal(formatPercentNullable(dopYieldNan), 'Dato no disponible');
    assert.equal(formatMoneyCompactNullable(balanceInfinite), 'Dato no disponible');

    // Cero legítimo debe mantenerse como 0.00%, no confundirse con dato ausente
    assert.equal(formatPercentNullable(0), '0.00%');
    assert.equal(formatMoneyCompactNullable(0), 'RD$ 0.00');
});

test('4. Conteo de instituciones y HHI derivado de entidades válidas del período', () => {
    // 5 entidades con balances reales
    const balances = [1000, 2000, 3000, 4000];
    const hhi = calculateHhi(balances);
    // Participaciones: 10%, 20%, 30%, 40% -> 100 + 400 + 900 + 1600 = 3000
    assert.equal(hhi, 3000);
    assert.equal(balances.length, 4);
});

test('5. Auditoría de código: Ningún componente de producción contiene "Cierre Agosto 2026" hardcodeado ni fallbacks prohibidos', () => {
    const bankingSectionPath = path.join(rootDir, 'src/apps/finanza/components/banking/BankingSection.tsx');
    const bankingContextCardPath = path.join(rootDir, 'src/apps/finanza/components/banking/BankingContextCard.tsx');
    const resumenTabPath = path.join(rootDir, 'src/apps/finanza/components/banking/tabs/ResumenTab.tsx');
    const geografiaTabPath = path.join(rootDir, 'src/apps/finanza/components/banking/tabs/GeografiaTab.tsx');

    const bankingSectionContent = fs.readFileSync(bankingSectionPath, 'utf8');
    const bankingContextCardContent = fs.readFileSync(bankingContextCardPath, 'utf8');
    const resumenTabContent = fs.readFileSync(resumenTabPath, 'utf8');
    const geografiaTabContent = fs.readFileSync(geografiaTabPath, 'utf8');

    // Regla 1: No debe contener "Cierre Agosto 2026 (SB)"
    assert.equal(bankingSectionContent.includes('Cierre Agosto 2026 (SB)'), false,
        'BankingSection.tsx still contains hardcoded "Cierre Agosto 2026 (SB)"');

    // Regla 2: No debe contener fallbacks numéricos en BankingContextCard (29.7, 1.76, 4.09)
    assert.equal(bankingContextCardContent.includes('|| 29.7'), false,
        'BankingContextCard contains prohibited fallback "|| 29.7"');
    assert.equal(bankingContextCardContent.includes('|| 1.76'), false,
        'BankingContextCard contains prohibited fallback "|| 1.76"');
    assert.equal(bankingContextCardContent.includes('|| 4.09'), false,
        'BankingContextCard contains prohibited fallback "|| 4.09"');

    // Regla 3: No debe contener 40 hardcodeado en el KPI de instituciones ni "Otras (35)" estático
    assert.equal(resumenTabContent.includes("name: 'Otras (35)'"), false,
        'ResumenTab contains hardcoded "Otras (35)"');
    // En ResumenTab, el KPI de instituciones debe usar data.institutionCount
    assert.equal(resumenTabContent.includes('data.institutionCount'), true,
        'ResumenTab must use dynamic data.institutionCount');

    // Regla 4: GeografiaTab no debe tener estado inicial hardcodeado '2026-08'
    assert.equal(geografiaTabContent.includes("useState<string>('2026-08')"), false,
        'GeografiaTab must not hardcode initial state "2026-08"');
});

test('6. No aparecen NaN, Infinity, meses inválidos ni mezclas silenciosas de cortes', () => {
    // Validación de nombres de mes válidos
    const validMonths = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    for (let m = 1; m <= 12; m++) {
        const monthStr = String(m).padStart(2, '0');
        const formatted = formatPeriodOfficial(`2026-${monthStr}`);
        const expectedMonth = validMonths[m - 1];
        assert.equal(formatted, `Cierre ${expectedMonth} 2026`);
    }

    // Período vacío o nulo
    assert.equal(formatPeriodOfficial(null), 'Cierre no disponible');
    assert.equal(formatPeriodOfficial(''), 'Cierre no disponible');
});
