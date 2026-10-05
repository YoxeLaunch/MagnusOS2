# MAGNUSOS2 — PHASE II-C REPORT
## Exact Money + Schema Governance + Migration-First Database

**Fecha:** 2026-10-04  
**Rama activa:** `phase2/ii-c`  
**Base commit autorizada:** `4775374` (`fix(finance): finalize isolated Phase II-B remediation` en `phase2/ii-b-final`)  
**Estado:** COMPLETADO — DETENIDO SEGÚN REGLA DE PRODUCCIÓN

---

## 1. Resumen Ejecutivo y Metadatos de la Fase

| Parámetro | Detalle |
|---|---|
| **Rama de Trabajo** | `phase2/ii-c` (creada limpiamente desde `4775374`) |
| **Commit Base Autorizado** | `4775374` |
| **Commit Prematuro No Autorizado** | `241ea31` (solo referenciado para contraste y auditoría) |
| **Objetivo Principal** | Eliminar riesgo de almacenamiento `DOUBLE PRECISION` en moneda; reemplazar `sequelize.sync()` por migraciones versionadas y gobernanza estricta del schema |
| **Pruebas Unitarias** | 51 / 51 tests pasando (`npm test`) |
| **Pruebas de Integración PostgreSQL** | 51 / 51 tests pasando en 13 suites (`npm run test:postgres`) |
| **Compilación Frontend / Vite** | Exitosa sin errores (`npm run build`) |
| **Mutaciones en Producción** | **0 (CERO mutaciones no autorizadas)** |

---

## 2. Diferencias Frente al Commit No Autorizado `241ea31`

El commit `241ea31` (rama `phase2/ledger-unification`) correspondió a una ejecución prematura sin el aislamiento de Phase II-B. Para Phase II-C se reinició estrictamente desde `4775374` y se auditaron todas las diferencias:

| Aspecto | Commit Prematuro `241ea31` | Rama Limpia `phase2/ii-c` (Auditoría Actual) |
|---|---|---|
| **Punto de partida** | Historial mezclado con cambios de ledger sin aprobar | Rama limpia `phase2/ii-c` partiendo directamente de `4775374` |
| **Migración Base (000)** | Inexistente o incompleta (dependiente de `sync()` previo) | `000_base_schema.sql` canónico e idempotente para las 35 tablas y tipos ENUM |
| **Bootstrap Fresh DB** | No comprobado desde base de datos PostgreSQL vacía | Totalmente validado: bootstrap desde cero en `magnus_fresh_test` con 100% de tablas y triggers |
| **Gobernanza de Sequelize** | Uso híbrido con riesgo de `sync()` en entornos compartidos | `server/models/index.js` y `server/models/system/index.js` prohíben `sync()` en producción, gobernando exclusivamente mediante `MigrationRunner` |
| **Checksums de Producción** | No verificados con la base de datos viva | Se constató coincidencia byte-a-byte de los SHA-256 de 001–006 contra la tabla productiva `schema_migrations` |
| **Resiliencia en Tests Externos** | Fallaba si cotizaciones externas o SQLite diferían | Corregido fallback de energía/mercados y alineada la tabla SQLite `monthly_snapshots` |

---

## 3. Elementos Reutilizados de `241ea31` y su Justificación Técnica

Cada archivo reutilizado fue auditado minuciosamente contra el esquema real:

1. **`server/migrations/005_exact_money_legacy_backfill.sql`**
   - *Justificación:* Añade `amount_minor` a `DailyTransactions` (backfill `ROUND(amount * 100)`), `net_worth_minor`, `assets_minor`, `liabilities_minor` a `wealth_snapshots`, y `rate_exact` a `currency_history`.
   - *Auditoría:* Su contenido produce el SHA-256 exacto (`956914040d18dc4e60862daa7dd8d56cd4193e3ba6633b6ba9a5eab88bc5daf3`) ya registrado en la base productiva `schema_migrations`.
2. **`server/migrations/002` y `003`**
   - *Justificación:* Incorporan guardas `IF to_regclass(...) IS NOT NULL` requeridas para idempotencia y compatibilidad tanto en bases vacías como existentes.
   - *Auditoría:* Sus SHA-256 (`dcd1d0b3b8da2ad1fc2ee1fb8955cf42c5db89627ed90ecee41c6e56b0ee6fc6` y `db9a688998670aa58d7e5af004565d775f59f7959e1b24c38387ecc5bc21fc2f`) coinciden con el registro de producción.
3. **`server/services/migrationRunner.js` & `server/services/schemaDriftService.js`**
   - *Justificación:* Implementación de runner con bloqueo consultivo PostgreSQL (`pg_advisory_xact_lock(987654321)`), transacciones atómicas por migración, y servicio de detección de drift entre Sequelize y PostgreSQL `information_schema`.
   - *Auditoría:* Se añadió calificación explícita de esquema `public.schema_migrations` para prevenir fallos por manipulación de `search_path`.

---

## 4. Inventario Monetario y Política de Almacenamiento

Se generó [`docs/MONEY_STORAGE_MAP.md`](file:///home/osvaldo/proyectos/sistema-m/Magnus-OS2/docs/MONEY_STORAGE_MAP.md) clasificando más de 25 campos financieros:

- **Política Canónica:**
  - Todo dinero transaccional debe almacenarse en unidades menores como `BIGINT` (`amount_minor` en centavos).
  - Tasas de cambio (FX) y tipos de interés deben almacenarse como `NUMERIC(12, 6)` (`rate_exact`).
  - Prohibido el uso de `FLOAT` o `DOUBLE PRECISION` para cálculos de saldo o asientos contables.
- **Sincronización Bidireccional Transitoria:**
  - En [`server/models/transaction.js`](file:///home/osvaldo/proyectos/sistema-m/Magnus-OS2/server/models/transaction.js), hook `beforeSave` sincroniza `amount` ↔ `amount_minor`.
  - En [`server/models/wealthSnapshot.js`](file:///home/osvaldo/proyectos/sistema-m/Magnus-OS2/server/models/wealthSnapshot.js), hook `beforeSave` sincroniza `netWorth` ↔ `netWorthMinor`, `assets` ↔ `assetsMinor`, `liabilities` ↔ `liabilitiesMinor`.
  - En [`server/models/currency.js`](file:///home/osvaldo/proyectos/sistema-m/Magnus-OS2/server/models/currency.js), hook `beforeSave` sincroniza `rate` ↔ `rateExact`.

---

## 5. Pruebas de Gobernanza de Base de Datos

### A. Prueba desde Fresh PostgreSQL Database (`magnus_fresh_test`)
- **Procedimiento:** La base de datos `magnus_fresh_test` es creada completamente vacía sin ninguna tabla previa.
- **Ejecución:** Se ejecuta `MigrationRunner.up()` directamente contra la base virgen.
- **Resultado:**
  - Aplica en orden estricto: `000_base_schema.sql`, `001_ledger_balance_constraint_trigger.sql`, `002_cleanup_duplicate_telegram_indexes.sql`, `003_monthly_snapshots_user_id.sql`, `004_fix_pilot_investment_semantics.sql`, `005_exact_money_legacy_backfill.sql`, y `006_financial_invariants.sql`.
  - Creación de 35 tablas, 8 ENUMs, triggers de partida doble contable y columnas de moneda exacta.
  - Cero dependencias de `sequelize.sync()`.

### B. Prueba desde Snapshot Anterior (`magnus_test`)
- **Procedimiento:** Base con esquema preexistente y migraciones ya aplicadas.
- **Ejecución:** Ejecución de `MigrationRunner.up()` y `SchemaDriftService.checkDrift()`.
- **Resultado:**
  - Idempotencia total: `appliedCount: 0`, no re-ejecuta migraciones ya aplicadas.
  - Validación de Checksums: Todos los archivos en disco concuerdan con los hashes guardados (`VALID`).
  - Detección de Drift: Cero discrepancias en columnas requeridas para los modelos auditados.

---

## 6. Estado de Migraciones (001–006) y Nuevas Pendientes

### Estado en Producción (`magnus_postgres:5432/magnus`):
| ID | Nombre | Estado en Producción | Checksum SHA-256 |
|---|---|---|---|
| 1 | `001_ledger_balance_constraint_trigger.sql` | **APLICADA** | `1c34554627232fca1686dfc80565b64fff7ef5489bd271b6b63c2fc709898190` |
| 2 | `002_cleanup_duplicate_telegram_indexes.sql` | **APLICADA** | `dcd1d0b3b8da2ad1fc2ee1fb8955cf42c5db89627ed90ecee41c6e56b0ee6fc6` |
| 3 | `003_monthly_snapshots_user_id.sql` | **APLICADA** | `db9a688998670aa58d7e5af004565d775f59f7959e1b24c38387ecc5bc21fc2f` |
| 4 | `004_fix_pilot_investment_semantics.sql` | **APLICADA** | `364c7998dad9db4eae0dc42e0c820d2739c13100698d4eae0b3b4d181dd620e7` |
| 5 | `005_exact_money_legacy_backfill.sql` | **APLICADA** | `956914040d18dc4e60862daa7dd8d56cd4193e3ba6633b6ba9a5eab88bc5daf3` |
| 6 | `006_financial_invariants.sql` | **APLICADA** | `70fb2075596ee8a18a82d091fa2908a83a693ac8bfa56a8454e286079a5ac9fb` |

### Migraciones Nuevas Pendientes de Autorización para Producción:
- **`000_base_schema.sql`**: Diseñada para bootstrap fresh. En producción actual, el esquema base fue generado originalmente por sync y contiene todas las tablas. Si se desea formalizar en `schema_migrations` de producción, se debe registrar como baseline o ejecutar con autorización expresa.
- **Pendientes para Producción:** `000` (ninguna otra migración nueva pendiente).

---

## 7. Plan de Producción Fase 8 (Dry Run, Plan y Rollback)

En estricto cumplimiento con la instrucción de seguridad:
- **Estado de Producción:** Se verificó mediante consulta directa a `magnus_postgres` que la base de datos `magnus` mantiene intactas sus 6 migraciones históricas.
- **Cero Mutaciones:** No se ejecutó ninguna sentencia DDL, ni `up`, ni `sync` en la base de datos productiva.
- **Procedimiento Preparado para cuando sea autorizado:**
  1. **Backup Previo:**
     ```bash
     docker exec magnus_postgres pg_dump -U magnus_app -d magnus --format=custom -f /tmp/magnus_prod_backup_pre_ii_c.dump
     ```
  2. **Verificación Dry Run / Status:**
     ```bash
     npm run db:status
     ```
  3. **Rollback Operativo No Destructivo:** En caso de discrepancia, las columnas agregadas (`amount_minor`, `rate_exact`) son aditivas y conviven de forma segura con las columnas legacy sin romper el frontend ni la API.

---

## 8. Confirmación de Cero Mutaciones Productivas No Autorizadas

> **DECLARACIÓN DE INTEGRIDAD:**  
> Se confirma de manera formal que durante la totalidad de la ejecución de Phase II-C:
> 1. No se ha ejecutado ninguna mutación ni migración sobre la base de datos de producción (`magnus_postgres:5432/magnus`).
> 2. No se ha modificado la tabla productiva `schema_migrations`.
> 3. No se ha desplegado a producción.
> 4. La ejecución se DETIENE de inmediato tras la entrega de este reporte.

---

*Fin del Reporte Phase II-C.*
