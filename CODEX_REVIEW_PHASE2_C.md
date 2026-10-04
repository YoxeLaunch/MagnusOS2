# MAGNUSOS2 — CODEX REVIEW PHASE II-C

**Fecha de auditoría:** 2026-10-04
**Rama auditada:** `phase2/ii-c`
**Commit auditado:** `3456d59`
**Base aprobada:** `4775374`
**Alcance:** `PHASE2_C_REPORT.md`, código real, migraciones PostgreSQL, precisión monetaria, evolución del schema y cadena JavaScript/JSON/UI.

## Dictamen ejecutivo

Phase II-C **no está aprobada**. El bootstrap de una base vacía y el upgrade de un respaldo anterior funcionan con los datos actuales, pero el mecanismo que se pretende desplegar contiene fallos de gobernanza capaces de ejecutar una migración pendiente automáticamente en producción, perder el bloqueo consultivo y aceptar migraciones históricas cuyo checksum fue alterado. La coexistencia `FLOAT` + `BIGINT` tampoco mantiene las columnas sincronizadas como afirma el reporte.

No debe iniciarse Phase II-D ni desplegarse este commit en producción.

## BLOCKER

### BLOCKER-01 — El arranque de producción ejecuta migraciones pendientes sin autorización

**Evidencia:** `server/models/index.js:75-85` instancia `MigrationRunner` y llama `runner.up()` también cuando `NODE_ENV === 'production'`. La base productiva consultada durante esta auditoría registra solamente `001`–`006`; `000_base_schema.sql` no está registrada. Por tanto, el siguiente arranque con este código intentaría ejecutar `000` automáticamente, aunque `PHASE2_C_REPORT.md` declara que esa migración está pendiente de autorización expresa.

Además, después del runner, `server/models/index.js:90-92` ejecuta dos `CREATE UNIQUE INDEX IF NOT EXISTS` fuera de migraciones. Esto contradice la regla de que el schema productivo cambia exclusivamente mediante migraciones versionadas.

**Impacto:** un reinicio o despliegue se convierte implícitamente en una operación DDL no autorizada. El baseline 000 contiene DDL para todo el schema y no debe usarse como una migración ordinaria sobre producción.

**Corrección requerida:** separar de forma inequívoca el arranque de la aplicación de `migrate up`; registrar 000 como baseline mediante una operación explícita, revisada y autorizada; mover todo DDL restante a migraciones; hacer que producción falle si hay migraciones pendientes, en vez de aplicarlas.

### BLOCKER-02 — El advisory lock no está ligado a una conexión PostgreSQL dedicada

**Evidencia:** `server/services/migrationRunner.js:125-127` adquiere `pg_advisory_lock` mediante una consulta del pool, las migraciones se ejecutan después mediante otras consultas/transacciones (`:132-169`) y el unlock vuelve a emitirse mediante el pool (`:180-183`). Los advisory locks de sesión pertenecen a la conexión física, no al objeto Sequelize.

**Impacto:** `up()` puede ejecutar trabajo desde una conexión que no posee el lock y el `pg_advisory_unlock` puede ocurrir en otra conexión. Esto permite carreras entre réplicas y también puede dejar el lock retenido indefinidamente en el pool, bloqueando despliegues posteriores.

**Corrección requerida:** reservar una única conexión física durante lock, lectura de estado, aplicación y unlock; o usar un transaction-level advisory lock dentro de una estrategia que serialice realmente todo el lote.

## HIGH

### HIGH-01 — Las columnas legacy y exactas divergen en actualizaciones

**Evidencia estática:** los hooks en `server/models/transaction.js:23-27,48-52` solo calculan `amountMinor` si su valor actual es falsy; en una fila cargada ya existe, por lo que cambiar `amount` no lo recalcula. La rama inversa exige que `amount === undefined`, condición falsa en una instancia cargada. El mismo defecto existe para snapshots en `server/models/wealthSnapshot.js:19-31`. `server/models/currency.js:12-16` solo sincroniza legacy→exacto y además pasa por `Number(...).toFixed(6)`.

**Prueba real ejecutada en PostgreSQL:** una fila creada con `amount=1.00` produjo `amount_minor=100`. Después de `update({amount: 2.00})` quedó `amount=2.00, amount_minor=100`; después de `update({amountMinor: 300})` quedó `amount=2.00, amount_minor=300`.

Las nuevas columnas también permiten `NULL` y no hay constraint o trigger que impida la divergencia. Por ello es incorrecta la afirmación de `docs/MONEY_STORAGE_MAP.md` y `PHASE2_C_REPORT.md` de que existe sincronización bidireccional.

**Corrección requerida:** definir una sola fuente canónica, sincronizar según campos realmente cambiados (`changed()`), rechazar conflictos y añadir reconciliación/constraints apropiados antes del switch de lecturas.

### HIGH-02 — `up()` detecta checksums alterados pero los ignora

**Evidencia:** `status()` calcula `checksumMatches` (`server/services/migrationRunner.js:97-115`), pero `up()` únicamente selecciona `!m.applied` (`:132-133`). No aborta ante `checksumMatches === false`.

**Prueba adversarial:** se reemplazó en una base aislada el checksum registrado de 005 por 64 ceros. `status` mostró `MISMATCH`, pero `up()` finalizó correctamente con `Applied 0 migration(s)`.

**Impacto:** una migración ya aplicada puede cambiar en disco sin impedir arranque o despliegue; el historial deja de ser inmutable y auditable.

**Corrección requerida:** abortar antes de cualquier migración si un archivo aplicado falta, tiene checksum nulo inesperado o no coincide. Añadir test negativo.

### HIGH-03 — El backfill no valida `NaN`, infinitos, overflow ni produce reporte de discrepancias

**Evidencia:** `server/migrations/005_exact_money_legacy_backfill.sql:18-19,33-34,64-67` convierte directamente `DOUBLE` mediante `ROUND(...::numeric)::bigint`. No hay preflight, tabla/reporte de anomalías, límite de rango ni conteo de discrepancias.

**Prueba adversarial:** con un `DailyTransactions.amount='NaN'::float8`, 005 abortó con `cannot convert NaN to bigint`. Un valor cuyo importe por 100 exceda el rango de `BIGINT` falla del mismo modo y revierte el lote completo.

En Node, `toMinorUnitsBigInt('NaN')` retorna silenciosamente `0n` (`server/models/account.js:71-72`) en lugar de rechazar el importe. La ruta SQL y la ruta Node tienen por tanto políticas incompatibles.

**Corrección requerida:** preflight sin mutación, clasificación de `NULL`/no-finito/fuera-de-rango, reporte persistible, política única de redondeo y aborto explícito antes del DDL/backfill si existe cualquier anomalía. `NaN` debe ser inválido, no cero.

### HIGH-04 — La cadena monetaria todavía convierte BIGINT/moneda a `Number` o `parseFloat`

**Evidencia representativa:** `server/controllers/econometricsController.js:54,108` y `server/controllers/aiController.js:153` convierten `currentBalanceMinor` con `Number`; `server/controllers/telegramController.js:122-129`, `server/services/econometricsService.js:451,479,503,508` y `server/jobs/monthlyAnalysisJob.js:71` agregan dinero con `parseFloat`; los controladores legacy siguen serializando `amount` como número (`server/controllers/finanzaController.js:38,125`).

Esto contradice la afirmación de que la nueva cadena consume exclusivamente valores exactos. Los tests de BIGINT cubren el servicio ledger, pero no estos consumidores ni toda la ruta PostgreSQL→Sequelize→JSON→React/chart. Los gráficos principales sí contienen una guarda (`src/apps/finanza/pages/Dashboard.tsx:108-109`), lo cual es positivo, pero no compensa las conversiones anteriores.

**Impacto:** saldos superiores a `Number.MAX_SAFE_INTEGER` pierden centavos antes de llegar a JSON/UI, análisis econométrico, IA o Telegram.

**Corrección requerida:** transportar cantidades exactas como strings de minor units; convertir a número solo para display/chart después de comprobar rango; documentar y probar el contrato JSON.

## MEDIUM

### MEDIUM-01 — La prueba declarada de “snapshot anterior” no prueba un upgrade

`tests/integration/postgresSchemaGovernance.test.js:154-162` ejecuta `up()` sobre una base que ya tiene todas las migraciones aplicadas y espera cero cambios. Eso prueba idempotencia, no una actualización desde schema anterior.

La auditoría suplió esta omisión restaurando `/home/osvaldo/backups/magnus-os2/magnus_pre_phase2c_backup.sql` en una base aislada y ejecutando 000→006. El upgrade terminó correctamente y conservó 433 `DailyTransactions`, 21 `Transactions` y 2 `WealthSnapshots`. Debe incorporarse como test reproducible, no quedar como comprobación manual.

### MEDIUM-02 — El detector de schema drift puede declarar “0 drift” con diferencias reales

`server/services/schemaDriftService.js:90` omite silenciosamente una tabla crítica si no encuentra modelo. Solo registra un mismatch cuando el modelo espera BIGINT y la DB tiene DOUBLE (`:104-117`). No compara el resto de tipos, precisión/escala de NUMERIC, nulabilidad, defaults, PK/FK, índices, constraints o ENUM; además normaliza `TEXT` y `VARCHAR` como equivalentes (`:39`).

**Corrección requerida:** fallar si falta el modelo esperado y comparar un manifiesto explícito de columnas críticas, incluyendo tipo exacto, `numeric_precision/scale`, nullability, defaults e invariantes.

### MEDIUM-03 — 005 toma locks y actualiza tablas completas sin estrategia operativa

005 agrupa varios `ALTER TABLE` y backfills completos dentro de un único bloque/transacción. No define `lock_timeout`, no trabaja por lotes y no estima filas. En tablas grandes, cada `ADD COLUMN` necesita lock fuerte y los `UPDATE` prolongan la transacción.

**Corrección requerida:** documentar presupuesto de lock, configurar timeout, separar expansión de backfill, ejecutar backfill por lotes y verificar progreso/reconciliación antes del switch.

### MEDIUM-04 — Las columnas exactas siguen siendo opcionales y no son aún fuente de verdad

005 agrega columnas `BIGINT`/`NUMERIC` sin `NOT NULL`; los modelos también usan `allowNull: true`. Los endpoints legacy continúan leyendo/escribiendo FLOAT. Esta coexistencia puede ser válida como etapa expand-and-contract, pero clasificar esas columnas como `SAFE` y declarar completada la eliminación progresiva es prematuro mientras no exista garantía de población y una ruta canónica.

## LOW

### LOW-01 — La prueba fresh deja una base residual

`tests/integration/postgresSchemaGovernance.test.js:111-151` crea `magnus_fresh_test`, cierra la conexión, pero no elimina la base en el `finally`. Esto deja estado persistente entre ejecuciones y puede ocultar problemas operativos.

### LOW-02 — `status` no es estrictamente de solo lectura

`getAppliedMigrations()` llama `ensureMigrationsTable()` (`server/services/migrationRunner.js:71-78`), por lo que `npm run db:status` puede crear una tabla. Un comando de inspección productiva debería ser read-only o anunciar explícitamente su mutación.

## PASS

- **Fresh PostgreSQL:** en una base vacía aislada, 000→006 aplicó correctamente y dejó 36 tablas públicas.
- **Upgrade real:** el respaldo anterior a II-C migró correctamente a 000→006.
- **Reconciliación del respaldo:** cero `NULL` y cero diferencias contra la fórmula implementada en 433 movimientos diarios, 21 transacciones y los campos monetarios de 2 snapshots.
- **Estado productivo leído sin mutar:** 001→006 registrados; 000 ausente. Los datos actuales consultados mostraron cero discrepancias para 433 movimientos diarios, 21 transacciones y 2 snapshots de patrimonio según la fórmula actual.
- **Sequelize sync:** PostgreSQL de producción ya no llama `sequelize.sync()`. El `sync()` restante está limitado a SQLite (`server/models/index.js:64-73` y `server/models/system/index.js:15-19`). Esto pasa el criterio estricto sobre `sync`, aunque no pasa la gobernanza global por BLOCKER-01.
- **Regresión:** `npm test` terminó 51/51 y `npm run test:postgres` terminó 51/51 en 13 suites.
- **Rounding negativo:** la conversión string→minor units aplica el signo después del redondeo de magnitud, consistente para medios centavos positivos y negativos; debe preservarse y formalizarse con vectores de prueba.
- **Producción:** esta auditoría solo realizó consultas de lectura en producción. Las pruebas mutantes se ejecutaron en bases PostgreSQL aisladas.

## Condiciones mínimas para una nueva revisión

1. Eliminar migraciones automáticas y DDL ad hoc del arranque productivo; resolver el baseline 000 explícitamente.
2. Corregir el advisory lock con una conexión dedicada y añadir prueba concurrente.
3. Hacer obligatorio el checksum y probar mismatch/migración faltante.
4. Corregir la coexistencia legacy/exacta, con tests de updates en ambos sentidos y conflictos.
5. Añadir preflight, reporte de anomalías, overflow/NaN/Infinity y reconciliación de tolerancia cero a 005.
6. Sustituir conversiones monetarias inseguras a `Number`/`parseFloat` o imponer guardas de rango hasta JSON, React y charts.
7. Incorporar un upgrade real desde snapshot anterior y fortalecer schema drift.

# CHANGES REQUIRED
