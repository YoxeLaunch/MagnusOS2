# MAGNUSOS2 — MANUAL DE PUESTA EN PRODUCCIÓN (PHASE II FINAL RUNBOOK)

**Versión:** 2.0.0-final  
**Fecha:** 2026-10-04  
**Rama:** `phase2/final-remediation`  
**Estado:** PENDIENTE DE RE-AUDITORÍA POR CODEX

---

## 1. PRINCIPIOS Y RESTRICCIONES CRÍTICAS

> [!IMPORTANT]
> - **NO APLICAR MIGRACIONES NI ESCRITURAS SOBRE PRODUCCIÓN DURANTE LA AUDITORÍA.**  
> - Todas las inspecciones actuales sobre el contenedor `magnus_postgres` (puerto 5432) deben ser estrictamente **READ-ONLY**.  
> - Nunca invocar `sequelize.sync()` sobre bases PostgreSQL.  
> - El auditor independiente Codex es la única autoridad con potestad para declarar `PHASE II APPROVED`.

---

## 2. REQUISITOS PREVIOS (PRE-FLIGHT CHECKS)

Antes de iniciar la ventana de liberación:

1. **Verificar estado de los contenedores Docker:**
   ```bash
   docker ps --filter "name=magnus_postgres"
   ```
2. **Ejecutar simulacro de restauración de respaldo (Restore Drill):**
   ```bash
   npm run db:restore:drill
   ```
   *Criterio de éxito:* Mensaje `Restore Drill Verified Cleanly` con reconciliación en estado `HEALTHY`.
3. **Verificar que la suite completa pase al 100%:**
   ```bash
   npm test
   npm run test:postgres
   ```
4. **Verificar compilación limpia de la interfaz:**
   ```bash
   npm run build
   ```

---

## 3. PROCEDIMIENTO DE DESPLIEGUE PASO A PASO

### Paso 1: Respaldo Preventivo Inmediato

Generar un dump completo previo a cualquier cambio en producción **en el host**, fuera del volumen de datos de PostgreSQL:

```bash
install -d -m 700 /home/osvaldo/backups/magnus-os2/phase2-final
docker exec magnus_postgres pg_dump -U magnus -d magnus -F c -b -v \
  > /home/osvaldo/backups/magnus-os2/phase2-final/pre_phase2_final.dump
docker cp /home/osvaldo/backups/magnus-os2/phase2-final/pre_phase2_final.dump magnus_postgres:/tmp/pre_phase2_final.dump
docker exec magnus_postgres pg_restore -l /tmp/pre_phase2_final.dump >/dev/null
```

### Paso 2: Baseline explícito y aplicación de migraciones (007 a 010)

Ejecutar el runner formal de migraciones (adquiere lock consultivo distribuido `pg_advisory_xact_lock`):

La producción histórica ya contiene el schema anterior y registra 001–006. Por ello, **no** se ejecuta `db:migrate` hasta registrar explícitamente el baseline 000. Primero revisar que el único pendiente anterior sea 000 y que 001–006 tengan checksums válidos:

```bash
docker compose run --rm --no-deps magnus node scripts/migrate.js status
docker compose run --rm --no-deps magnus node scripts/migrate.js baseline 000_base_schema.sql --confirm-baseline
docker compose run --rm --no-deps magnus node scripts/migrate.js status
docker compose run --rm --no-deps magnus node scripts/migrate.js up
```

Si el primer `status` no coincide con esa condición, detener la ventana: no registrar un baseline ni aplicar DDL por intuición.

Las siguientes migraciones se aplican de forma transaccional e idempotente:
- `007_exact_money_integrity.sql`: Integridad numérica en columnas `*_minor` y triggers de sincronización.
- `008_job_observability.sql`: Creación de la tabla `public.job_executions` e índices.
- `009_multicurrency_ledger_invariants.sql`: Triggers de rechazo de transacciones multimoneda y validación estricta de cuentas.
- `010_operational_hardening_leases_and_mappings.sql`: Tablas `legacy_daily_transaction_mappings` y `job_leases`.

Verificar que no existan discrepancias ni drift:
```bash
docker compose run --rm --no-deps magnus node scripts/schema-drift.js
```

### Paso 3: Cutover y Backfill de DailyTransactions a Ledger

1. **Ejecución en modo simulación (Dry-Run):**
   ```bash
   docker compose run --rm --no-deps magnus node scripts/cutover-daily-transactions.js --dry-run
   ```
   Revisar el inventario de filas a migrar y transacciones omitidas (monto 0).

2. **Ejecución real de Cutover:**
   ```bash
   docker compose run --rm --no-deps \
     -e CUTOVER_PRODUCTION_CONFIRM=I_UNDERSTAND_THE_FINANCIAL_RISK \
     magnus node scripts/cutover-daily-transactions.js --allow-production
   ```
   *Garantía:* sin cuenta inequívoca o mapa revisado (`--account-map=/ruta/mapa.json`), el proceso aborta sin crear cuentas ni inventar asignaciones.

### Paso 4: Reconciliación Contable Inmediata

Verificar que todos los balances derivados coincidan exactamente con la suma contable del Ledger:

```bash
docker compose run --rm --no-deps magnus node scripts/reconcile-ledger.js
```
*Criterio de aprobación:* `status: "HEALTHY"`, `discrepanciesCount: 0`, `securityViolationsCount: 0`.

### Paso 5: Reconstrucción y Liberación de Imágenes de Contenedor

Reconstruir la imagen de aplicación con el código remediado:

```bash
docker compose build magnus
docker compose up -d --no-deps magnus
```

### Paso 6: Verificación de Probes de Salud en Vivo

Validar que los endpoints operativos desacoplados respondan correctamente:

1. **Liveness Probe (público):**
   ```bash
   curl -i http://127.0.0.1:4000/health/live
   # HTTP/1.1 200 OK -> { "status": "UP", "version": "2.0.0" }
   ```

2. **Readiness Probe (público, verifica DB, migraciones y drift):**
   ```bash
   curl -i http://127.0.0.1:4000/health/ready
   # HTTP/1.1 200 OK -> { "status": "READY", "checks": { "database": true, "migrations": true, "schemaDrift": true } }
   ```

3. **Deep Health Probe (protegido con token admin / soberano):**
   ```bash
   curl -i -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" http://127.0.0.1:4000/health/deep
   # HTTP/1.1 200 OK -> Telemetría completa sanitizada sin credenciales
   ```

---

## 4. PROCEDIMIENTO DE ROLLBACK DE EMERGENCIA

Si se detecta cualquier falla o regresión crítica durante la ventana:

1. **Detener la aplicación:**
   ```bash
   docker stop magnus_os2_app
   ```
2. **Restaurar la base de datos desde el dump preventivo:**
   ```bash
   docker exec -t magnus_postgres dropdb -U magnus magnus
   docker exec -t magnus_postgres createdb -U magnus magnus
   docker cp /home/osvaldo/backups/magnus-os2/phase2-final/pre_phase2_final.dump magnus_postgres:/tmp/pre_phase2_final.dump
   docker exec -t magnus_postgres pg_restore -U magnus -d magnus -v /tmp/pre_phase2_final.dump
   ```
3. **Reiniciar con la imagen anterior:**
   ```bash
   docker start magnus_os2_app
   ```
4. **Verificar integridad contable:**
   ```bash
   docker compose run --rm --no-deps magnus node scripts/reconcile-ledger.js
   ```
