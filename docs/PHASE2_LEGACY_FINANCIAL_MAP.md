# MAGNUSOS2 — PHASE II LEGACY FINANCIAL ARCHITECTURE MAP

**Fecha de mapeo:** 2026-10-04  
**Servidor:** Providence  
**Árbol de fuentes inspeccionado:** `server/` (Node.js/Express) y `src/` (React/Vite)  
**Objetivo:** Trazabilidad estricta de todos los consumidores y productores de modelos financieros legacy antes de la migración estranguladora hacia el Ledger de partida doble.

---

## 1. Resumen de Modelos Financieros Coexistentes

```
LEGACY FINANCIAL LAYER (Floats / Double Precision / Sin Partida Doble)
├── Transactions              (Plantillas recurrentes / presupuesto mensual)
├── DailyTransactions         (Movimientos diarios de ingresos y gastos)
├── WealthSnapshots           (Capturas periódicas de patrimonio)
└── CurrencyHistories         (Series históricas FX heredadas)

LEDGER FINANCIAL LAYER (BIGINT centavos / Partida Doble / Constraint Trigger DB)
├── ledger_transactions       (Cabecera de evento contable: id, user_id, date, type, payee)
├── transaction_lines         (Líneas contables: transaction_id, account_id, category_id, amount_minor)
├── accounts                  (Cuentas de balance: opening_balance_minor, current_balance_minor)
├── categories                (Catálogo jerárquico de ingresos y gastos)
├── payees                    (Entidades de contrapartida / terceros)
└── savings_goals             (Metas de ahorro vinculadas a cuentas contables)
```

---

## 2. Mapa Detallado por Modelo Legacy

### 2.1. `Transactions` (Presupuesto y Flujo Recurrente)

* **Tabla PostgreSQL:** `Transactions`
* **Campos clave:** `id`, `userId`, `name`, `amount` (FLOAT), `frequency`, `category`, `currency`, `date`, `type`, `deductions` (JSON), `validFrom`, `validTo`.
* **Semántica:** Define ingresos y gastos proyectados o periódicos (salario mensual, suscripciones, alquiler). No representa asientos contables reales ejecutados en una cuenta bancaria.

```
Transactions
    │
    ├── finanzaController.js (getTransactions, createTransaction, updateTransaction, deleteTransaction)
    │       │
    │       ▼
    │   REST API:
    │   ├── GET    /api/transactions
    │   ├── POST   /api/transactions
    │   ├── PUT    /api/transactions/:id
    │   └── DELETE /api/transactions/:id
    │           │
    │           ▼
    │       DataContext.tsx (fetch /api/transactions -> state: data[])
    │           │
    │           ├── CashFlow.tsx (Cálculo de flujo anual y mensual proyectado)
    │           ├── Dashboard.tsx (Resumen presupuestario)
    │           ├── DashboardLegacy.tsx (Métricas proyectadas)
    │           ├── Wealth.tsx (Proyección patrimonial)
    │           ├── Investments.tsx (Flujos de inversión proyectados)
    │           ├── Projections.tsx (Simulación monte carlo y forecast)
    │           ├── PrintReport.tsx (Reporte financiero exportable)
    │           └── MarketIntel.tsx (Contexto de divisas y flujo)
    │
    ├── telegramController.js (getOverview: resumen de presupuesto en bot)
    └── magnusController.js (deleteUser: borrado en cascada)
```

---

### 2.2. `DailyTransactions` (Registro Diario de Ingresos y Gastos)

* **Tabla PostgreSQL:** `DailyTransactions`
* **Campos clave:** `id`, `userId`, `date`, `amount` (FLOAT), `description`, `type` (`income` | `expense`), `category`.
* **Semántica:** Transacciones individuales registradas día a día. Almacenadas en punto flotante y sin contrapartida de partida doble en su diseño original.

```
DailyTransactions
    │
    ├── finanzaController.js (getDailyTransactions, createDailyTransaction, updateDailyTransaction, deleteDailyTransaction)
    │       │
    │       ▼
    │   REST API:
    │   ├── GET    /api/daily-transactions
    │   ├── POST   /api/daily-transactions
    │   ├── PUT    /api/daily-transactions/:id
    │   └── DELETE /api/daily-transactions/:id
    │           │
    │           ▼
    │       DataContext.tsx (fetch /api/daily-transactions -> state: dailyTransactions[])
    │           │
    │           ├── DailyTransactionModal.tsx (Alta / edición de transacciones)
    │           ├── GlobalAdjustmentModal.tsx (Ajustes de lote)
    │           ├── Tracking.tsx (Seguimiento temporal de gastos)
    │           ├── SpendingHeatmap.tsx (Mapa de calor diario)
    │           ├── CategoryCohort.tsx (Análisis de gastos por categoría)
    │           ├── FinancialSankey.tsx (Diagrama de flujo de ingresos a gastos)
    │           ├── HealthRadar.tsx (Radar de salud financiera)
    │           ├── MonteCarloRisk.tsx (Riesgo de liquidez y simulación)
    │           ├── ScenarioSimulator.tsx (Simulador de escenarios)
    │           ├── Dashboard.tsx (KPIs del mes en curso)
    │           ├── DashboardLegacy.tsx (Visualización histórica)
    │           └── PrintReport.tsx (Informe impreso)
    │
    ├── centroComandoController.js
    │       │
    │       ├── getCiclos   ──► GET /api/centro-comando/ciclos   ──► CentroComando.tsx
    │       ├── getAnual    ──► GET /api/centro-comando/anual    ──► CentroComando.tsx
    │       └── getResumen  ──► GET /api/centro-comando/resumen  ──► CentroComando.tsx
    │
    ├── econometricsController.js
    │       │
    │       ├── getForecast      ──► GET /api/econometrics/forecast      ──► Laboratory.tsx / Dashboard.tsx
    │       ├── getAnomalies     ──► GET /api/econometrics/anomalies     ──► Laboratory.tsx / Dashboard.tsx
    │       └── getDebtCapacity  ──► GET /api/econometrics/debt-capacity ──► Laboratory.tsx
    │
    ├── aiController.js
    │       │
    │       ├── analyzeFinances ──► POST /api/ai/analyze      ──► MentorshipRoom.tsx / AI Assistant
    │       ├── getQuickAdvice  ──► GET  /api/ai/quick-advice ──► Dashboard widget
    │       └── chat            ──► POST /api/ai/chat         ──► Chat flotante / AI Mentors
    │
    ├── savingsController.js
    │       │
    │       └── getSavingsOpportunities ──► GET /api/savings/opportunities ──► Savings.tsx
    │
    ├── monthlyAnalysisJob.js (Cron nocturno el día 1 de cada mes: genera monthly_snapshots)
    ├── telegramController.js (Bot de Telegram para registrar gastos rápidos)
    └── magnusController.js (deleteUser)
```

---

### 2.3. `WealthSnapshots` (Patrimonio Neto Histórico)

* **Tabla PostgreSQL:** `WealthSnapshots`
* **Campos clave:** `id`, `userId`, `date`, `totalWealth` (FLOAT), `liquidWealth` (FLOAT), `currency`.
* **Semántica:** Fotografías manuales o periódicas del patrimonio total estimado.

```
WealthSnapshots
    │
    ├── wealthController.js
    │       │
    │       ├── getWealthHistory    ──► GET  /api/wealth          ──► DataContext.tsx -> Wealth.tsx
    │       └── createWealthSnapshot ──► POST /api/wealth/snapshot ──► Wealth.tsx
    │
    └── centroComandoController.js
            │
            └── getResumen ──► GET /api/centro-comando/resumen ──► CentroComando.tsx
```

---

### 2.4. `monthly_snapshots` (Snapshots Mensuales de IA)

* **Tabla PostgreSQL:** `monthly_snapshots`
* **Campos clave:** `id`, `period`, `user_id`, `computed_metrics` (JSONB), `gemini_narrative`, `tokens_used`.
* **Semántica:** Caché analítica generada por cron para evitar llamar a Gemini LLM en cada petición.

```
monthly_snapshots
    │
    ├── Ingestor: monthlyAnalysisJob.js (Lee DailyTransactions -> computa métricas -> almacena snapshot)
    │
    └── Consumidor: aiController.js (analyzeFinances con flag deep: true)
            │
            └── POST /api/ai/analyze ──► MentorshipRoom.tsx
```

---

## 3. Comparativa de Dominio: Legacy vs Ledger

| Dimensión | Legacy (`DailyTransactions` / `Transactions`) | Ledger (`ledger_transactions` / `transaction_lines`) |
| :--- | :--- | :--- |
| **Precisión Monetaria** | `DOUBLE PRECISION` / Float JS (propenso a errores `0.1 + 0.2 = 0.30000000000000004`) | `BIGINT` en centavos (`amount_minor`). Cero pérdidas por coma flotante. |
| **Modelo Contable** | Asientos unidimensionales simples (ingreso o gasto aislado). | Partida doble universal (`SUM(amount_minor) = 0`, `>= 2` líneas por evento). |
| **Garantía DB** | Ninguna. La base de datos aceptaba valores arbitrarios. | `CONSTRAINT TRIGGER` diferido en `COMMIT` (`check_ledger_transaction_balance`). |
| **Cuentas Financieras** | Noción débil o inexistente (el dinero "aparece" o "desaparece"). | Cuentas explícitas (`accounts`) con saldo cacheado verificado contra líneas. |
| **Contrapartida** | Solo una etiqueta `category` en texto plano. | Líneas balanceadas explícitas entre cuentas y/o categorías. |
| **Multi-Moneda** | Manejo ad-hoc por campo `currency`. | Soporte nativo para `currency` y `fx_rate` a nivel de línea contable. |

---

## 4. Estado de Migración de Datos Existentes en Producción

A fecha de la auditoría y preflight:
* `DailyTransactions`: 433 filas históricas (desde `2025-12-12` hasta `2026-10-05`).
* `ledger_transactions`: 28 transacciones (56 líneas contables).
* Para el período inicial `2025-12-12` al `2026-01-26` del usuario `soberano`:
  * Coinciden exactamente 24 transacciones en ambos modelos.
  * Para el usuario `admin`: coinciden exactamente 2 transacciones en ambos modelos.
* Para transacciones posteriores al `2026-01-26`:
  * Las peticiones frontend siguieron escribiendo en `DailyTransactions` sin reflejarse en `ledger_transactions`.
  * Esto constituye una brecha temporal controlada (**MIGRATION GAP**) que no altera la validez del Ledger ni sus saldos auditados.

---

## 5. Estrategia de Migración Estranguladora (Strangler Fig)

1. **NO demoler los modelos legacy inmediatamente:** Mantener `Transactions` y `DailyTransactions` intactos durante la transición para no romper consumidores dependientes (AI, Telegram, Econometría).
2. **Introducir `LedgerReadService`:** Centralizar en un único servicio desacoplado todas las agregaciones de balances, flujos, ingresos, gastos y resúmenes contables derivados del Ledger.
3. **Módulo Piloto (`CashFlow` / `Period Summary`):** Conectar el módulo piloto al `LedgerReadService`, manteniendo un modo de comparación o diagnóstico interno.
4. **Sincronización Progresiva:** Una vez probado el piloto, canalizar las escrituras hacia el ledger y migrar secuencialmente los siguientes módulos.
