
# MAGNUS CAPITAL — Guía de Implementación (Ubuntu Server 24.04 LTS + Portainer + Docker)
Versión: 1.0  
Objetivo: Convertir el diseño técnico e investigación en un plan ejecutable y trazable, incluyendo **arquitectura**, **stack Docker**, **estructura de repositorio**, **migraciones**, **migración de datos**, y **operación**.

---

## 0) Alcance y principios (para evitar desorden técnico)

### Alcance inicial (P0)
- Web app (responsive) con **Backend + Frontend**.
- Backend con **PostgreSQL** como fuente de verdad.
- **Ledger de doble entrada** como núcleo (no “ingresos/gastos sueltos”).
- Docker + Portainer como orquestación operacional.
- Python para analítica: **opcional** (P1/P2), encapsulado como contenedor/worker.

### Principios no negociables
1. **El ledger manda**: toda cifra visible en UI debe poder reconstruirse desde el libro.
2. **Transacciones atómicas**: una operación financiera se guarda completa o no se guarda.
3. **Migraciones versionadas**: nada de “cambios manuales” en producción.
4. **Idempotencia**: importaciones y jobs deben poder re-ejecutarse sin duplicar.
5. **Observabilidad mínima**: healthchecks, logs, backups desde el día 1.

---

## 1) Roadmap por fases (P0 → P2)

### P0 — Infra + Core contable (Meta: sistema usable con registro manual)
**Entregables**
- Stack Portainer levantado: `postgres`, `redis`, `api`, `web` (y `worker` desactivado o vacío).
- Esquema DB “ledger” con integridad (doble entrada).
- Endpoints API mínimos para crear y consultar transacciones.
- UI mínima:
  - Registrar transacción doble entrada (modo “contable”).
  - Registrar “Seguimiento Diario” (modo “simple”) pero guardando en ledger.

**Definición de listo**
- Puedes registrar 20 transacciones, auditar que el libro cuadra, y recalcular balances por fecha.

### P1 — Ingesta + Reglas + Reportes (Meta: importaciones confiables)
- Importación CSV/Excel (bancos o registros históricos).
- Motor de reglas (categorización) configurable (JSON Logic o reglas propias).
- Dashboards: flujo de caja, presupuesto vs real, inversión vs gasto, KPIs básicos.

### P2 — Analítica (Meta: predicción y anomalías sin comprometer el core)
- Worker Python para forecasting, anomalías, métricas derivadas.
- Eventos con Redis Streams (o cola equivalente) para jobs asincrónicos.
- Nudges y comportamiento (más adelante, cuando el core sea sólido).

---

## 2) Estructura del repositorio (sugerida)
magnus-capital/
apps/
api/ # NestJS (REST/GraphQL)
web/ # Frontend (React/Next/Vite)
worker/ # Python analytics (opcional P1/P2)
infra/
docker/
docker-compose.yml
.env.example
portainer/
stack-notes.md # notas para Portainer (nombres, redes, volumes)
nginx/
default.conf
db/
migrations/
0001_init.sql
0002_indexes.sql
0003_constraints.sql
seeds/
docs/
schema.md
data_dictionary.md
scripts/
backup/
restore/
etl/
docs/
guía-implementación.md # este documento
decisiones.md
runbook.md

---

## 3) Stack Docker/Portainer (composición y estándares)

### Componentes
- `postgres` (PostgreSQL 16+ recomendado)
- `redis` (Redis 7) — cache + streams (jobs/eventos)
- `api` (NestJS)
- `web` (Nginx sirviendo SPA o Next standalone)
- `worker` (Python; P1/P2)

### Redes y volúmenes (nombres estables)
- Network: `magnus_net`
- Volúmenes:
  - `pgdata` (persistencia de DB)
  - `uploads` (archivos importados, si aplica)
  - `backups` (dumps y snapshots)

### Reglas operacionales
- Cada servicio con:
  - `restart: unless-stopped`
  - `healthcheck`
  - límites razonables de recursos (si el host es modesto)

---

## 4) Base de datos: Ledger de doble entrada (core)

### 4.1 Modelo mínimo
Tablas (mínimas):
- `users` (o `tenants` si multiusuario desde el inicio)
- `accounts` (catálogo contable jerárquico)
- `transactions` (cabecera)
- `postings` (líneas contables; deben sumar 0 por transacción)

Recomendaciones técnicas:
- Importes con `NUMERIC(18,2)` (o más precisión si manejarás FX/cripto).
- Índices por `posted_at`, `account_id`, `transaction_id`.
- Extensiones:
  - `uuid-ossp` o `pgcrypto` (UUID)
  - `ltree` si usarás jerarquías avanzadas (opcional pero útil)

### 4.2 Invariante contable
- Para cada `transaction_id`:
  - `SUM(postings.amount) = 0`
- Se valida al commit (constraint/trigger deferrable).

---

## 5) Migraciones DB: estrategia y herramientas

### 5.1 Regla de oro
**Todo cambio** de DB debe entrar por migración versionada y repetible.

### 5.2 Herramienta recomendada (elige 1 y manténla)
Opción A (simple y directa):
- Migraciones SQL “puras” (carpeta `db/migrations`), ejecutadas por:
  - Script Node (`node scripts/migrate.js`)
  - O un contenedor `migrator` que corre al deploy

Opción B (framework):
- Prisma Migrate o TypeORM migrations (si ya estás en Nest y quieres DX).

**Sugerencia para equipo pequeño:** SQL puro + scripts idempotentes suele ser más transparente.

### 5.3 Convención de migraciones
- `0001_init.sql`, `0002_add_indexes.sql`, etc.
- Tabla `schema_migrations`:
  - `version` (string)
  - `applied_at`

---

## 6) Migración de datos (del sistema actual → ledger)

### 6.1 Objetivo
Convertir tus registros actuales (p.ej. “Seguimiento Diario” con ingresos/gastos/inversiones) a **doble entrada** sin perder trazabilidad.

### 6.2 Enfoque recomendado (seguro)
1. **Crear el ledger nuevo** en paralelo (sin tocar lo viejo).
2. Construir un **ETL** (extract/transform/load) idempotente.
3. Validar conciliación (totales, conteos, períodos).
4. Hacer **cutover**:
   - Opción 1: “big bang” en una fecha de corte.
   - Opción 2: dual-write temporal (se escribe en ambos y se compara) por 1–2 semanas.

Para P0, normalmente:
- Big bang con fecha de corte + importación histórica.

### 6.3 Mapeo contable (plantilla)
Define cuentas contables base (ejemplo):

**Activos**
- `Assets:Cash`
- `Assets:Bank`
- `Assets:Investments`
- `Assets:Receivables` (opcional)

**Ingresos**
- `Income:Salary`
- `Income:Other`

**Gastos**
- `Expenses:Food`
- `Expenses:Transport`
- `Expenses:Subscriptions`
- `Expenses:Health`
- `Expenses:Other`

**Equity**
- `Equity:OpeningBalance` (para arranques / ajustes iniciales)

### 6.4 Reglas de transformación (ejemplo práctico)
Si tu registro actual tiene:
- `type = income`, `amount = 1000`
  - Debit: `Assets:Cash` +1000
  - Credit: `Income:*` -1000

- `type = expense`, `amount = 200`
  - Debit: `Expenses:*` +200
  - Credit: `Assets:Cash` -200

- `type = investment`, `amount = 300`
  - Debit: `Assets:Investments` +300
  - Credit: `Assets:Cash` -300

**Nota:** En doble entrada, el signo se maneja por convención (positivo/negativo) o por columnas `debit/credit`. Elige un estándar y aplícalo siempre.

### 6.5 Idempotencia del ETL
Para evitar duplicados:
- Usa una clave natural (ej: `source_system + source_id`) guardada en `transactions.external_ref`.
- Si `external_ref` existe, se hace “skip” o “update” según política.

---

## 7) Plan ETL (migración histórica) — checklist ejecutable

### 7.1 Preparación
- Congelar estructura vieja (no cambiar columnas mientras migras).
- Exportar dataset (CSV/JSON) y guardarlo en `uploads/` o bucket interno.
- Definir período a migrar (ej: desde 2024-01-01 hasta hoy).

### 7.2 Transformación
- Normalizar:
  - Fechas a UTC (o zona definida)
  - Categorías a catálogo (map table)
  - Moneda (si aplica: DOP / USD)

### 7.3 Carga
- Insertar cuentas (si no existen).
- Insertar transacciones + postings.
- Registrar en tabla `etl_runs`:
  - `run_id`, `started_at`, `finished_at`, `rows_in`, `rows_out`, `status`.

### 7.4 Validación (obligatoria)
- Conteo: transacciones origen vs destino.
- Totales por mes:
  - SUM ingresos, SUM gastos, SUM inversiones.
- Integridad ledger:
  - `SUM(postings.amount)` por transacción debe ser 0.
- Prueba de balances:
  - Balance de `Assets:Cash` debe ser coherente con tu saldo esperado.

---

## 8) API (NestJS) — módulos mínimos para no sobrediseñar

### 8.1 Módulos recomendados (P0)
- `AuthModule` (JWT)
- `LedgerModule`
  - `AccountsService`
  - `TransactionsService`
  - `PostingsService`
- `HealthModule` (healthchecks)
- `ConfigModule` (env/secrets)

### 8.2 Endpoints mínimos
- `POST /ledger/transactions`
- `GET /ledger/transactions?from=&to=`
- `GET /ledger/accounts`
- `GET /ledger/accounts/:id/balance?at=`

### 8.3 Convenciones críticas
- Validación DTO estricta (class-validator).
- Transacciones DB con rollback ante cualquier error.
- Logs estructurados (request_id).

---

## 9) Frontend — estrategia de dos capas (para ganar velocidad)

### Capa A: “Seguimiento Diario” (simple, rápida)
- Form: monto + categoría + tipo (income/expense/investment) + fecha.
- Internamente se traduce a double-entry y se envía al API.

### Capa B: “Modo Contable” (mínimo, para auditoría)
- Pantalla donde puedes ver postings por transacción.
- Filtros por fecha/cuenta.

---

## 10) Operación en servidor (runbook mínimo)

### 10.1 Backups
- Diario: `pg_dump` a `backups/`
- Semanal: copia a almacenamiento externo (otro disco/NAS/drive)
- Probar restore 1 vez al mes (no negociable)

### 10.2 Seguridad base
- Secrets fuera del repo (`.env` en Portainer / Docker secrets).
- HTTPS (Traefik o Caddy) cuando expongas a red.
- Principio de mínimos privilegios en DB (usuario app sin superuser).

### 10.3 Observabilidad
- `/health` en API
- logs por contenedor
- alertas simples (si un contenedor reinicia en loop)

---

## 11) Plantillas copiables

### 11.1 `.env.example` (mínimo)
```env
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=magnus
POSTGRES_USER=magnus_app
POSTGRES_PASSWORD=CHANGE_ME

# API
JWT_SECRET=CHANGE_ME
ENCRYPTION_KEY=CHANGE_ME_32CHARS_MIN
NODE_ENV=production

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

-- 0001_init.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  type TEXT NOT NULL CHECK (type IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
  parent_id UUID NULL REFERENCES accounts(id),
  currency TEXT NOT NULL DEFAULT 'DOP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  external_ref TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(18,2) NOT NULL,
  memo TEXT
);

-- Validación: suma por transacción = 0 (puede hacerse con trigger DEFERRABLE)
-- En P0 puedes validar a nivel app + job de auditoría diario si prefieres simplicidad.
COMMIT;

### 11.3 Tabla de mapeo de categorías (ejemplo)

| Categoría UI (legacy) | Tipo | Cuenta contable destino |
|---|---:|---|
| Salario | income | Income:Salary |
| Comida | expense | Expenses:Food |
| Transporte | expense | Expenses:Transport |
| Criptomonedas | investment | Assets:Investments |
| Otros | any | *según regla por defecto* |

11.4 Pseudoflujo ETL (idempotente)

1) Leer CSV legacy
2) Normalizar (fecha, monto, tipo, categoría)
3) Resolver cuentas (crear si no existe)
4) Construir transaction + postings (doble entrada)
5) Insertar transaction con external_ref = legacy_id
6) Si external_ref ya existe: skip
7) Validar sum(postings)=0
8) Registrar etl_run

12) Lista de decisiones (para que Antigravity ejecute sin ambigüedad)
Decidido

Core: Node/NestJS + PostgreSQL.

Contabilidad: ledger doble entrada.

Infra: Ubuntu 24.04 + Docker + Portainer.

Frontend: web responsive (P0). No app nativa.

Pendiente (definir pronto, pero no bloquea P0)

Herramienta exacta de migraciones (SQL puro vs Prisma/TypeORM).

Estandar de signos en postings (convención de debit/credit).

Multi-moneda (si entra en P0 o P1).

Reverse proxy (Traefik/Caddy/Nginx) y dominio/TLS (cuando se exponga).

13) Próximo paso inmediato (acción en 1 sesión de trabajo)

Crear repo con la estructura sugerida.

Levantar Stack en Portainer con postgres + redis + api + web.

Implementar 0001_init.sql + seed de cuentas base.

Endpoint POST /ledger/transactions (transaccional).

Pantalla “Seguimiento Diario” que traduzca a double-entry y guarde en ledger.

Esqueleto de ETL + validación por totales mensuales.

Fin del documento

Si necesitas, puedo producir una versión “operativa” de este mismo .MD con:

Un docker-compose.yml completo para Portainer (con healthchecks y volumes),

Un plan de migración por tabla (si me compartes el esquema actual del sistema legacy),

Y un checklist de pruebas (unitarias + reconciliación de datos).<!-- 
PASTE EL CONTENIDO DE SU ARCHIVO "Magnus2.0.md" AQUÍ 
Borre este comentario y pegue el texto completo para que pueda analizarlo.
-->
