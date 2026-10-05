# MAGNUSOS2 — PHASE II FINAL INDEPENDENT AUDIT

**Fecha:** 2026-10-04
**Rama auditada:** `phase2/ii-d`
**HEAD auditado:** `7934260`
**Modo:** revisión independiente y adversarial; producción consultada exclusivamente en transacciones `READ ONLY`
**Decisión:** **PHASE II REQUIRES REMEDIATION**

## 1. Executive summary

MagnusOS2 todavía no posee un único núcleo financiero coherente, reproducible y verificable de extremo a extremo.

El ledger nuevo sí tiene una base sólida: en producción hay 28 cabeceras, 56 líneas, cero asientos desbalanceados, cero cabeceras con menos de dos líneas, cero cruces entre usuarios y cero diferencias entre balances cacheados y derivados. Las transferencias internas de una sola moneda, refunds, inversiones, límites temporales, pasivos, ahorro y BIGINT pasan sus pruebas PostgreSQL.

Sin embargo, la afirmación global falla por cuatro motivos:

1. `Transactions`, `DailyTransactions` y `WealthSnapshots` continúan siendo stores activos. La UI principal todavía lee y escribe legacy, y econometría, IA, Centro de Comando, reportes, tracking, proyecciones, Telegram y jobs siguen dependiendo de esos datos.
2. El ledger permite una transacción balanceada numéricamente que mezcla monedas o declara una moneda distinta de la cuenta. PostgreSQL suma minor units sin separar divisa y el endpoint genérico tampoco exige `line.currency = account.currency`.
3. Producción no representa el código final de Phase II: sólo registra migraciones `001–006`; no registra baseline `000` ni aplica `007`/`008`. Las columnas exactas legacy siguen nullable y los cuatro constraints de equivalencia de `007` no existen.
4. El contenedor productivo fue construido antes de II-C/II-D. Los probes nuevos no están desplegados y, incluso en el código candidato, el orden de routers hace que liveness/readiness queden accidentalmente detrás del JWT financiero.

La mejora desde la auditoría inicial es real, pero los reportes de hardening y II-D sobrestiman el estado global. El ledger es un núcleo candidato confiable para operaciones monomoneda; aún no es la fuente única del sistema.

### Hallazgos que impiden aprobación

| ID | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| F-01 | BLOCKER | No existe una única fuente financiera | `DataContext` lee y escribe `/api/transactions` y `/api/daily-transactions`; 405 filas legacy son posteriores a la última fecha presente en ledger. |
| F-02 | BLOCKER | Invariante contable no separa monedas | Una prueba rollback en PostgreSQL aceptó `+10000 USD` y `-10000 DOP` sobre cuentas DOP porque la suma escalar fue cero. |
| F-03 | HIGH | Producción está detrás del schema y código aprobados | `schema_migrations` contiene sólo `001–006`; `000`, `007` y `008` están pendientes; el contenedor productivo es de las 14:31 UTC. |
| F-04 | HIGH | Health II-D no está integrado correctamente | `/api/health/live` y `/api/health/ready` responden `401`; `/api/health` sigue siendo el probe superficial. |
| F-05 | HIGH | Persisten conversiones monetarias inseguras en frontend | Wealth convierte directamente strings exactos mediante `Number(...)`, incluida la respuesta ledger. |
| F-06 | HIGH | Observabilidad de jobs no cumple todo lo declarado | Mutex sólo en memoria; no hay recuperación automática de ejecuciones persistidas tras crash; la purga existe pero no se programa. |
| F-07 | HIGH | Dependencias con superficie runtime permanecen vulnerables | `npm audit --omit=dev`: 39 vulnerabilidades, incluidas 22 high y 2 critical; varias afectan el stack HTTP/WebSocket activo. |

## 2. Architecture before/after

### Antes

```text
UI financiera ──> Transactions / DailyTransactions (DOUBLE PRECISION)
Accounts/Import ──> Ledger (BIGINT)
Schema ──> sequelize.sync()
Auth/Socket ──> identidad insuficientemente validada
Backups ──> creados, no restaurados de forma probada
```

### Después

```text
Accounts / Ledger / Net worth / cash-flow real ──> Ledger (BIGINT)
Planes / diario / analytics / reportes ──────────> Legacy exact-shadow + DOUBLE
Schema PostgreSQL candidato ─────────────────────> Migraciones versionadas
Producción actual ───────────────────────────────> Migraciones 001–006, imagen anterior
Auth HTTP/WebSocket ─────────────────────────────> JWT y ownership endurecidos
Restore drill ───────────────────────────────────> PostgreSQL aislado, comprobado
```

El patrón resultante sigue siendo híbrido. La separación entre “planes” y “real” ayuda a la UI, pero no elimina las dos fuentes ni garantiza dual-write/cutover completo.

## 3. Ledger status

### Producción observada

| Invariante | Resultado |
|---|---:|
| Cabeceras | 28 |
| Líneas | 56 |
| Cabeceras con menos de 2 líneas | 0 |
| `SUM(lines) != 0` | 0 |
| Débitos | 22,545,802 minor units |
| Créditos | 22,545,802 minor units |
| Líneas con cuenta de otro usuario | 0 |
| Balances cacheados divergentes | 0 |
| `transaction_id IS NULL` | 0 |
| Cuenta/line currency mismatch actual | 0 |
| Transacciones actuales con más de una moneda | 0 |

### Fórmula de balance

La fórmula implementada y reconciliada es correcta:

```text
derived_balance_minor = opening_balance_minor + SUM(transaction_lines.amount_minor)
difference_minor      = current_balance_minor - derived_balance_minor
```

`current_balance_minor` es caché y no un tercer sumando. No se encontró doble conteo entre opening balance, caché y ledger en el read model.

### Transferencias internas

Las pruebas automatizadas confirman que una transferencia propia y monomoneda A → B:

```text
A = -X
B = +X
income = expense = profit = loss = 0
delta patrimonio consolidado = 0
```

La garantía no cubre correctamente el caso multimoneda. `check_single_ledger_transaction()` suma todos los `amount_minor` sin agrupar por currency. `createTransaction()` permite que el cliente sobrescriba `line.currency`; sólo el helper especializado `createTransfer()` compara monedas de las cuentas. La prueba adversarial directa fue aceptada por todos los constraints:

```text
Cuenta DOP / línea USD  +10000
Cuenta DOP / línea DOP  -10000
SUM = 0                => COMMIT permitido por el trigger
```

La prueba se ejecutó dentro de una transacción y terminó en `ROLLBACK`; no dejó datos.

### Production reconciliation pre/post

Se restauraron tres backups en bases PostgreSQL temporales y se compararon con producción actual:

| Estado | Daily rows | Income | Expense | Investment | Ledger tx/lines | Saldo `soberano` minor |
|---|---:|---:|---:|---:|---:|---:|
| Pre-hardening 14:09 | 433 | 669,225.25 | 383,936.77 | 133,300.00 | 28 / 56 | 7,179,902 |
| Post-hardening 15:10 | 433 | 669,225.25 | 383,936.77 | 133,300.00 | 28 / 56 | 7,179,902 |
| Pre-II-C 17:30 | 433 | 669,225.25 | 383,936.77 | 133,300.00 | 28 / 56 | 4,879,902 |
| Producción actual | 433 | 669,225.25 | 383,936.77 | 133,300.00 | 28 / 56 | 4,879,902 |

La única variación encontrada es `−2,300,000` minor units en la cuenta `soberano`, exactamente la corrección auditada del signo de dos inversiones por 11,500.00 DOP. Los movimientos legacy y los conteos ledger permanecen iguales. No existe alteración monetaria inexplicada entre estos puntos, aunque la cobertura ledger sigue siendo parcial.

## 4. Financial source-of-truth matrix

| MODULE | SOURCE real | STATUS |
|---|---|---|
| Accounts / balances | `accounts` + `transaction_lines` | LEDGER |
| Ledger page | `ledger_transactions` + `transaction_lines` | LEDGER |
| Cash Flow “Flujo Real” | `LedgerReadService` | LEDGER |
| Cash Flow planes ingreso/gasto | `Transactions` | ACTIVE LEGACY |
| Daily entry / timeline | `DailyTransactions` | ACTIVE LEGACY, READ/WRITE |
| Wealth current net worth | Ledger read model | LEDGER |
| Wealth history | `WealthSnapshots` | ACTIVE LEGACY |
| Dashboard KPIs principales | Ledger con elementos/fallback legacy | HYBRID |
| Dashboard widgets / bills / insights | `Transactions` + `DailyTransactions` | ACTIVE LEGACY |
| Tracking | `DailyTransactions` | ACTIVE LEGACY |
| Investments | `Transactions` + `DailyTransactions` | ACTIVE LEGACY |
| Print Report | `Transactions` + `DailyTransactions` + cálculo local | ACTIVE LEGACY |
| Projections | `DailyTransactions` + cálculo local | ACTIVE LEGACY |
| Econometrics | `DailyTransactions` + balance ledger cacheado | HYBRID |
| Centro de Comando | `DailyTransactions` | ACTIVE LEGACY |
| AI financial context | `DailyTransactions` + accounts | HYBRID |
| Telegram summary | `Transactions` + `DailyTransactions` | ACTIVE LEGACY |
| Monthly analysis job | `DailyTransactions` | ACTIVE LEGACY |
| Savings goals/progress | Ledger account + savings metadata | LEDGER |
| Savings rate | Ledger o legacy según comparación | HYBRID |

Evidencia principal: `src/apps/finanza/context/DataContext.tsx` mantiene `/api/transactions` y `/api/daily-transactions` como carga global y muta ambos stores. En producción existen 433 `DailyTransactions`; 405 tienen fecha posterior a la última transacción del ledger.

Objetivo ideal `Ledger / Ledger / Ledger / Ledger`: **NO ALCANZADO**.

## 5. Database

### PASS

- `synchronous_commit = on` en producción.
- La aplicación conectada usa `magnus_app`, con `rolsuper=false`, `rolcreatedb=false`, `rolcreaterole=false` y `rolbypassrls=false`.
- El rol administrador `magnus` sigue siendo superuser para operación del contenedor, pero no es el usuario observado en las conexiones de aplicación.
- No hay `sequelize.sync()` en el camino PostgreSQL de producción del código candidato. Los `sync()` activos están limitados a SQLite; un script legacy dentro de `server/backup/corpses` conserva `force:true` pero no es runtime.
- Fresh database `000→008` y upgrade de schema anterior pasan en PostgreSQL real.

### NO PASS en producción

`schema_migrations` contiene:

```text
001, 002, 003, 004, 005, 006
```

No contiene `000`, `007` ni `008`. Los checksums registrados de `001–006` sí coinciden con los archivos actuales.

Consecuencias observadas:

- `DailyTransactions.amount_minor`, `Transactions.amount_minor` y los exactos de `WealthSnapshots` siguen nullable.
- No existen los cuatro constraints validados de equivalencia legacy/exacto de `007`.
- No existe `job_executions` de `008` en producción.
- El código final, si se desplegara sin ejecutar el runbook, abortaría correctamente por migraciones pendientes.

Por tanto, schema candidato consistente no equivale a schema productivo actualizado.

## 6. Money precision

### PASS

- Ledger transaccional: PostgreSQL `BIGINT` en minor units.
- FX exacto candidato: `NUMERIC(12,6)`.
- Parsers backend rechazan `NaN`, infinito, overflow y formatos inválidos.
- Los endpoints principales publican strings exactos cuando un importe no cabe de forma segura en JavaScript `Number`.
- Legacy exact-shadow reconcilió sin diferencias en el restore drill: 433 daily, 21 planned transactions, 2 wealth snapshots y 1,000 FX rows.

### Riesgos restantes

- Producción todavía conserva `DOUBLE PRECISION` como columna legacy activa y no tiene constraints `007`.
- Wealth usa `Number(ledgerCashFlow.netCashFlow)`, `Number(account.balance)` y `Number(ledgerNetWorth.assets)` sin la guarda que sí usa Dashboard. Un valor exacto superior a `Number.MAX_SAFE_INTEGER` pierde precisión visual y en KPIs.
- Interfaces TypeScript de ledger todavía aceptan `amount: number` y numerosos módulos legacy calculan con `number`/`parseFloat`.
- El defecto multimoneda permite sumar minor units que representan unidades distintas.

## 7. Migrations

La gobernanza candidata es sustancialmente mejor:

- tabla `schema_migrations`;
- checksum SHA-256;
- advisory lock ligado a una conexión física;
- `status` read-only;
- `up` explícito;
- baseline separado con confirmación;
- detección de archivo ausente/checksum adulterado;
- fresh DB y upgrade real probados.

Resultado independiente de integración: las nueve migraciones `000–008` funcionan desde cero; el upgrade anterior funciona; 70/70 pruebas PostgreSQL pasan.

Riesgo operativo actual: producción está deliberadamente a mitad del proceso. Esto es seguro frente a un despliegue accidental porque el nuevo bootstrap falla cerrado, pero impide declarar Phase II operativa hasta completar el runbook autorizado y desplegar una imagen consistente.

## 8. Tests

| Comando | Total | Passed | Failed | Resultado |
|---|---:|---:|---:|---|
| `npm test` | 51 | 51 | 0 | PASS |
| `npm run test:postgres` | 70 | 70 | 0 | PASS |
| Total automatizado | 121 | 121 | 0 | PASS |
| `npm run build` | 1 build | 1 | 0 | PASS con warning de chunks |
| Restore drill real | 1 | 1 | 0 | PASS |
| Docker build | 2 imágenes | ver sección Docker | 0 al cierre | PASS |

Cobertura positiva:

- partida doble, mínimo de líneas y rollback;
- ownership y multiusuario;
- transferencias internas monomoneda;
- refunds, inversión, pasivos y ahorro;
- BIGINT > 2^53 y límites PostgreSQL;
- fresh migration, upgrade, checksums y drift;
- reconciliación read-only y restore.

Huecos detectados:

- no existe test de currency por cuenta/línea ni suma cero por moneda;
- health se prueba llamando controladores, no atravesando el orden real de routers;
- deep health no tiene prueba de autorización admin;
- observabilidad no prueba reinicio real ni concurrencia entre procesos;
- unit tests dependen de red externa y son más lentos/frágiles de lo necesario.

## 9. Backups/restore

Se ejecutó de nuevo el restore real, no sólo `gzip -t`:

```text
Backup: magnus_pre_phase2c_backup.sql
SHA-256: 7416e670800df0643a4c067c020f5465f2cb51f672efa4c499161390caca7a36
Tamaño: 2.59 MB
Destino: 127.0.0.1:5433/magnus_restore_drill
Restore + migración + validación: SUCCESS
RTO técnico observado: 2.46 s
Schema drift: 0 en 18 columnas críticas
Cleanup: base y roles temporales eliminados
```

El RTO sólo mide una base pequeña y local; no incluye descarga off-host, reconstrucción/despliegue de aplicación, verificación de usuarios ni cambio de tráfico.

Riesgos restantes:

- backups y volumen productivo siguen en el mismo host/disco;
- la aplicación monta el directorio de backups en modo escritura;
- no se encontró copia off-host/inmutable;
- dos backups antiguos tenían permisos `0664/0644`, aunque el directorio padre actual es `0700` y los nuevos están en `0600`.

## 10. Security regression check

### PASS

- JWT es autoridad para identidad HTTP.
- Los usuarios regulares no pueden cambiar `userId` mediante body/query.
- Socket.IO exige JWT y fija el remitente desde el token.
- Namespace Docker exige JWT y admin; terminal está deny-by-default.
- El sandbox corre como `sandboxuser` y los tres servicios tienen límites de memoria/PID.
- `magnus_app` no es superuser.
- `synchronous_commit=on`.

### Hallazgos

- El health deep candidato usa sólo `requireAuthenticated`, no `requireAdmin`, contrario a `PHASE2_D_REPORT.md`.
- Por orden de montaje, `finanzaRoutes` instala `verifyJWT` antes de `healthRoutes`; el probe público real `/api/health/live` y readiness devuelven `401`.
- El endpoint `/api/health` definido directamente antes del router sigue devolviendo un `200 {status:"ok"}` superficial, por lo que Docker puede permanecer healthy aunque schema/migrations estén incompatibles.
- La imagen productiva no contiene la consolidación II-D y no puede ofrecer sus garantías operativas.

## 11. Dependencies

Resultado actual de `npm audit --omit=dev`:

```text
Total 39: 2 low, 13 moderate, 22 high, 2 critical
```

### Reachable o con superficie runtime

- `engine.io`, `socket.io-parser`, `ws`: forman el transporte Socket.IO activo. JWT reduce exposición funcional, pero no vuelve el parser de red “no alcanzable”.
- `express`, `body-parser`, `qs`, `express-rate-limit`: procesan tráfico HTTP real.
- `multer`: existe una ruta de upload autenticada.
- `sequelize`: es el ORM de todos los caminos DB; no se demostró explotación del advisory de JSON cast, pero requiere actualización/prueba.
- `react-router-dom`: frontend activo; los advisories de redirect/XSS requieren evaluar los destinos controlables por usuario.

### Likely unreachable en runtime normal

- `tar` vía `sqlite3/node-gyp`: principalmente instalación/build; el sistema no ofrece extracción arbitraria de tar al usuario.
- partes de `protobufjs` vía SDKs: no se encontró parsing de esquemas `.proto` suministrados por usuario.

### Needs upgrade

- Socket.IO/Engine.IO/parser/ws.
- Express/body-parser/qs/rate-limit.
- Sequelize, tras pruebas de compatibilidad.
- React Router.
- Multer.

### Accepted risk temporal

- `sqlite3@6` y `dockerode@5` requieren actualización mayor controlada; no debe usarse `npm audit fix --force`.

El reporte II-D es incompleto al clasificar paquetes de red activos como no alcanzables por el solo hecho de existir autenticación.

## 12. Legacy

| Elemento | Estado | Decisión |
|---|---|---|
| `Transactions` | ACTIVE LEGACY | Mantener hasta migrar planes/recurrencias a un modelo ledger o claramente no contable. |
| `DailyTransactions` | ACTIVE LEGACY | Debe migrarse/cortarse; hoy alimenta UI, analytics y jobs. |
| `WealthSnapshots` | ACTIVE LEGACY | Mantener temporalmente; reemplazar origen por snapshots derivados del ledger. |
| `CurrencyHistories.rate` DOUBLE | ACTIVE LEGACY | Mantener sólo como compatibilidad hasta aplicar 007 y cambiar consumidores a exacto. |
| `monthly_snapshots` | ACTIVE/HYBRID | Mantener; verificar que siempre sea por usuario y derivado de ledger. |
| `finanza.db`, `magnus_system.db` | KEEP TEMPORARILY | Necesarios para fallback SQLite/scripts históricos; no son fuente productiva PostgreSQL. |
| `auditor.db` | ACTIVE NON-FINANCIAL LEGACY | Mantener mientras Auditor siga usando SQLite. |
| `server/backup/corpses/*` | ARCHIVE | Fuera de runtime; separar del árbol desplegable para evitar ejecución accidental. |
| `aiController.js.bak` | REMOVED | Eliminación correcta; cero referencias. |

No existe evidencia para retirar todavía las tablas legacy monetarias.

## 13. Performance

Estado observado:

```text
magnus_os2_app: ~52 MiB / 2 GiB
magnus_postgres: ~24 MiB / 1 GiB
magnus_sandbox: ~6 MiB / 512 MiB
```

El uso actual es bajo y no existe presión operativa. La separación `vendor-charts` reduce `vendor-ui`, pero no reduce por sí misma los bytes agregados si ambas dependencias se cargan en la misma navegación. El build conserva warnings:

```text
vendor-ui: 587.55 kB / 159.76 kB gzip
vendor-charts: 438.54 kB / 115.74 kB gzip
App: 342.80 kB / 87.87 kB gzip
```

No hay evidencia reproducible de métricas browser antes/después, waterfall o first-load route que pruebe la afirmación “zero waterfall regressions”. La mejora se clasifica como organización de chunks, no como ganancia de carga demostrada.

## 14. Remaining risks

Orden recomendado de remediación:

1. Bloquear currency override en líneas de cuenta, exigir igualdad con `accounts.currency` y validar suma cero por moneda; diseñar explícitamente FX con líneas y `NUMERIC` exacto.
2. Definir cutover real de `DailyTransactions` y `Transactions`: backfill idempotente, equivalencia por ID, dual-write temporal o cierre de escrituras, y matriz de consumidores en cero legacy contable.
3. Ejecutar el runbook de producción autorizado: backup, baseline `000`, `007`, `008`, status, drift, reconciliación y despliegue de la imagen correspondiente.
4. Corregir el orden/rutas de health, dejar liveness público, readiness operativo y deep health admin-only.
5. Hacer persistente/distribuido el lock de jobs, recuperar rows `running` tras reinicio y programar retención.
6. Eliminar conversiones `Number` sin guarda en Wealth y otros consumidores exactos.
7. Actualizar dependencias runtime alcanzables en cambios controlados.
8. Añadir backup off-host/inmutable y practicar recuperación completa de aplicación, no sólo DB.

## 15. Recommended Phase III

No iniciar una Phase III funcional. El siguiente trabajo debe ser una remediación corta de cierre de Phase II con criterios de salida verificables:

- cero escrituras contables nuevas a `DailyTransactions`;
- cada módulo financiero marcado `LEDGER` o explícitamente `DISPLAY/PLAN ONLY`;
- cero referencias runtime de analytics/reportes a movimientos legacy;
- invariantes multimoneda a nivel API y PostgreSQL;
- producción en `000–008`, checksums válidos y drift cero;
- imagen desplegada desde un commit identificable;
- health público/privado probado a través de Express real;
- reconciliación legacy→ledger por usuario, moneda y período con diferencia cero;
- dependency audit con plan de upgrades y riesgos aceptados con fecha de expiración;
- restore end-to-end desde copia off-host.

## Puntuaciones

| Dimensión | Puntuación | Motivo resumido |
|---|---:|---|
| Architecture | 68/100 | Mejor separación, pero dos núcleos financieros activos. |
| Code | 72/100 | Backend exacto mejorado; frontend/ops aún contienen contratos débiles. |
| Financial Integrity | 55/100 | Datos actuales cuadrados, pero fuente fragmentada y hueco multimoneda. |
| Security | 73/100 | IDOR/WebSocket corregidos; health y dependencias conservan riesgo. |
| Database | 60/100 | Durabilidad y app role correctos; producción incompleta frente al schema candidato. |
| Testing | 84/100 | 121 tests reales en verde; faltan router, multimoneda y crash/multiproceso. |
| Recoverability | 76/100 | Restore real exitoso; falta copia off-host y recuperación completa. |
| Maintainability | 62/100 | Migraciones sólidas, pero legacy y componentes duplicados siguen activos. |
| Performance | 76/100 | Recursos bajos; chunks grandes y beneficio de splitting no demostrado. |
| Future Readiness | 60/100 | Buen cimiento ledger, aún sin cutover ni producción convergente. |

# MAGNUSOS2 PHASE II HEALTH SCORE: 69/100

# PHASE II REQUIRES REMEDIATION
