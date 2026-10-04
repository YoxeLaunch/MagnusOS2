# MAGNUSOS2 — CODEX REVIEW PHASE II-B

**Fecha de revisión:** 2026-10-04  
**Rama:** `phase2/ledger-unification`  
**HEAD inspeccionado:** `77ed13d`  
**Modo:** adversarial; producción sólo lectura; escrituras limitadas a `magnus_test` y eliminadas al terminar  
**Resultado:** **CHANGES REQUIRED**

## Resumen ejecutivo

Phase II-B no debe aprobarse. La base productiva está reconciliada en este instante, y una transferencia estándar marcada correctamente como `transfer` es neutra. Sin embargo, las rutas reales de escritura, los reembolsos, las reasignaciones a inversión, Savings y las pantallas Wealth/Dashboard todavía producen métricas financieras incorrectas.

La prueba más grave es reproducible en PostgreSQL real: sobre una cuenta con `current_balance_minor = '100000'`, crear mediante `createTransaction` un ingreso de 5.00 dejó el cache en `'100000500'`, es decir, 1,000,005.00 en lugar de 1,005.00. Sequelize entrega `BIGINT` como cadena y el controlador usa `cadena + número`.

También se reprodujo lo siguiente:

- gasto 100.00 seguido por refund 40.00: el servicio devolvió gasto 100.00 y neto -100.00, no gasto neto 60.00;
- reasignación interna de 200.00 desde efectivo hacia una cuenta de inversión propia, con `type=investment`: devolvió `totalInvested=200` y `netCashFlow=-200`, aunque el patrimonio consolidado permaneció inalterado;
- entrada externa de 300.00 etiquetada `transfer`: desapareció por completo de ingreso y cash flow;
- `toMinorUnits('90071992547409.93')` produjo `9007199254740994`, no `9007199254740993`.

Las 51 pruebas unitarias, las 28 pruebas PostgreSQL y el build pasan, pero no cubren estos contraejemplos.

## Fórmula auditada de Wealth

La fórmula contable correcta implementada por el read model es:

```text
derivedBalanceMinor(account, t)
  = openingBalanceMinor(account)
  + SUM(transaction_lines.amount_minor WHERE account_id = account AND tx.date <= t)

netWorthMinor(t)
  = SUM(derived balances de activos)
  - SUM(valor absoluto de saldos de pasivos)
```

`currentBalanceMinor` es sólo cache de reconciliación; no debe sumarse a `openingBalanceMinor` ni a las líneas. `LedgerReadService.getBalances()` aplica correctamente `opening + SUM(lines)` y no suma el cache (`server/services/ledgerReadService.js:94-130`). La UI de Wealth no consume este resultado y usa otra fórmula legacy, por lo que la corrección del servicio no llega al usuario.

## Hallazgos

### BLOCKER-01 — Las escrituras normales corrompen saldos BIGINT por concatenación

- **Archivos:** `server/controllers/ledgerController.js:471-484`, `server/controllers/importController.js:343-369`, `server/controllers/savingsController.js:245-264`.
- **Causa:** PostgreSQL/Sequelize devuelve `BIGINT` como string. `const newBalanceMinor = (account.currentBalanceMinor || 0) + delta` concatena; Savings repite el mismo patrón con `goal.currentAmountMinor + toMinorUnits(amount)`. La rama de ingresos del importador también usa `string + number`.
- **Evidencia PostgreSQL:** saldo inicial `'100000'`; ingreso 5.00; respuesta HTTP simulada 201; saldo cacheado final `'100000500'`. El ledger derivado correcto era `100500`.
- **Impacto:** balances, Wealth, Dashboard, reconciliación y posteriores deletes quedan falsos. Un delete intenta además revertir desde el cache ya corrupto.
- **Corrección requerida:** hacer toda aritmética en `BigInt`, persistir strings enteros y agregar tests de controlador reales en PostgreSQL para create/transfer/delete/import/contribution, comprobando `cached == opening + SUM(lines)` tras cada operación.

### BLOCKER-02 — La neutralidad se decide por una etiqueta, no por las contrapartes reales

- **Archivo:** `server/services/ledgerReadService.js:193-227`.
- **Causa:** cualquier cabecera `type === 'transfer'` se omite sin verificar que todas las líneas financieras sean cuentas propias; cualquier `type === 'investment'` cuenta toda línea negativa como salida aunque la contraparte sea otra cuenta propia.
- **Evidencia:** una entrada externa 300.00 con una línea de cuenta y contraparte no-account, etiquetada `transfer`, devolvió ingreso/neto 0. Una transferencia cash → investment propia de 200.00 etiquetada `investment` devolvió neto -200.00 aunque `getNetWorth` no cambió por esa reasignación.
- **Impacto:** una clasificación equivocada crea u oculta income/expense/investment sin que cambie el asiento. No se cumple la invariante consolidada para todos los movimientos A → B.
- **Corrección requerida:** clasificar desde las líneas. Sólo es transferencia interna neutral si las contrapartes monetarias son cuentas del mismo usuario y el neto consolidado por moneda es cero. Una inversión hacia cuenta propia es reasignación patrimonial, no pérdida ni salida consolidada. Rechazar combinaciones de `type` y estructura incompatibles.

### BLOCKER-03 — Wealth visible no usa la fórmula ledger y puede contar inversiones dos veces

- **Archivos:** `src/apps/finanza/pages/Wealth.tsx:11-44`, `src/apps/finanza/utils/calculations.ts:173-224`, `src/apps/finanza/context/DataContext.tsx:53-118`.
- **Causa:** Wealth llama `getPortfolioSnapshot`, no `/api/finanza/wealth/net-worth`. `investedAssets` suma inversiones legacy y siempre suma `dailyInvestment`; el saldo de una cuenta de inversión se usa además cuando no hay inversión legacy. Una misma inversión dual-escrita puede estar en cuenta, `Transactions` y `DailyTransactions`.
- **Otro error:** `liquidAssets = accountsBalance > 0 ? accountsBalance : dailyNet`; un saldo ledger real igual a cero o negativo se sustituye por cash flow legacy.
- **Impacto:** el patrimonio presentado puede duplicar/triplicar capital invertido o inventar liquidez cuando el saldo consolidado es cero/negativo.
- **Corrección requerida:** Wealth debe consumir exclusivamente el net worth ledger por fecha. Los activos externos que no sean cuentas requieren identidad/idempotencia explícita, no heurísticas `> 0`.

### HIGH-01 — Refunds y reversos no reducen gastos/ingresos

- **Archivos:** `server/models/ledger.js:44-48`, `server/services/ledgerReadService.js:206-226`.
- **Causa:** el enum no tiene `refund`; CashFlow sólo suma income positivo, expense negativo e investment negativo. Un expense con abono positivo se ignora en vez de restarse del gasto.
- **Evidencia:** expense -100.00 + refund expense +40.00 produjo expense 100.00, net -100.00 y un día artificial de ceros; el correcto es expense neto 60.00 y net -60.00.
- **Corrección requerida:** definir reversos/refunds contablemente y agregar casos de reembolso total, parcial, cross-month y reverso de income.

### HIGH-02 — El filtro de fechas de la UI Cash Flow no funciona

- **Archivos:** `src/apps/finanza/api/finanzaApi.ts:262-270`, `server/controllers/ledgerController.js:493-546`.
- **Causa:** el cliente envía `startDate`/`endDate`; el controlador lee `from`/`to`.
- **Impacto:** elegir un mes o rango en “Flujo Real (Ledger)” devuelve todo el histórico. Las pruebas llaman al servicio directamente y no prueban el contrato HTTP/frontend.
- **Corrección requerida:** unificar nombres y añadir prueba de endpoint que incluya inicio, fin inclusivo, mes vacío, cruce de mes y 31/1 → 1/2.

### HIGH-03 — Savings puede crear y duplicar “ahorro” sin movimiento de dinero

- **Archivos:** `server/controllers/savingsController.js:90-123,210-267,365-456`, `src/apps/finanza/pages/Savings.tsx:409-430`.
- **Problemas:** una contribución incrementa sólo `currentAmountMinor`; no crea ni exige transferencia ledger. `transactionId` es opcional, no se valida por usuario y no es único. La misma transferencia puede respaldar múltiples aportes o metas. Varias metas pueden enlazar la misma cuenta y `totalSaved` suma todas. Una meta enlazada copia el saldo sólo al crearse y luego diverge de la cuenta.
- **Savings rate:** `totalGoalContributions` se informa aparte pero nunca participa en `totalSaved`; a la vez las inversiones se restan como si no fueran ahorro. No existe una definición consistente entre contribution, transfer, investment y rate.
- **Impacto:** el mismo dinero se puede contar varias veces o aparecer como ahorro sin salida de la cuenta origen.
- **Corrección requerida:** elegir una fuente canónica. Un aporte debe referenciar de forma única una transferencia ledger válida entre cuentas propias, o ser sólo una asignación sin sumarse como activo. Derivar progreso, no mantener un segundo balance mutable.

### HIGH-04 — La cadena BIGINT no es segura de entrada a gráfico

- **Archivos:** `server/models/account.js:85-113`, `server/controllers/ledgerController.js:112-127`, `src/apps/finanza/api/finanzaApi.ts:12-24,211-259`, `src/apps/finanza/pages/CashFlow.tsx:303-391`, `src/apps/finanza/utils/calculations.ts:183-224`.
- **Causa:** `toMinorUnits` convierte primero a `Number`; los controladores validan/suman como `number`. El backend devuelve a veces number y a veces string. React vuelve a ejecutar `Number(...)`, y Recharts recibe doubles.
- **Evidencia:** `90071992547409.93` se convirtió a `9007199254740994` minor; `fromMinorUnits('9007199254740991')` devolvió `90071992547409.9`, perdiendo la representación centesimal del contrato.
- **Impacto:** el test >2^53 sólo prueba una lectura directa que retorna string; no prueba POST → PostgreSQL → JSON → React → chart.
- **Corrección requerida:** parser decimal-string → BigInt sin float; campos minor siempre string en JSON; formatter decimal exacto; conversión explícita y acotada sólo para visualización gráfica, con señal de overflow.

### HIGH-05 — Dashboard continúa en modelos legacy y presenta métricas distintas

- **Archivos:** `src/apps/finanza/pages/Dashboard.tsx:66-127`, `src/apps/finanza/context/DataContext.tsx:46-118`.
- **Causa:** Dashboard calcula flujo desde `DailyTransactions` y presupuesto desde `Transactions`; no consume CashFlow/Savings ledger. La UI por defecto de CashFlow también abre las pestañas legacy de income/expense; ledger es una tercera pestaña optativa (`CashFlow.tsx:116-199`).
- **Impacto:** dos pantallas del mismo usuario pueden mostrar income, expense, investment, balance y savings rate incompatibles. La afirmación de “Financial Read Unification” no se sostiene.
- **Corrección requerida:** migrar consumidores o etiquetarlos inequívocamente como legacy; no mezclar sus resultados en KPIs consolidados.

### HIGH-06 — Editar opening balance rompe la igualdad exacta

- **Archivo:** `server/controllers/accountsController.js:97-131`.
- **Causa:** PATCH cambia `openingBalanceMinor` pero no ajusta `currentBalanceMinor` ni crea asiento de ajuste.
- **Impacto:** inmediatamente `cached != opening + SUM(lines)`; Wealth ledger cambia retroactivamente para todas las fechas y Accounts sigue mostrando el cache anterior.
- **Corrección requerida:** bloquear edición cuando hay movimientos o registrar un asiento de ajuste con fecha y política histórica explícita, actualizando el cache atómicamente.

### MEDIUM-01 — El comparador que gobierna Savings sigue sin probar identidad de transacciones

- **Archivo:** `server/services/ledgerReadService.js:650-719`.
- **Causa:** compara totales y conteos, no claves idempotentes. Una transacción faltante y otra extra del mismo tipo/importe producen `EXACT_MATCH`. Convierte legacy mediante el `toMinorUnits(Number)` inseguro y usa `Number(netDiffMinor)` para clasificar rounding.
- **Impacto:** el switch puede elegir ledger incompleto o legacy incorrecto aunque los agregados coincidan accidentalmente.
- **Corrección requerida:** reconciliar por identificador de migración, fecha, tipo, moneda e importe exacto; informar transfers aparte.

### MEDIUM-02 — Aislamiento incompleto para categorías, payees y metas enlazadas

- **Archivos:** `server/controllers/ledgerController.js:130-176`, `server/services/ledgerReadService.js:280-345`, `server/controllers/savingsController.js:90-110`, `server/migrations/001_ledger_balance_constraint_trigger.sql:38-49`.
- **Causa:** el trigger garantiza ownership de account, pero no de category/payee. La API acepta sus UUID sin comprobar propietario. El bypass administrativo de Savings permite crear una meta de A enlazada a una cuenta de B; la base no impone igualdad de usuarios.
- **Impacto:** metadatos de B pueden aparecer en informes de A y procesos admin/migración pueden contaminar el progreso de metas entre usuarios.
- **Corrección requerida:** validar ownership en servicio y DB para todas las referencias tenant-scoped. Un admin que actúa para A debe respetar las mismas invariantes financieras.

### MEDIUM-03 — `transactionCount` mensual cuenta días, no transacciones

- **Archivo:** `server/services/ledgerReadService.js:591-632`.
- **Causa:** `getPeriodSummaries` incrementa una vez por elemento de `timeline`, que está agregado por día.
- **Impacto:** cinco movimientos el mismo día se reportan como una transacción; afecta analítica y reconciliación de períodos.

### LOW-01 — El endpoint de balance ignora `asOf`

- **Archivo:** `server/controllers/accountsController.js:170-193`.
- **Causa:** acepta `asOf`, pero siempre devuelve `currentBalanceMinor` cacheado.
- **Impacto:** respuesta históricamente falsa aunque el campo `asOf` parezca confirmar el corte.

### LOW-02 — La respuesta de meta nueva declara progreso cero aunque copie saldo

- **Archivo:** `server/controllers/savingsController.js:90-123`.
- **Causa:** cuando hay linked account copia `currentBalanceMinor`, pero responde `progress: 0`.

## PASS verificados

- **PASS — transferencia estándar interna:** dos cuentas asset del mismo usuario, líneas `-X/+X`, `type=transfer`; no genera income, expense ni net cash flow y no cambia net worth.
- **PASS — fórmula backend de Wealth:** `openingBalanceMinor + SUM(lines)`; `currentBalanceMinor` sólo se compara como cache, no se suma.
- **PASS — fecha en servicio:** rangos DATEONLY inclusivos y `asOfDate` excluyen correctamente el día posterior cuando se llama con los nombres correctos.
- **PASS — mes vacío en servicio:** devuelve totales cero y timeline vacío.
- **PASS — aislamiento principal:** cabeceras y cuentas se filtran por usuario; el trigger impide una línea de cuenta de B dentro de una transacción de A.
- **PASS — invariantes PostgreSQL:** cabecera sin líneas, menos de dos líneas, suma distinta de cero y reparentado inválido son rechazados al commit.
- **PASS — producción actual read-only:** 28 cabeceras, 56 líneas, 0 asientos desbalanceados/con menos de dos líneas, 0 account lines cross-user. Las tres cuentas actuales tienen `current_balance_minor == opening_balance_minor + SUM(lines)`; para `soberano`, 4,879,902 minor units.
- **PASS — validación declarada reproducida:** `npm test` 51/51, `npm run test:postgres` 28/28 y `npm run build` exitoso. Estas suites no invalidan los hallazgos adversariales.

## Matriz de casos Cash Flow

| Caso | Resultado |
|---|---|
| income normal | PASS en read service; escritura cacheada BLOCKER |
| expense normal | PASS en read service; escritura cacheada BLOCKER |
| refund parcial/total | FAIL — no netea el gasto |
| transfer asset A → asset B con tipo correcto | PASS |
| entrada/salida externa mal etiquetada transfer | FAIL — queda invisible |
| cash → investment propia con `type=investment` | FAIL — salida ficticia consolidada |
| investment cash → categoría externa | PASS bajo la semántica actual de salida de caja |
| empty month | PASS en servicio |
| cross-month/date boundary | PASS en servicio; FAIL desde filtro frontend |
| BIGINT extremo | FAIL end-to-end |
| multiuser account lines | PASS |

## Decisión

El estado productivo actual es reconciliado, pero el sistema no preserva esa condición ante su ruta principal de escritura. Tampoco existe todavía una única verdad financiera en Wealth, Savings y Dashboard. Deben corregirse como mínimo los tres BLOCKER, refunds, contrato de fechas, Savings y la cadena BIGINT antes de continuar.

**CHANGES REQUIRED**
