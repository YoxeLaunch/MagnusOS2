# MAGNUSOS2 — CODE REVIEW PHASE II-A

**Fecha de revisión:** 2026-10-04  
**Rama inspeccionada:** `phase2/ledger-unification`  
**HEAD:** `b180d74`  
**Base declarada:** `24c7b83442ac320842ee0c6db07c661bc84ee0d4`  
**Modo:** adversarial, read-only sobre producción; escrituras limitadas a la PostgreSQL de test y limpiadas al terminar  
**Resultado:** **CHANGES REQUIRED**

## Resumen ejecutivo

Phase II-A no debe aprobarse. La suite declarada pasa, pero no cubre varios contraejemplos que rompen las garantías centrales:

- el trigger permite cabeceras con cero líneas y permite dejar una transacción con cero líneas mediante `UPDATE transaction_id`;
- el guardrail central acepta una URL de producción si se expresa mediante otra dirección y la cadena contiene `test` en cualquier parte;
- el switch mensual elige ledger con que exista una sola transacción migrada y omite el resto de movimientos legacy del mismo mes;
- la migración piloto contabilizó las inversiones con signo positivo en “Efectivo”, aunque el read model las resta del cash flow;
- `asOfDate` no se aplica, el fin de mes incluye el día 1 del mes siguiente y los campos numéricos pierden precisión por conversiones `BigInt -> Number`;
- el frontend no consume ninguno de los endpoints piloto y continúa leyendo/escribiendo los modelos legacy.

La base productiva está algebraicamente cuadrada en este momento (28 cabeceras, 56 líneas, cero sumas desbalanceadas y saldos cacheados iguales a los derivados), pero existe un error semántico de saldo: para `soberano`, dos inversiones por 11,500.00 DOP incrementaron “Efectivo” en vez de reducirlo o transferirlo a una cuenta de inversión. Con opening balance 0, “Efectivo” muestra 71,799.02 DOP mientras el net cash flow del mismo ledger es 48,799.02 DOP. La distancia, 23,000.00 DOP, equivale a dos veces el importe con signo invertido.

## Verificaciones ejecutadas

- `npm run test:postgres`: **18/18 PASS**, PostgreSQL 16.15 real en `magnus_test`, usuario `magnus_test_user`, puerto host `127.0.0.1:5433`.
- `npm test`: **51/51 PASS**. Esta suite usa SQLite `:memory:` y además realiza accesos de red, por lo que no sustituye la integración PostgreSQL.
- `npm run build`: **PASS**; advertencias no bloqueantes de Vite/Browserslist/chunk grande.
- Pruebas adversariales adicionales en `magnus_test`: guardrail, cabecera sin líneas, reparentado de líneas, fronteras de fecha, `asOfDate`, ownership, filtros de categoría y BIGINT.
- Consultas productivas únicamente dentro de `BEGIN READ ONLY ... ROLLBACK`.
- No se hizo push, no se ejecutaron tests contra producción y no se borraron/modificaron datos productivos.

## Hallazgos

### BLOCKER-01 — La garantía PostgreSQL de mínimo dos líneas es evadible

- **File:** `server/migrations/001_ledger_balance_constraint_trigger.sql`
- **Line/function:** líneas 4-45, `check_ledger_transaction_balance()`
- **Evidence:** el constraint trigger sólo se dispara por cambios en `transaction_lines`; una cabecera insertada sin líneas no dispara nada. Se insertó en `magnus_test` una cabecera y el `COMMIT` terminó con `headers=1, lines=0`. Además, para `UPDATE`, la función comprueba únicamente `NEW.transaction_id` (líneas 11-15). Se movieron las dos líneas balanceadas de A hacia B; el commit dejó A con 0 líneas y B con 4 líneas/suma 0.
- **Impact:** la afirmación de que PostgreSQL garantiza `COUNT(*) >= 2` para toda transacción es falsa. Procesos internos, migraciones o futuras actualizaciones de líneas pueden crear cabeceras inválidas sin que la base lo impida.
- **Recommended fix:** impedir cabeceras sin líneas mediante una estrategia que valide también la tabla padre al commit; en `UPDATE transaction_id`, comprobar tanto `OLD.transaction_id` como `NEW.transaction_id` cuando difieran. Añadir pruebas PostgreSQL para cero líneas, reparentado y cambios masivos.

### BLOCKER-02 — El guardrail central contra producción se puede eludir

- **File:** `server/config/database.js`
- **Line/function:** líneas 20-43, `createSequelizeInstance`
- **Evidence:** considera segura cualquier URL cuyo texto contenga `test`, salvo dos substrings concretos. La URL equivalente a producción `postgresql://magnus:test-only-password@<IP-del-contenedor>:5432/magnus` fue aceptada y configuró dialecto PostgreSQL. La prueba no abrió conexión. `tests/integration/setupTestDb.js:12-35` es más estricto, pero sólo protege la suite de integración; `npm test` usa modelos destructivos (`tests/ledgerReadService.test.js:26-31`) sin invocar ese guardrail estricto.
- **Impact:** un entorno heredado o una ejecución manual puede hacer que tests con `destroy`, `TRUNCATE` o `sync` apunten a producción. Es riesgo directo de pérdida de datos y balances.
- **Recommended fix:** parsear la URL una sola vez y exigir allowlist exacta de DB, usuario, host/puerto y/o un marcador consultado dentro de la base de test. Reutilizar el mismo guardrail antes de toda suite y antes de cualquier reset; no usar coincidencias de substring.

### BLOCKER-03 — El fallback mensual omite datos reales en meses parcialmente migrados

- **File:** `server/controllers/savingsController.js`
- **Line/function:** líneas 383-417, `getSavingsRate`
- **Evidence:** si `ledgerCashFlow.transactionCount > 0`, el endpoint usa sólo ledger. En enero de 2026 para `soberano`, legacy contiene 22 movimientos y ledger sólo 15. Legacy: ingreso 33,975.01, gasto 12,680.39, inversión 11,500.00; ledger: ingreso 30,475.01, gasto 8,655.14, inversión 11,500.00. El endpoint por defecto devuelve ledger y omite 7 movimientos legacy. El neto cambia de 9,794.62 a 10,319.87 DOP, una sobreestimación de 525.25 DOP.
- **Impact:** tasa de ahorro y cash flow mensual incorrectos precisamente durante la convivencia legacy/ledger. El switch no es un strangler seguro a granularidad mensual.
- **Recommended fix:** usar un corte de migración verificable por período/ID, dual-write idempotente o exigir reconciliación exacta antes de seleccionar ledger. Nunca decidir por `transactionCount > 0`.

### BLOCKER-04 — La semántica de inversión de la migración altera el saldo de “Efectivo”

- **File:** `scripts/migrate-data.js`
- **Line/function:** líneas 242-290, `migrateDailyTransactions`; `server/services/ledgerReadService.js:193-199`
- **Evidence:** el script sólo da signo negativo a `expense`; `investment` entra con signo positivo en la cuenta. En producción hay dos inversiones por 1,500 y 10,000 DOP con línea positiva en la cuenta `Efectivo` y contraparte de categoría negativa. El read model después resta esos positivos como inversión. La cuenta tiene opening 0, saldo derivado/cacheado 71,799.02, mientras `income - expense - investment` es 48,799.02.
- **Impact:** el ledger cuadra formalmente pero sobrestima efectivo/patrimonio. Si la inversión es una salida, el signo es incorrecto; si es una reclasificación de activo, falta una cuenta de inversión y no corresponde una categoría. En ambos casos la representación actual es contablemente falsa.
- **Recommended fix:** definir la póliza contable de inversión. Para compra de activo: crédito a efectivo y débito a cuenta de inversión; para gasto/inversión externa: línea negativa en efectivo y contraparte adecuada. Corregir los registros piloto mediante migración auditada y reconciliar saldo, cash flow y patrimonio.

### HIGH-01 — Frontera mensual incluye el primer día del mes siguiente

- **File:** `server/controllers/savingsController.js`; `server/services/ledgerReadService.js`
- **Line/function:** `getSavingsRate`, líneas 370-390; `getCashFlow`, líneas 124-129
- **Evidence:** `monthEnd` se calcula como el primer día del mes siguiente, pero se pasa a `getCashFlow`, que usa `Op.lte`. En PostgreSQL de test, rango `2026-01-01` a `2026-02-01` contó el gasto del 1 de febrero: ingreso 100, gasto 30, 2 transacciones.
- **Impact:** totales y tasa mensual contaminados por el mes siguiente.
- **Recommended fix:** adoptar intervalos semiabiertos `[start, nextMonthStart)` con `Op.lt`, o pasar como fin inclusivo el último día del mes. Documentar un único contrato temporal.

### HIGH-02 — `getNetWorth({ asOfDate })` ignora la fecha de corte

- **File:** `server/services/ledgerReadService.js`
- **Line/function:** líneas 419-454, `getNetWorth`
- **Evidence:** `asOfDate` sólo se copia a la respuesta; el cálculo llama `getBalances()` sin filtro temporal. En test, una consulta `asOfDate=2026-01-01` incluyó movimientos de octubre.
- **Impact:** estados históricos y snapshots pueden mostrar el saldo actual etiquetado como histórico.
- **Recommended fix:** derivar por cuenta `opening_balance_minor + SUM(lines de transacciones con date <= asOfDate)`. Definir también la fecha efectiva del opening balance o prohibir cortes anteriores a ella.

### HIGH-03 — Conversión insegura de BIGINT en salidas financieras

- **File:** `server/services/ledgerReadService.js`; `server/models/account.js`
- **Line/function:** conversiones `Number(bigint)` en líneas 102-112, 211-227, 303-318, 394-409, 450-452, 523, 563-565; `fromMinorUnits` líneas 85-90
- **Evidence:** con `9007199254740993` minor units, el string exacto permaneció correcto pero `derivedBalance` devolvió `90071992547409.92`, no `90071992547409.93`. El test existente sólo usa 50,000,000,000, muy por debajo de `Number.MAX_SAFE_INTEGER`.
- **Impact:** respuestas JSON, comparaciones, porcentajes y UI pueden perder centavos para valores grandes aunque PostgreSQL almacene correctamente.
- **Recommended fix:** mantener strings/decimal arbitrario de extremo a extremo; no publicar un campo `number` si excede el rango seguro. Añadir caso > 2^53 y contrato TypeScript consistente.

### HIGH-04 — Ownership no es una invariante del read model ni de la base

- **File:** `server/services/ledgerReadService.js`; `server/controllers/ledgerController.js`
- **Line/function:** `getCashFlow` líneas 124-163; `createTransaction` líneas 130-151
- **Evidence:** `getCashFlow` filtra la cabecera por `userId`, pero no exige que la cuenta incluida pertenezca al mismo usuario. Una cabecera de A con línea ligada a una cuenta de B fue contabilizada como ingreso 777 para A en PostgreSQL de test. La API regular evita el caso, pero el camino admin omite por completo la comprobación de ownership y puede crearlo.
- **Impact:** contaminación cruzada de balances/read models y acceso indirecto a datos de otra cuenta si una migración, admin o bug genera la relación inválida.
- **Recommended fix:** validar siempre `account.user_id === ledger_transaction.user_id`, incluso para admin actuando en nombre de un usuario. Considerar enforcement DB mediante función/trigger y agregar pruebas a nivel servicio/controlador, no sólo un `SELECT WHERE user_id` aislado.

### HIGH-05 — El “piloto frontend” no está migrado

- **File:** `src/apps/finanza/context/DataContext.tsx`; `src/apps/finanza/api/finanzaApi.ts`; `src/apps/finanza/pages/CashFlow.tsx`
- **Line/function:** `DataProvider` líneas 46-118 y mutaciones posteriores; API client completo líneas 1-218
- **Evidence:** el frontend sigue leyendo `/api/transactions` y `/api/daily-transactions` y escribe en esos endpoints legacy. No hay referencia frontend a `/api/finanza/cashflow` ni `/api/finanza/savings-rate`, no existen interfaces TypeScript para sus respuestas y no hay loading/error state específico del piloto.
- **Impact:** la UI Cash Flow no valida ni consume el nuevo read model; los nuevos movimientos continúan ampliando la brecha de migración. La compilación exitosa no prueba el contrato del endpoint nuevo.
- **Recommended fix:** crear cliente tipado, integrar la pantalla piloto con JWT mediante `apiFetch`, estados loading/error/cancelación y una sola solicitud por período. Definir dual-write o detener escrituras legacy antes de declarar el piloto migrado.

### MEDIUM-01 — Los filtros `categoryIds` declarados se ignoran y los splits se reducen a la primera línea

- **File:** `server/services/ledgerReadService.js`
- **Line/function:** `getIncome` líneas 236-323; `getExpenses` líneas 328-414
- **Evidence:** ambos métodos reciben `categoryIds` pero nunca lo aplican. En test, pedir sólo categoría C1 devolvió C1 y C2, total 120. Además usan `.find()` para una sola línea de cuenta y una sola categoría, por lo que una transacción split legítima puede quedar subcontada o atribuida a una categoría arbitraria.
- **Impact:** filtros y agregaciones por categoría producen resultados falsos.
- **Recommended fix:** filtrar/validar todas las líneas relevantes y definir cómo prorratear splits; añadir tests con varias cuentas y varias categorías.

### MEDIUM-02 — El comparador puede clasificar erróneamente diferencias

- **File:** `server/services/ledgerReadService.js`
- **Line/function:** líneas 595-682, `compareLegacyVsLedger`
- **Evidence:** compara el número total de cabeceras ledger, incluyendo transferencias que se excluyen de importes, contra DailyTransactions; cualquier diferencia de conteo domina y se etiqueta `MIGRATION_GAP`, incluso si es negativa o si los importes divergen por semántica. La explicación afirma siempre que faltan `countDiff` filas legacy. También usa `Number`/FLOAT para el lado legacy.
- **Impact:** diagnósticos `EXACT_MATCH/MIGRATION_GAP/SEMANTIC_DIFFERENCE` no son confiables en presencia de transferencias, duplicados o cantidades grandes.
- **Recommended fix:** comparar por clave de migración/idempotencia y por tipo normalizado; excluir transferencias de ambos conteos o informarlas aparte; no inferir causa sólo del conteo.

### MEDIUM-03 — Las migraciones de test no son reproducibles sobre un esquema ya creado

- **File:** `tests/integration/setupTestDb.js`
- **Line/function:** líneas 49-73, `initializeTestPostgres`
- **Evidence:** `sequelize.sync({ force: true })` y las migraciones sólo se ejecutan si no existe `ledger_transactions`. Si cambia una migración y el contenedor sigue vivo, no se reaplica. La migración 003 captura e ignora cualquier error. No hay tabla de historial ni comando de reset dedicado; `docker compose ... down` podría afectar también servicios productivos del mismo Compose.
- **Impact:** una suite verde puede estar comprobando un esquema residual distinto del repositorio actual.
- **Recommended fix:** runner de migraciones versionado, reset explícito que sólo acepte `postgres_test`, checksum/historial y fallo inmediato ante cualquier migración fallida.

### LOW-01 — El diagnóstico de tipo de base reporta SQLite durante tests PostgreSQL

- **File:** `server/config/database.js`
- **Line/function:** líneas 85-106, `sequelizeSystem` y `getDatabaseInfo`
- **Evidence:** ambas ejecuciones de integración imprimieron `Using PostgreSQL` y después `Database Type: sqlite` porque `getDatabaseInfo` sólo mira `DATABASE_URL`, no `DATABASE_URL_TEST`.
- **Impact:** logs y cualquier rama futura basada en `getDatabaseInfo()` pueden ejecutar lógica SQLite durante integración PostgreSQL.
- **Recommended fix:** derivar el tipo desde la instancia/dialecto o desde la URL efectiva ya resuelta.

### LOW-02 — N+1 demostrable en reconciliación existente

- **File:** `server/controllers/ledgerController.js`
- **Line/function:** líneas 403-435, `reconcileBalances`
- **Evidence:** carga todas las cuentas y ejecuta un `TransactionLine.sum` por cuenta dentro del loop.
- **Impact:** latencia lineal en número de cuentas. No se observó impacto actual con sólo tres cuentas productivas.
- **Recommended fix:** agrupar sumas por `account_id` en una consulta, sin optimización adicional innecesaria.

## Reconciliación independiente legacy vs ledger

Resultados actuales, calculados directamente en PostgreSQL y no mediante el reporte ni el servicio:

| Usuario / período | Legacy | Ledger | Resultado |
|---|---:|---:|---|
| `admin`, todo el histórico | income 72,890.00; expense 1,000.00; invested 0; net 71,890.00; 2 tx | idéntico; 2 tx | `EXACT_MATCH` actual |
| `soberano`, 2025-12-01 a 2026-01-26 inclusivo | income 73,133.52; expense 12,834.50; invested 11,500.00; net 48,799.02; 24 tx | idéntico; 24 tx | `EXACT_MATCH` en ventana migrada |
| `soberano`, todo el histórico | income 382,828.51; expense 195,554.37; invested 133,300.00; net 53,974.14; 277 tx | income 73,133.52; expense 12,834.50; invested 11,500.00; net 48,799.02; 24 tx | brecha real de 253 tx |

Los importes absolutos publicados en `PHASE2_A_REPORT.md` para admin y para la ventana migrada de soberano no pudieron reproducirse en el estado actual. Los netos sí coinciden con los publicados, pero los desgloses y conteos de admin no. Esto puede indicar que los datos cambiaron después del reporte; el reporte no conserva snapshot/hash/consulta parametrizada suficiente para demostrar sus cifras.

## PASS verificados

- **PASS — PostgreSQL real y separado:** contenedor `postgres:16-alpine`, DB `magnus_test`, usuario distinto, puerto loopback 5433 y almacenamiento `tmpfs` separado del volumen productivo.
- **PASS — Migración 001 presente en test:** función y constraint trigger existen y son diferidos; rechazan una línea y suma distinta de cero. El alcance incompleto está documentado en BLOCKER-01.
- **PASS — Rollback:** rollback explícito no dejó cabecera ni líneas.
- **PASS — Transferencia estándar:** dos cuentas del mismo usuario, suma cero; `getCashFlow` no la cuenta como ingreso ni gasto.
- **PASS — Category-only counterparties:** las 28 transacciones productivas tienen una línea de cuenta y una contraparte categórica; no hay contrapartes huérfanas.
- **PASS — JWT/ruta:** `/api/finanza/cashflow` está montado bajo `/api` y protegido por `router.use(verifyJWT)`.
- **PASS — Índices base:** existen `(user_id,date)` en cabeceras ledger y los índices de FKs en líneas. El nuevo read service no presenta N+1 en su consulta principal.
- **PASS — Estado productivo algebraico actual:** 28 transacciones, 56 líneas, cero violaciones de suma/conteo, cero líneas de cuenta cross-user existentes y tres cuentas cacheadas reconciliadas con sus líneas.

## Decisión

**PHASE II-A STATUS: CHANGES REQUIRED**

No continuar Phase II-B. Deben corregirse y volver a probarse, como mínimo, los cuatro BLOCKER, las fronteras temporales, `asOfDate`, ownership y BIGINT. Después se debe reparar/reconciliar la semántica de las inversiones piloto antes de confiar en cualquier saldo o patrimonio derivado.
