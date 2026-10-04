# MAGNUSOS2 — PHASE II FINANCIAL CONSUMER MAP & INVENTORY
**Fecha:** 2026-10-04  
**Rama:** `phase2/ledger-unification`  
**Objetivo:** Mapeo exhaustivo de consumidores financieros entre modelos heredados (`DailyTransaction`, `Transaction`, `WealthSnapshot`) y el modelo de doble partida (`LedgerTransaction`, `TransactionLine`, `Account`, `LedgerReadService`).

---

## 1. CLASIFICACIÓN DE CONSUMIDORES

| Dominio / Módulo | Controlador / Archivo | Modelo Fuente Principal | Clasificación | Estrategia de Migración |
|---|---|---|---|---|
| **Cuentas y Balances** | `accountsController.js`, `ledgerController.js` | `Account`, `TransactionLine` | **MIGRATED** | Saldo derivado directamente con `SUM(amount_minor)` en PostgreSQL. Cero dependencia de legacy. |
| **Flujo de Caja (Cash Flow)** | `ledgerController.getCashFlowSummary`, `CashFlow.tsx` | `LedgerReadService`, `TransactionLine` | **MIGRATED** | Vista `LedgerCashFlowView` y API `/api/finanza/cashflow`. Discrimina transferencias internas e inversiones. |
| **Ahorros (Savings & Goals)** | `savingsController.js`, `Savings.tsx` | `LedgerReadService.getPeriodSummaries` | **MIGRATED** (Strangler) | Convivencia inteligente con `compareLegacyVsLedger`. Usa Ledger cuando hay concordancia exacta; fallback a legacy ante `MIGRATION_GAP`. |
| **Patrimonio (Wealth / Net Worth)** | `wealthController.js`, `WealthWidget.tsx` | `LedgerReadService.getNetWorth`, `Account` | **HYBRID** | Endpoint `/api/wealth/net-worth` con parámetro `asOfDate`. Snapshots históricos conviven con saldos derivados de cuentas. |
| **Dashboard Financiero** | `finanzaController.js`, `Dashboard.tsx` | `DataContext.tsx` (`accounts` + `ledger`) | **HYBRID** | Los balances de cuentas provienen de PostgreSQL (`accountsApi`). Se mantiene compatibilidad retroactiva para presupuestos recurrentes. |
| **Centro de Comando** | `centroComandoController.js`, `CentroComando.tsx` | `DailyTransaction` / `LedgerReadService` | **HYBRID** | Mapea ciclos financieros (día 26 a 25). Listo para consumir `LedgerReadService` preservando fallback. |
| **Econometría Avanzada** | `econometricsController.js` | `DailyTransaction`, `CurrencyHistory` | **LEGACY** (Intacto) | **NO TOCAR** según restricción estricta de Fase II-B (pendiente de Fase III). |

---

## 2. DETALLE DE ENDPOINTS Y CONTRATOS API

### 2.1 Módulos Migrados (MIGRATED)
- `GET /api/finanza/accounts`: Cuentas con saldo en caché y saldo derivado.
- `GET /api/finanza/accounts/:id/balance`: Saldo atómico derivado en tiempo real.
- `GET /api/finanza/ledger`: Listado de transacciones con líneas y asientos balanceados.
- `GET /api/finanza/cashflow`: Resumen operativo segregando ingresos, gastos, inversiones y transferencias.
- `GET /api/finanza/savings-rate`: Tasa de ahorro calculada desde `LedgerReadService` con control de discrepancia.
- `POST /api/finanza/ledger/transactions`: Inserción con validación de partida doble y pertenencia de cuenta en trigger diferido.

### 2.2 Módulos Híbridos (HYBRID)
- `GET /api/wealth/net-worth` & `GET /api/finanza/wealth/net-worth`: Cálculo exacto de patrimonio neto `openingBalance + movements` a una fecha `asOfDate`.
- `GET /api/wealth/history`: Snapshots manuales y mensuales históricos.
- `GET /api/centro-comando/anual` & `GET /api/centro-comando/mensual`: Métricas por ciclo financiero con fallback seguro.

### 2.3 Módulos Heredados (LEGACY - Intactos)
- `GET /api/econometrics/*`: Modelos predictivos autoregresivos (ARIMA/OLS) y análisis de consumo marginal (MPC). Intactos.

---

## 3. FORMULACIÓN Y SEMÁNTICA CONTABLE UNIFICADA

1. **Partida Doble:** Cada evento financiero posee cabecera `LedgerTransaction` y $\ge 2$ líneas `TransactionLine` con $\sum \text{amount\_minor} = 0$.
2. **Saldo de Cuenta Derivado:**
   $$\text{DerivedBalance} = \text{OpeningBalance} + \sum \text{amount\_minor}$$
3. **Flujo de Caja Neto:**
   $$\text{NetCashFlow} = \text{Income} - \text{Expenses} - \text{Investments}$$
   *Las transferencias entre cuentas propias no afectan el Flujo de Caja Neto.*
4. **Patrimonio Neto a una Fecha ($t$):**
   $$\text{NetWorth}(t) = \sum_{a \in \text{Accounts}} \left( \text{OpeningBalance}_a + \sum_{l \in \text{Lines}_a, \text{date} \le t} \text{amount\_minor}_l \right)$$
