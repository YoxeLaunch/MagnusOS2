# Magnus-OS2 - Requirements & Specifications

<!-- 
=====================================================
PEGA TU CONTENIDO AQUÍ DEBAJO DE ESTA LÍNEA
=====================================================
-->

# MAGNUS / Sistema-M — Walkthrough de Mejoras (Finanzas) para Server Doméstico
**Target:** Ubuntu Server 24.04 LTS + Docker + Portainer | PC 8GB RAM  
**Objetivo:** Subir el módulo de finanzas a un modelo consistente (Cuentas + Ledger + Transferencias + Ahorros) y preparar el sistema para escalar (PostgreSQL, validación, importación, backups).

---

## 0) Principios (decisiones de diseño)
1. **Modelo financiero correcto antes que nuevos gráficos.**
2. **Una sola fuente de verdad:** el *Ledger* (transacciones con líneas).
3. **Ahorro e inversión no son “gasto”**: son **movimientos** hacia cuentas/activos.
4. **Despliegue casero estable:** pocos contenedores, límites de recursos, backups automáticos.

---

## 1) Estado actual (resumen)
- Frontend React (Vite/TS), Backend Node/Express, DB SQLite (Sequelize).
- Finanzas tiene: Flujo, Patrimonio, Inversiones, Seguimiento Diario, Proyecciones.
- Modelo actual: `Transaction` + `DailyTransaction` + tasas (rates).

**Problemas clave a resolver**
- Falta concepto de **Cuentas**.
- Falta concepto de **Transferencias**.
- “Ahorro” no existe como **meta/bucket**.
- Doble modelo “planificado vs real” sin conciliación formal.
- SQLite limita crecimiento/reporting.

---

## 2) Norte funcional: “Cuentas + Ledger + Metas de Ahorro”
### 2.1 Qué se implementa
- **Accounts (Cuentas)**: dónde vive el dinero.
- **Ledger (TransactionHeader + TransactionLines)**: transacciones con 2+ líneas (splits).
- **Transfers**: movimiento entre cuentas (sin contaminar gastos).
- **Savings Goals**: metas de ahorro con progreso y aportes.
- **Reconciliación**: estados pending/cleared/reconciled.
- **Import CSV + reglas**: para automatizar captura.

### 2.2 Resultado esperado
- Cashflow real (ingresos – gastos), y aparte movimientos a ahorro/inversión.
- Net worth real: suma de balances por cuenta/activo.
- Ahorros medibles: metas + tasa de ahorro mensual.

---

## 3) Arquitectura recomendada en Docker/Portainer (mínima y robusta)
### 3.1 Contenedores
1. `magnus-api` (Express)
2. `magnus-web` (React build servido con Nginx)
3. `postgres` (DB)
4. **Opcional:** `redis` (jobs/cache)
5. `reverse-proxy` (Nginx Proxy Manager o Traefik)

### 3.2 Reglas
- Exponer al exterior solo el reverse-proxy.
- `postgres` y servicios internos en red privada Docker.
- Backups diarios (pg_dump) a volumen dedicado.

---

## 4) Stack Docker Compose (Portainer Stack) — Plantilla base
> Ajusta rutas/puertos según tu entorno. Mantén esto como base.

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: magnus_postgres
    environment:
      POSTGRES_DB: magnus
      POSTGRES_USER: magnus
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - magnus_pgdata:/var/lib/postgresql/data
      - magnus_backups:/backups
    networks:
      - magnus_internal
    restart: unless-stopped

  magnus-api:
    image: magnus-api:latest
    container_name: magnus_api
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://magnus:${POSTGRES_PASSWORD}@postgres:5432/magnus
      # JWT_SECRET, CORS_ORIGIN, etc.
    depends_on:
      - postgres
    networks:
      - magnus_internal
      - magnus_edge
    restart: unless-stopped

  magnus-web:
    image: magnus-web:latest
    container_name: magnus_web
    depends_on:
      - magnus-api
    networks:
      - magnus_edge
    restart: unless-stopped

  # Opcional: si implementas jobs/cache
  # redis:
  #   image: redis:7-alpine
  #   container_name: magnus_redis
  #   networks:
  #     - magnus_internal
  #   restart: unless-stopped

networks:
  magnus_internal:
    driver: bridge
    internal: true
  magnus_edge:
    driver: bridge

volumes:
  magnus_pgdata:
  magnus_backups:

````md
# MAGNUS / Sistema-M — Walkthrough de Mejoras (Finanzas) para Server Doméstico
**Target:** Ubuntu Server 24.04 LTS + Docker + Portainer | PC 8GB RAM  
**Objetivo:** Subir el módulo de finanzas a un modelo consistente (Cuentas + Ledger + Transferencias + Ahorros) y preparar el sistema para escalar (PostgreSQL, validación, importación, backups).

---

## 0) Principios (decisiones de diseño)
1. **Modelo financiero correcto antes que nuevos gráficos.**
2. **Una sola fuente de verdad:** el *Ledger* (transacciones con líneas).
3. **Ahorro e inversión no son “gasto”**: son **movimientos** hacia cuentas/activos.
4. **Despliegue casero estable:** pocos contenedores, límites de recursos, backups automáticos.

---

## 1) Estado actual (resumen)
- Frontend React (Vite/TS), Backend Node/Express, DB SQLite (Sequelize).
- Finanzas tiene: Flujo, Patrimonio, Inversiones, Seguimiento Diario, Proyecciones.
- Modelo actual: `Transaction` + `DailyTransaction` + tasas (rates).

**Problemas clave a resolver**
- Falta concepto de **Cuentas**.
- Falta concepto de **Transferencias**.
- “Ahorro” no existe como **meta/bucket**.
- Doble modelo “planificado vs real” sin conciliación formal.
- SQLite limita crecimiento/reporting.

---

## 2) Norte funcional: “Cuentas + Ledger + Metas de Ahorro”
### 2.1 Qué se implementa
- **Accounts (Cuentas)**: dónde vive el dinero.
- **Ledger (TransactionHeader + TransactionLines)**: transacciones con 2+ líneas (splits).
- **Transfers**: movimiento entre cuentas (sin contaminar gastos).
- **Savings Goals**: metas de ahorro con progreso y aportes.
- **Reconciliación**: estados pending/cleared/reconciled.
- **Import CSV + reglas**: para automatizar captura.

### 2.2 Resultado esperado
- Cashflow real (ingresos – gastos), y aparte movimientos a ahorro/inversión.
- Net worth real: suma de balances por cuenta/activo.
- Ahorros medibles: metas + tasa de ahorro mensual.

---

## 3) Arquitectura recomendada en Docker/Portainer (mínima y robusta)
### 3.1 Contenedores
1. `magnus-api` (Express)
2. `magnus-web` (React build servido con Nginx)
3. `postgres` (DB)
4. **Opcional:** `redis` (jobs/cache)
5. `reverse-proxy` (Nginx Proxy Manager o Traefik)

### 3.2 Reglas
- Exponer al exterior solo el reverse-proxy.
- `postgres` y servicios internos en red privada Docker.
- Backups diarios (pg_dump) a volumen dedicado.

---

## 4) Stack Docker Compose (Portainer Stack) — Plantilla base
> Ajusta rutas/puertos según tu entorno. Mantén esto como base.

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: magnus_postgres
    environment:
      POSTGRES_DB: magnus
      POSTGRES_USER: magnus
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - magnus_pgdata:/var/lib/postgresql/data
      - magnus_backups:/backups
    networks:
      - magnus_internal
    restart: unless-stopped

  magnus-api:
    image: magnus-api:latest
    container_name: magnus_api
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://magnus:${POSTGRES_PASSWORD}@postgres:5432/magnus
      # JWT_SECRET, CORS_ORIGIN, etc.
    depends_on:
      - postgres
    networks:
      - magnus_internal
      - magnus_edge
    restart: unless-stopped

  magnus-web:
    image: magnus-web:latest
    container_name: magnus_web
    depends_on:
      - magnus-api
    networks:
      - magnus_edge
    restart: unless-stopped

  # Opcional: si implementas jobs/cache
  # redis:
  #   image: redis:7-alpine
  #   container_name: magnus_redis
  #   networks:
  #     - magnus_internal
  #   restart: unless-stopped

networks:
  magnus_internal:
    driver: bridge
    internal: true
  magnus_edge:
    driver: bridge

volumes:
  magnus_pgdata:
  magnus_backups:
````

---

## 5) Modelo de datos (PostgreSQL) — Esquema propuesto (Finanzas)

> Esto es el core que habilita todo lo demás.

### 5.1 Tablas principales

#### users (si aplica)

* `users(id, email, password_hash, created_at, ...)`

#### accounts

* `accounts(id, user_id, name, type, currency, institution, opening_balance_minor, is_archived, created_at)`
* `type`: `cash | checking | savings | credit_card | investment | loan`
* `opening_balance_minor`: monto en centavos (o minor units)

#### categories

* `categories(id, user_id, name, group, type, is_archived)`
* `type`: `income | expense | transfer | investment | savings` *(opcional, o solo income/expense y tratar transfer por cuenta)*

#### payees

* `payees(id, user_id, name, normalized_name)`

#### transactions (header)

* `transactions(id, user_id, date, payee_id, memo, status, created_at)`
* `status`: `pending | cleared | reconciled`

#### transaction_lines (splits)

* `transaction_lines(id, transaction_id, account_id, category_id, amount_minor, currency, fx_rate_id NULL)`
* Regla: **la suma de líneas por transacción debe ser 0** (o balanceada por FX).

#### savings_goals

* `savings_goals(id, user_id, name, target_amount_minor, target_date, linked_account_id NULL, is_active, created_at)`

#### savings_contributions (opcional)

* `savings_contributions(id, goal_id, transaction_id, amount_minor, created_at)`
* (Se puede inferir desde el ledger si “linked_account_id” está definido)

#### recurring_templates (planificado)

* `recurring_templates(id, user_id, name, rrule, next_run_date, is_active, created_at)`
* `recurring_template_lines(id, template_id, account_id, category_id, amount_minor, currency)`
* Generan `transactions` reales en cada ejecución.

#### import_batches + import_items

* `import_batches(id, user_id, source, created_at, status)`
* `import_items(id, batch_id, raw_hash, date, payee_raw, amount_minor, currency, matched_transaction_id NULL)`
* `raw_hash`: dedupe para no duplicar importaciones.

#### rules (autocategorización)

* `rules(id, user_id, name, match_type, match_value, category_id, payee_id NULL, is_active)`
* match_type: `contains | regex | amount_range | starts_with`

---

## 6) Migración desde el modelo actual (SQLite) sin perder datos

### 6.1 Estrategia

1. Congelar escritura (modo mantenimiento).
2. Exportar SQLite (tablas actuales).
3. Crear Postgres + aplicar migraciones.
4. Importar datos transformando al nuevo ledger.

### 6.2 Mapeo recomendado

* `DailyTransaction` → `transactions + transaction_lines`

  * Si era **income**:

    * Línea A: cuenta “Checking” +amount
    * Línea B: categoría “Income” -amount *(o a un account “Income:Salary” si usas cuentas contables)*
  * Si era **expense**:

    * Línea A: cuenta “Checking” -amount
    * Línea B: categoría “Expense:Food” +amount
  * Si era **investment** (antes):

    * Convertir a **transfer** hacia cuenta `investment`
    * Línea A: checking -amount
    * Línea B: investment +amount

> Nota: Esto corrige el error conceptual de tratar inversión como gasto.

### 6.3 Datos que debes crear antes de importar

* Accounts base: `Cash`, `Checking`, `Savings`, `Investment`.
* Categories mínimas: `Income`, `Expense` (y subcategorías).
* Payees: generados desde description.

---

## 7) API (Backend) — Endpoints nuevos y ajustes

### 7.1 Endpoints core

* `GET /api/finanza/accounts`

* `POST /api/finanza/accounts`

* `PATCH /api/finanza/accounts/:id`

* `GET /api/finanza/ledger?from=YYYY-MM-DD&to=YYYY-MM-DD`

* `POST /api/finanza/transactions` *(crea header + lines)*

* `PATCH /api/finanza/transactions/:id` *(status/memo/payee)*

* `POST /api/finanza/transfers` *(helper: crea transacción balanceada entre 2 accounts)*

* `GET /api/finanza/savings-goals`

* `POST /api/finanza/savings-goals`

* `GET /api/finanza/savings-goals/:id/progress`

* `POST /api/finanza/import/csv` *(sube CSV → batch → previsualización)*

* `POST /api/finanza/import/commit` *(aplica import con dedupe y reglas)*

### 7.2 Validación y contratos

* Validar con schema (ej. Zod) en cada endpoint.
* Rechazar transacciones desbalanceadas (sum(lines) != 0).
* Idempotencia:

  * `Idempotency-Key` header para import y creaciones críticas.

---

## 8) Frontend (UI) — Cambios mínimos para máximo impacto

### 8.1 Pantallas nuevas/revisadas

1. **Cuentas (Accounts)**

   * Lista de cuentas con balance actual.
   * Crear/editar cuenta.

2. **Ledger / Transacciones**

   * Vista tipo “registro contable” con filtros (fecha, cuenta, categoría, payee, status).
   * Modal de transacción con múltiples líneas (splits).

3. **Transferencias**

   * Form simple: From account → To account → amount → fecha → memo.

4. **Ahorros**

   * Metas (Goals) con:

     * target, fecha, progreso, aporte recomendado, tendencia.
   * KPI: Savings rate mensual.

5. **Conciliación**

   * Toggle para marcar `cleared/reconciled`.
   * Filtro de pendientes.

### 8.2 Reportes que se vuelven “correctos”

* Cashflow: ingresos – gastos (sin contaminar transferencias).
* Net worth: suma de balances por cuenta.
* Budget vs Actual: basado en el ledger.

---

## 9) Jobs / Automatización (ligero, ideal para 8GB)

### 9.1 Jobs recomendados

* `nightly_aggregates`: recalcula agregados mensuales (cache).
* `recurring_runner`: genera instancias desde recurring_templates.
* `backup_pg_dump`: backup diario.

### 9.2 Agregados sugeridos (tabla cache)

* `monthly_summary(user_id, month, income_minor, expense_minor, savings_minor, invest_minor, net_cashflow_minor, savings_rate)`
* Recalcular 1 vez al día o bajo demanda.

---

## 10) Backups (obligatorio)

### 10.1 Política mínima

* Backup diario: `pg_dump` a `/backups`
* Retención: 14 días
* Validación: restaurar 1 backup al mes en una DB temporal (prueba).

### 10.2 Comando pg_dump (ejemplo)

```bash
docker exec -t magnus_postgres pg_dump -U magnus magnus > /ruta/host/backups/magnus_$(date +%F).sql
```

---

## 11) Seguridad doméstica (sin complicarte)

* Reverse proxy con HTTPS (si tienes dominio) o solo LAN si prefieres.
* Secrets en `.env` fuera del repo.
* No exponer Postgres al exterior.
* CORS restringido al dominio/host del frontend.
* Rate limiting ya existe: mantenerlo y ajustar límites para finanzas.

---

## 12) Plan de ejecución por fases (Backlog ejecutable)

### Fase P0 — Base operativa (1 sprint)

* [ ] Crear stack Portainer (Postgres + API + Web).
* [ ] Volúmenes, redes, `.env` con secretos.
* [ ] Script backup diario (cron en host o contenedor job).
* [ ] Healthchecks.

**Salida P0:** sistema estable desplegado, DB lista, backups funcionando.

### Fase P1 — Core financiero correcto (2–3 sprints)

* [ ] Implementar `accounts`, `transactions`, `transaction_lines`.
* [ ] Endpoint `POST /transactions` con validación de balance.
* [ ] UI ledger (lista + filtros) + modal con splits.
* [ ] Implementar `transfers` (helper).
* [ ] Estados `pending/cleared/reconciled`.

**Salida P1:** ya puedes operar ingresos/gastos/transferencias correctamente.

### Fase P2 — Ahorros y control (1–2 sprints)

* [ ] `savings_goals` + vista de metas.
* [ ] KPI: savings rate mensual.
* [ ] Aportes recurrentes (rule simple o recurring_templates).

**Salida P2:** ahorro medible y automatizable.

### Fase P3 — Importación + reglas (1–2 sprints)

* [ ] Import CSV (preview + commit).
* [ ] Dedupe por hash.
* [ ] Rules engine para autocategorizar/payees.
* [ ] Conciliación mejorada por lotes.

**Salida P3:** captura rápida, menos trabajo manual.

### Fase P4 — Migración de datos (si ya estabas en producción con SQLite)

* [ ] Export SQLite.
* [ ] Transform + import a Postgres ledger.
* [ ] Validación de balances y totales.

**Salida P4:** sistema “definitivo” sobre Postgres.

---

## 13) Criterios de aceptación (para validar que quedó bien)

* [ ] Una transferencia Checking→Savings **no aparece** como gasto.
* [ ] Cashflow mensual refleja solo ingresos/gastos reales.
* [ ] Net worth = suma de balances por cuenta (incluye inversión/ahorro).
* [ ] Todas las transacciones están balanceadas (sum(lines)=0).
* [ ] Puedes crear una meta de ahorro y ver progreso + aporte mensual sugerido.
* [ ] Import CSV no duplica movimientos al reimportar el mismo archivo.
* [ ] Backup diario existe y es restaurable.

---

## 14) Recomendación final (lo mínimo que NO debes saltarte)

1. **Accounts + Ledger + Transfers**
2. **Savings Goals + Savings Rate**
3. **PostgreSQL + backups + migraciones**

Con esto, todo lo demás (gráficos, proyecciones, Monte Carlo, etc.) se vuelve más confiable y fácil de mantener.

---

Fin del documento.

```

