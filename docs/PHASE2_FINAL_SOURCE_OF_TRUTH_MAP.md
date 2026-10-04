# MAGNUSOS2 — PHASE II FINAL SOURCE OF TRUTH MAP

**Fecha:** 2026-10-04  
**Versión:** 2.0.0-final-remediation  
**Autor:** Antigravity (Auditoría: Codex)  
**Estado:** REMEDIATION IN PROGRESS  

---

## 1. Declaración de Principios Contables

1. **Único Núcleo Financiero:** El libro mayor de doble entrada (`ledger_transactions` y `transaction_lines`) es la **única fuente de verdad** para todo movimiento de dinero real ejecutado, saldo de cuenta bancaria/efectivo, flujo de caja realizado y patrimonio neto.
2. **Dominio de Planificación vs Dinero Real:**
   - La entidad `Transactions` representa **únicamente presupuestos, plantillas recurrentes y planes financieros** (`PLAN ONLY`).
   - `Transactions` **NUNCA** se suma con asientos contables reales del ledger.
   - `Transactions` **NUNCA** se utiliza para calcular patrimonio neto (`Net Worth`), balance real de cuentas, flujo de caja realizado ni progreso real de ahorro.
   - En frontend y API, los planes se presentan inequívocamente como proyecciones/presupuestos, jamás como transacciones ejecutadas.
3. **Cierre de Escrituras Legacy:**
   - `DailyTransactions` queda en modo de sólo lectura (`read-only`) para consultas históricas y queda deshabilitada para escrituras contables directas.
   - Nuevos movimientos reales se canalizan obligatoriamente hacia el Ledger con partida doble balanceada, coherencia de monedas y aislamiento estricto por usuario.
4. **Clasificaciones Finales Permitidas:**
   - `LEDGER`: Módulos conectados de manera exclusiva a la fuente contable oficial (`ledger_transactions`, `transaction_lines`, `accounts`, `LedgerReadService`).
   - `PLAN ONLY`: Módulos de planificación, simulación, presupuestos y recurrencias futuras (`Transactions`), sin impacto en balances reales.
   - `DISPLAY ONLY`: Componentes puros de visualización, mapas de calor, reportes exportados o gráficos derivados de fuentes `LEDGER` o `PLAN ONLY` sin persistencia contable propia.
   - `ARCHIVED`: Tablas, scripts o endpoints obsoletos congelados para compatibilidad histórica o pendientes de retiro.
   - `BLOCKED`: Endpoints o caminos de mutación desactivados para prevenir divergencias contables.

---

## 2. Matriz de Fuentes de Verdad (Source of Truth Matrix)

| MODULE | CURRENT SOURCE | TARGET SOURCE | ACTION | STATUS |
| :--- | :--- | :--- | :--- | :--- |
| **Accounts** | `accounts` + `transaction_lines` | `accounts` + `transaction_lines` (`LedgerReadService.getBalances`) | Mantener ledger oficial. Balances derivados recalculados desde líneas contables. | **LEDGER** |
| **Ledger** | `ledger_transactions` + `transaction_lines` | `ledger_transactions` + `transaction_lines` | Núcleo transaccional de partida doble con constraints multimoneda estrictos. | **LEDGER** |
| **Cash Flow** | Híbrido (`LedgerReadService` vs `Transactions` presupuestado) | `LedgerReadService.getCashFlow` | Flujo de caja realizado alimentado 100% de transacciones ledger. Presupuesto segregado como plan. | **LEDGER** |
| **Wealth (Net Worth)** | Ledger actual + `WealthSnapshots` histórico | Ledger read model (`LedgerReadService.getNetWorth`) | Patrimonio actual e histórico derivado del ledger (`assets + liabilities`). Snapshots son fotos del ledger. | **LEDGER** |
| **Savings** | `savings_goals` + cuentas ledger | `savings_goals` + `accounts` (`LedgerReadService.getBalances`) | Progreso = saldo derivado de cuenta vinculada. Aportes = transferencias ledger a cuenta de meta. | **LEDGER** |
| **Dashboard** | Híbrido (`LedgerReadService` + fallback `DailyTransactions`) | `LedgerReadService` | KPIs reales (ingresos, gastos, balance, cashflow) derivados exclusivamente de ledger. | **LEDGER** |
| **Dashboard Legacy** | `Transactions` + `DailyTransactions` | `Transactions` (planes) / `LedgerReadService` (real) | Retirar o reconvertir en visor presupuestario comparativo. No muta datos. | **ARCHIVED** |
| **Tracking** | `DailyTransactions` | `LedgerReadService` (timeline / gastos por fecha) | Conectar seguimiento temporal a eventos del ledger por usuario y fecha. | **LEDGER** |
| **Investments** | `Transactions` (planes) + `DailyTransactions` | `ledger_transactions` (`type: investment`) | Movimientos de inversión derivados de asientos ledger con categoría y cuenta de inversión. | **LEDGER** |
| **Print Report** | Cálculo local sobre legacy | `LedgerReadService` | Reporte financiero formal derivado de asientos ledger cerrados y conciliados. | **DISPLAY ONLY** |
| **Projections** | `DailyTransactions` + simulación local | `Transactions` (planes) + baseline `LedgerReadService` | Simulaciones Monte Carlo basadas en planes (`PLAN ONLY`) y baseline de saldo ledger. | **PLAN ONLY** |
| **Econometrics** | `DailyTransactions` + `accounts` | `LedgerReadService` | Series temporales de ingresos/gastos y liquidez extraídas directamente del ledger. | **LEDGER** |
| **Centro de Comando** | `DailyTransactions` + `WealthSnapshots` | `LedgerReadService` (`getCashFlow`, `getBalances`, `getPeriodSummaries`) | Métricas ejecutivas y ciclos anuales calculados desde transacciones contables del ledger. | **LEDGER** |
| **AI financial context** | `DailyTransactions` + `accounts` | `LedgerReadService` | Contexto de mentores y análisis financiero alimentado exclusivamente por datos ledger auditados. | **LEDGER** |
| **Telegram** | `DailyTransactions` directas | Ledger API (`POST /api/finanza/ledger/transactions`) | Registro de gastos/ingresos desde bot genera transacciones de doble entrada en cuenta default. | **LEDGER** |
| **monthly analysis** | Cron leyendo `DailyTransactions` | `LedgerReadService.getPeriodSummaries` | Ingesta nocturna calcula métricas mensuales a partir del libro mayor oficial. | **LEDGER** |
| **imports** | `importController` creando ledger txs | `LedgerTransaction` + `TransactionLine` | Confirmar que CSV/OFX/PDF genera siempre asientos contables balanceados en minor units. | **LEDGER** |
| **charts** | Estado React derivado de legacy | Estado React derivado de `LedgerReadService` | Visualizaciones consumen strings exactos o números derivados con guardas de seguridad. | **DISPLAY ONLY** |
| **exports** | JSON/CSV legacy | Datos ledger oficiales normalizados | Exportación de libro diario contable y balances en centavos y formato decimal exacto. | **DISPLAY ONLY** |
| **POST/PUT/DELETE /api/daily-transactions** | CRUD directo legacy | Adaptado a ledger o bloqueado | Bloqueo de mutaciones directas sobre tabla legacy; adaptación a transacción ledger. | **BLOCKED** |

---

## 3. Dominio de Presupuesto (`Transactions`) — Plan Only Policy

Para erradicar ambigüedad entre transacciones proyectadas y transacciones reales:

1. **Definición Ontológica:**
   - La tabla `Transactions` pasa a denominarse conceptualmente **`BudgetPlans`** / **`RecurringTemplates`**.
   - Los registros de esta tabla son **intenciones de gasto o ingreso periódico** (ej. "Renta esperada: 25,000 DOP el día 1 de cada mes").
2. **Restricciones de Uso:**
   - **Prohibido:** No se sumarán filas de `Transactions` con saldos de cuentas de balance (`accounts`).
   - **Prohibido:** No se utilizarán montos de `Transactions` para computar `Net Worth` real.
   - **Prohibido:** No se reportarán importes de `Transactions` como "Gastos Realizados" en el Cash Flow.
3. **Puntos de Contacto Permitidos:**
   - Comparativas `Presupuestado vs Real` (Variance Analysis).
   - Generación de proyecciones a futuro (`Projections.tsx`).
   - Plantillas para registrar transacciones reales con un solo clic (creando un asiento en `ledger_transactions`).

---

## 4. Política de Retiro de `DailyTransactions`

1. **Fase Actual (Cutover y Estrangulación):**
   - La tabla `DailyTransactions` física se preserva temporalmente para auditoría e integridad histórica de backups.
   - Las 405 filas posteriores a la migración inicial son mapeadas deterministicamente e importadas al ledger mediante `scripts/cutover-daily-transactions.js`.
   - Se instala tabla `legacy_daily_transaction_mappings` con restricción única `daily_transaction_id` para garantizar idempotencia y trazabilidad 1:1.
2. **Corte de Escrituras:**
   - Endpoints `/api/daily-transactions` rechazan mutaciones directas sin asiento contable o las convierten transparentemente en transacciones ledger de doble entrada.
   - El frontend `DataContext` deja de enviar requests mutantes a `/api/daily-transactions`.
3. **Retiro Definitivo:**
   - Una vez estabilizada la producción y auditado el cutover por Codex, la tabla será marcada formalmente para archivado o eliminación en Phase III.
