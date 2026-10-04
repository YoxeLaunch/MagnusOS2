# MAGNUSOS2 — MONEY STORAGE MAP & FINANCIAL SCHEMA INVENTORY

**Fecha:** 2026-10-04  
**Fase:** II-C (Exact Money + Schema Governance + Migration-First Database)  
**Base:** `phase2/ii-b-final` (`4775374`)  
**Rama:** `phase2/ii-c`

---

## 1. Objetivo y Convención Oficial de Almacenamiento

El objetivo de esta política es eliminar el riesgo de errores de redondeo, pérdida de centavos e inconsistencias asociadas al uso de IEEE-754 (`DOUBLE PRECISION` / `FLOAT`) en importes monetarios transaccionales y contables.

### Convención Oficial Canónica:
1. **Dinero Transaccional y Contable**:
   - **Tipo PostgreSQL**: `BIGINT` (64-bit integer).
   - **Unidad**: Unidades menores de moneda (*minor units* / centavos).
     - **DOP** (Peso Dominicano): 2 decimales ($1.00 DOP = 100 minor units).
     - **USD** (Dólar Estadounidense): 2 decimales ($1.00 USD = 100 minor units).
     - **EUR** (Euro): 2 decimales (€1.00 EUR = 100 minor units).
   - **Nombres de columna canónicos**: `amount_minor`, `opening_balance_minor`, `current_balance_minor`, `net_worth_minor`, `assets_minor`, `liabilities_minor`.
   - **Reglas de Signos**:
     - Activos (`cash`, `checking`, `savings`, `investment`): saldos deudores positivos (`>= 0`).
     - Pasivos (`credit_card`, `loan`): saldos acreedores negativos (`<= 0`). Saldo positivo en tarjeta/préstamo representa saldo a favor (sobrepago/activo).
     - Patrimonio neto: `activos_positivos - ABS(pasivos_negativos)`.
     - Transferencias internas: `SUM(líneas) = 0`, neutral en ingresos, gastos y patrimonio.

2. **Tipos de Cambio FX y Factores de Conversión**:
   - **Tipo PostgreSQL**: `NUMERIC(12, 6)` (Fixed-point exacto con 6 decimales).
   - **Prohibido**: Nunca `FLOAT` o `DOUBLE PRECISION` para tipos de cambio.
   - **Nombres de columna**: `fx_rate`, `rate_exact`, `buy_exact`, `sell_exact`, `mid_exact`, `spread_exact`.

3. **Cálculos y Conversiones en Código**:
   - Conversión de decimal string a minor units: `toMinorUnitsBigInt(val)` utilizando manipulación de cadenas de texto y enteros `BigInt` (sin usar `Number` ni aritmética de coma flotante).
   - Conversión de minor units a decimal string: `minorToDecimalString(bigintVal)` exacta.
   - Formateo de UI: `formatCurrency(val)` sin coerción prematura a `Number` para valores que superen `Number.MAX_SAFE_INTEGER`.
   - Visualizaciones Recharts / Gráficos: `minorUnitsToChartNumber(minor)` detecta desbordamiento (`> Number.MAX_SAFE_INTEGER`) y degrada con advertencia explícita en lugar de redondear silenciosamente.

---

## 2. Mapa Detallado de Columnas Financieras

### Clasificación:
- **`SAFE`**: Cumple la política de dinero exacto (`BIGINT minor units` o `NUMERIC(p,s)` para FX).
- **`LEGACY`**: Columna antigua (`DOUBLE PRECISION` / `FLOAT`) en esquema de coexistencia (*expand-and-contract*). Se preserva para retrocompatibilidad mientras existan consumidores antiguos; no debe ser fuente de verdad.
- **`MUST MIGRATE`**: Campo con riesgo activo de precisión o pendiente de sincronización en modelos Sequelize.
- **`DISPLAY ONLY` / `EXTERNAL`**: Series temporales de terceros (combustibles, macroeconomía, anomalías estadísticas) donde la precisión de coma flotante es propia del sensor/indicador externo y no representa balances contables del usuario.

| Tabla | Columna | Tipo DB | Clasificación | Propósito y Estrategia |
|---|---|---|---|---|
| `accounts` | `opening_balance_minor` | `BIGINT` | **SAFE** | Saldo inicial exacto en centavos. Fuente de verdad inmutable tras primer movimiento. |
| `accounts` | `current_balance_minor` | `BIGINT` | **SAFE** | Caché de balance rápido; reconciliado contra saldo derivado del ledger. |
| `transaction_lines` | `amount_minor` | `BIGINT` | **SAFE** | Importe exacto de cada línea contable de partida doble. |
| `transaction_lines` | `fx_rate` | `NUMERIC(12,6)`| **SAFE** | Tipo de cambio exacto aplicado a la línea en transacciones multimoneda. |
| `savings_goals` | `target_amount_minor` | `BIGINT` | **SAFE** | Meta de ahorro en centavos exactos. |
| `savings_goals` | `current_amount_minor` | `BIGINT` | **SAFE** | Progreso derivado del saldo de la cuenta vinculada. |
| `savings_contributions` | `amount_minor` | `BIGINT` | **SAFE** | Importe del aporte exacto vinculado a una transferencia ledger. |
| `DailyTransactions` | `amount_minor` | `BIGINT` | **SAFE** | Importe exacto en centavos (coexistencia expand-and-contract). |
| `DailyTransactions` | `amount` | `DOUBLE` | **LEGACY** | Columna original IEEE-754. Mantenida en lectura legacy; sincronizada bidireccionalmente. |
| `Transactions` | `amount_minor` | `BIGINT` | **SAFE** | Presupuesto / recurrencia en centavos exactos. |
| `Transactions` | `amount` | `DOUBLE` | **LEGACY** | Columna original IEEE-754. Sincronizada con `amount_minor`. |
| `WealthSnapshots` | `net_worth_minor` | `BIGINT` | **SAFE** | Patrimonio neto histórico en centavos. |
| `WealthSnapshots` | `assets_minor` | `BIGINT` | **SAFE** | Total activos histórico en centavos. |
| `WealthSnapshots` | `liabilities_minor` | `BIGINT` | **SAFE** | Total pasivos histórico en centavos. |
| `WealthSnapshots` | `netWorth` | `DOUBLE` | **LEGACY** | Snapshot legacy IEEE-754. |
| `WealthSnapshots` | `assets` | `DOUBLE` | **LEGACY** | Snapshot legacy IEEE-754. |
| `WealthSnapshots` | `liabilities` | `DOUBLE` | **LEGACY** | Snapshot legacy IEEE-754. |
| `CurrencyHistories` | `rate_exact` | `NUMERIC(12,6)`| **SAFE** | Tipo de cambio diario oficial exacto. |
| `CurrencyHistories` | `rate` | `DOUBLE` | **LEGACY** | Tasa legacy de referencia. |
| `fx_rate_observations` | `buy_exact` | `NUMERIC(12,6)`| **SAFE** | Tasa compra spot multi-proveedor exacta. |
| `fx_rate_observations` | `sell_exact`| `NUMERIC(12,6)`| **SAFE** | Tasa venta spot multi-proveedor exacta. |
| `fx_rate_observations` | `mid_exact` | `NUMERIC(12,6)`| **SAFE** | Punto medio interbancario exacto. |
| `fx_rate_observations` | `spread_exact`| `NUMERIC(12,6)`| **SAFE** | Margen cambiario exacto. |
| `fx_rate_observations` | `buy` / `sell` / `mid` | `DOUBLE` | **LEGACY** | Compatibilidad con agregadores de tasa externos. |
| `fuel_price_observations` | `price_dop`, `subsidy_per_unit`, etc. | `DOUBLE` | **DISPLAY ONLY** | Precios de venta al público fijados semanalmente por MICM. |
| `macro_observations` | `value`, `previous_value` | `DOUBLE` | **DISPLAY ONLY** | Estadísticas macroeconómicas del BCRD (TPM %, IMAE %, Reservas MM). |
| `financial_anomalies` | `amount_actual`, `z_score`, `residual` | `DOUBLE` | **DISPLAY ONLY** | Métricas de detección econométrica y dispersión estadística. |

---

## 3. Estado de la Migración y Plan de Retiro Progresivo

1. **Fase Actual (Expand-and-Contract)**:
   - Las tablas legacy `DailyTransactions`, `Transactions`, `WealthSnapshots` y `CurrencyHistories` poseen columnas exactas (`amount_minor`, `rate_exact`) en PostgreSQL.
   - Los modelos de Sequelize contienen hooks de sincronización bidireccional automática: cualquier inserción o actualización con `amount` genera inmediatamente el `amount_minor` exacto vía `toMinorUnitsBigInt()`, y cualquier escritura en `amount_minor` mantiene consistente el valor `amount` para clientes legacy.
   - Todas las lecturas del nuevo núcleo (`LedgerReadService`, `Wealth`, `CashFlow`, `Savings`) consumen exclusivamente columnas `_minor` o saldos derivados del ledger de partida doble (`ledger_transactions` y `transaction_lines`).

2. **Criterio de Retiro Definitivo (*Contract*)**:
   - Se mantendrán las columnas legacy en modo lectura hasta que todos los clientes móviles, scripts de análisis y reportes históricos hayan migrado al 100% a la API Ledger (`/api/ledger/*`).
   - El retiro (`DROP COLUMN amount`, etc.) se planificará en una fase mayor posterior mediante migración versionada explícita, previa auditoría de cero lecturas residuales.
