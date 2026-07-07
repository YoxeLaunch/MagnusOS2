# 📚 MagnusOS2 — Documentación Técnica Unificada

> **Versión del Documento:** 2.0  
> **Última actualización:** Julio 2026  
> **Propósito:** Documentación técnica integral: arquitectura, comandos, finanzas, implementación y operación.

---

## Tabla de Contenidos

1. [Comandos y Operación](#-1-comandos-y-operación)
2. [Arquitectura del Sistema](#-2-arquitectura-del-sistema)
3. [Módulo Financiero](#-3-módulo-financiero)
4. [Base de Datos y Modelos](#-4-base-de-datos-y-modelos)
5. [API — Endpoints Completos](#-5-api--endpoints-completos)
6. [Infraestructura Docker](#-6-infraestructura-docker)
7. [Guía Financiera — KPIs y Algoritmos](#-7-guía-financiera--kpis-y-algoritmos)
8. [Plan de Implementación por Fases](#-8-plan-de-implementación-por-fases)
9. [Seguridad y Backups](#-9-seguridad-y-backups)
10. [Mejoras y Roadmap](#-10-mejoras-y-roadmap)
11. [Apéndices](#-apéndices)

---

## 🎮 1. Comandos y Operación

### 1.1 Control Básico del Sistema

#### Iniciar el Sistema (Linux)
\`\`\`bash
# Método recomendado: lanzador todo-en-uno
npm run start:all

# Alternativa: script shell
bash iniciar_sistema.sh
\`\`\`

#### Iniciar Servicios por Separado
\`\`\`bash
# Solo el Frontend (Vite dev server)
npm run dev

# Solo el Backend (Node.js/Express)
npm run server
\`\`\`

#### Detener el Sistema
- Presiona `Ctrl + C` en la terminal donde corre el proceso.
- En Docker: `docker compose down`

### 1.2 Scripts NPM Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el Frontend (Vite dev server, HMR activo) |
| `npm run server` | Inicia el Backend (Node.js/Express en puerto 4000) |
| `npm run start:all` | Inicia Frontend + Backend en paralelo |
| `npm run build` | Compila y optimiza el frontend para producción |
| `npm run preview` | Sirve `dist/` para probar la versión de producción |
| `npm run lint` | Analiza y auto-corrige el código (Biome) |
| `npm run format` | Formatea el código automáticamente (Biome) |
| `npm run analyze` | Ejecuta lint + type-check en un solo paso |
| `npm run type-check` | Verifica tipos TypeScript sin compilar |
| `npm test` | Ejecuta la suite de pruebas (Jest) |
| `npm run mcp` | Inicia el servidor MCP (Model Context Protocol) |

### 1.3 Comandos Docker

\`\`\`bash
# Levantar todo el stack
docker compose up -d

# Ver estado de contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f magnus

# Detener todo
docker compose down

# Reconstruir imágenes y levantar
docker compose up -d --build

# Acceder a la shell del contenedor API
docker exec -it magnus bash

# Acceder a PostgreSQL directamente
docker exec -it magnus_postgres psql -U magnus -d magnus
\`\`\`

### 1.4 Comandos de Mantenimiento y Backups

\`\`\`bash
# Verificar salud del sistema (healthcheck)
curl http://localhost:4000/api/health

# Backup manual de la base de datos
docker exec -t magnus_postgres pg_dump -U magnus magnus > backup_$(date +%F).sql

# Restaurar un backup
docker exec -i magnus_postgres psql -U magnus magnus < backup_YYYY-MM-DD.sql

# Ver uso de recursos de los contenedores
docker stats

# Limpiar imágenes y contenedores huérfanos
docker system prune -f
\`\`\`

### 1.5 Comandos de Desarrollo

\`\`\`bash
# Instalar dependencias
npm install

# Verificar actualizaciones de paquetes
npm outdated

# Actualizar paquetes (con precaución)
npm update

# Ejecutar pruebas con cobertura
npm test -- --coverage
\`\`\`

---

## 🏗️ 2. Arquitectura del Sistema

### 2.1 Vista de Alto Nivel

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                     │
│  React 18 + TypeScript + Vite + TailwindCSS             │
│  Módulos: finanza | magnus | auditor | server-admin     │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP REST + WebSocket (Socket.IO)
                    │ Puerto 4000 (producción)
┌───────────────────▼─────────────────────────────────────┐
│              BACKEND (Node.js / Express 4)               │
│  server/index.js → Rutas → Controladores → Modelos     │
│  Middleware: JWT Auth | Rate Limit | Security Headers   │
│  Socket.IO: Tiempo real para notificaciones y chat      │
└───────────────────┬─────────────────────────────────────┘
                    │ Sequelize ORM
         ┌──────────▼──────────┐
         │  PostgreSQL 16      │  ← Base de datos principal
         │  (Docker interno)   │     (puerto NO expuesto al host)
         └─────────────────────┘
         ┌──────────▼──────────┐
         │  Ollama (AI local)  │  ← LLM hospedado localmente
         │  (Docker interno)   │
         └─────────────────────┘
         ┌──────────▼──────────┐
         │  Sandbox (Python)   │  ← Ejecución de código arbitrario
         │  (Docker aislado)   │     para analítica futura
         └─────────────────────┘
\`\`\`

### 2.2 Stack Tecnológico Completo

#### Backend
| Componente | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework HTTP | Express | 4.19 |
| ORM | Sequelize | 6.37 |
| Base de datos | PostgreSQL | 16-alpine |
| Base de datos dev | SQLite3 | 5.1 |
| Autenticación | JWT (jsonwebtoken) | 9.0 |
| Password hashing | bcryptjs | 3.0 |
| Real-time | Socket.IO | 4.8 |
| Rate limiting | express-rate-limit | 8.2 |
| Seguridad headers | Helmet | 8.1 |
| Importación archivos | multer, pdf-parse | — |
| AI local | @modelcontextprotocol/sdk | 1.26 |
| Docker API | dockerode | 4.0 |
| Jobs programados | node-cron | 4.2 |

#### Frontend
| Componente | Tecnología | Versión |
|---|---|---|
| Framework | React | 18.2 |
| Lenguaje | TypeScript | 5.2 |
| Bundler | Vite | 7.3 |
| Estilos | TailwindCSS | 3.4 |
| Gráficos | Recharts | 2.12 |
| Animaciones | Framer Motion | 12 |
| Íconos | Lucide React | 0.363 |
| Routing | React Router DOM | 6.30 |
| Terminal web | xterm.js | 6.0 |
| Fechas | date-fns | 4.1 |
| i18n | i18next | 25 |

### 2.3 Estructura de Directorios

\`\`\`
Magnus-OS2/
├── server/                  # Backend Node.js
│   ├── index.js             # Entry point (Express + Socket.IO)
│   ├── routes/              # Endpoints REST
│   │   ├── finanza.routes.js
│   │   ├── magnus.routes.js
│   │   ├── auth.routes.js
│   │   ├── ai.routes.js
│   │   ├── auditor.routes.js
│   │   ├── system.routes.js
│   │   ├── econometrics.routes.js
│   │   ├── centroComando.routes.js
│   │   └── telegram.routes.js
│   ├── controllers/         # Lógica de negocio por módulo
│   ├── models/              # Modelos Sequelize (DB schema)
│   ├── middleware/          # JWT auth, rate limiting, security
│   ├── services/            # Servicios externos (Docker API)
│   ├── socket/              # Handlers de WebSocket
│   ├── jobs/                # Cron jobs y tareas programadas
│   ├── config/              # Config de base de datos
│   ├── backup/              # Scripts de backup
│   └── scripts/             # Scripts de mantenimiento
├── src/                     # Frontend React/TypeScript
│   ├── App.tsx              # Root component + routing
│   ├── main.tsx             # Entry point React
│   ├── apps/
│   │   ├── finanza/         # Módulo financiero principal
│   │   ├── magnus/          # Dashboard principal + sistema
│   │   ├── auditor/         # Módulo de auditoría contable
│   │   └── server-admin/    # Panel de administración soberano
│   ├── context/             # React Context providers
│   └── shared/              # Componentes compartidos
├── docker-compose.yml       # Orquestación 4 servicios
├── Dockerfile.api           # Imagen del backend
├── Dockerfile.web           # Imagen del frontend (Nginx)
├── Dockerfile.sandbox       # Imagen Python sandbox
├── nginx.conf               # Proxy/static file server
└── package.json             # Dependencias unificadas
\`\`\`

### 2.4 Flujo de Datos

\`\`\`
Usuario → Browser (React SPA)
         → fetch con JWT header
         → Express: verifyJWT middleware
         → Router → Controller
         → Sequelize ORM
         → PostgreSQL

Respuesta: PostgreSQL → Sequelize → Controller → JSON
           → Browser → React state update → UI render

Tiempo real: servidor emite via Socket.IO → browser recibe evento → update UI
\`\`\`

### 2.5 Filosofía HomeMade

| Decisión | Razón |
|---|---|
| Node.js nativo vs NestJS | Menos peso, más transparencia |
| Sequelize vs Prisma | Madurez y flexibilidad sin code generation |
| React + Vite vs Next.js | SPA simple, sin SSR innecesario |
| PostgreSQL propio vs Supabase | Sin vendor lock-in |
| Ollama local vs OpenAI API | Sin costos por token, privacidad financiera total |
| JWT propio vs Auth0 | Control total de autenticación |
| Docker Compose vs Kubernetes | Apropiado para servidor doméstico |

---

## 💰 3. Módulo Financiero

### 3.1 Dos Sistemas en Coexistencia

#### Capa 1 — Legacy (Transacciones Simples)

Modelo `Transaction` (tabla `Transactions`):
\`\`\`
id         STRING (PK)
userId     STRING
name       STRING         ← nombre descriptivo
amount     FLOAT
frequency  STRING         ← 'Mensual', 'Semanal', 'Anual'
category   STRING
currency   STRING         ← 'DOP', 'USD', 'EUR'
date       DATEONLY
type       STRING         ← 'income', 'expense', 'investment'
deductions JSON           ← AFP, SFS, ISR (deducciones salariales)
validFrom  DATEONLY
validTo    DATEONLY
\`\`\`

Modelo `DailyTransaction` (tabla `DailyTransactions`):
\`\`\`
id          INTEGER (PK, autoincrement)
userId      STRING
date        DATEONLY
amount      FLOAT
description STRING
type        STRING
category    STRING
\`\`\`

#### Capa 2 — Ledger de Doble Entrada (activo)

Modelo `LedgerTransaction` (tabla `ledger_transactions`):
\`\`\`
id                   UUID (PK)
user_id              STRING
date                 DATEONLY
payee_id             UUID (FK → Payees)
payee_name           STRING (desnormalizado para display)
memo                 TEXT
status               ENUM('pending', 'cleared', 'reconciled')
type                 ENUM('income', 'expense', 'transfer', 'investment')
reference            STRING
recurring_template_id UUID
\`\`\`

Modelo `TransactionLine` (tabla `transaction_lines`):
\`\`\`
id              UUID (PK)
transaction_id  UUID (FK → LedgerTransaction, CASCADE DELETE)
account_id      UUID (FK → Account)
category_id     UUID (FK → Category)
amount_minor    BIGINT    ← en centavos (sin decimales flotantes)
currency        STRING(3) ← 'DOP'
fx_rate         DECIMAL   ← para multi-divisa
memo            STRING
\`\`\`

### 3.2 Invariante Contable (Regla de Oro)

Para cada `LedgerTransaction`, la suma de todos sus `TransactionLine.amount_minor` **debe ser exactamente cero**:

\`\`\`javascript
const total = lines.reduce((sum, line) => sum + toMinorUnits(line.amount), 0);
if (total !== 0) {
    await t.rollback();
    return res.status(400).json({ error: 'Transaction lines must sum to 0.' });
}
\`\`\`

### 3.3 Flujo Completo de una Transacción

\`\`\`
1. Usuario llena formulario en React (monto, cuenta, categoría, tipo)
2. Frontend construye payload JSON con { lines: [{accountId, amount, categoryId}, ...] }
3. POST /api/finanza/ledger/transactions con JWT header
4. Backend: verifyJWT middleware valida token
5. ledgerController.createTransaction():
   a. Valida campos requeridos (userId, date, lines >= 2)
   b. Valida invariante: SUM(lines.amount) == 0
   c. BEGIN TRANSACTION (Sequelize)
   d. INSERT LedgerTransaction (header)
   e. INSERT TransactionLine × N (con amount en centavos)
   f. updateAccountBalances(): actualiza currentBalanceMinor en cada Account
   g. COMMIT
6. Retorna LedgerTransaction completa con líneas y asociaciones
7. Frontend actualiza estado React → UI re-render del dashboard
\`\`\`

### 3.4 Diferencia Conceptual: Gasto vs Inversión

| Concepto | Comportamiento en Ledger |
|---|---|
| Gasto | Debita Expenses:*, Acredita Assets:Cash → reduce patrimonio neto |
| Inversión | Debita Assets:Investments, Acredita Assets:Cash → transforma activo, patrimonio se mantiene |
| Ingreso | Debita Assets:Cash, Acredita Income:* → aumenta patrimonio neto |
| Transferencia | Debita Cuenta Destino, Acredita Cuenta Origen → no afecta cashflow |

### 3.5 Sistema de Presupuesto

\`\`\`
Ingreso Mensual Total    = SUM(income Mensual)
                         + SUM(income Semanal) × 4.33
                         + SUM(income Anual) / 12

Gasto Mensual Fijo       = SUM(expense Mensual)
Gasto Acumulado Mes      = SUM(dailyTransactions del mes, type='expense')
Presupuesto Restante     = Ingreso Total - Gasto Fijo - Gasto Acumulado

Ratio Gasto/Ingreso      = Gasto Acumulado / Ingreso Total × 100
\`\`\`

Alertas: `< 70%` Verde | `70-90%` Amarillo | `> 90%` Rojo | `= 100%` Crítico

### 3.6 Precisión Numérica: Minor Units

\`\`\`javascript
// Los amounts se almacenan como BIGINT (centavos), eliminando errores de punto flotante
export const toMinorUnits = (amount) => Math.round(amount * 100);
export const fromMinorUnits = (minor) => minor / 100;
// Ejemplo: RD$1,234.56 → almacenado como 123456
\`\`\`

---

## 🗃️ 4. Base de Datos y Modelos

### 4.1 Diagrama de Modelos

\`\`\`
Users
  │ 1:N
  ├──▶ Transactions (legacy — recurring budget items)
  ├──▶ DailyTransactions (legacy — daily spending log)
  ├──▶ WealthSnapshots
  ├──▶ LedgerTransactions (new — double-entry header)
  │       │ 1:N
  │       └──▶ TransactionLines
  │               │ N:1
  │               ├──▶ Accounts  ◀── SavingsGoals (opcional)
  │               └──▶ Categories
  │
  ├──▶ SavingsGoals
  │       │ 1:N
  │       └──▶ SavingsContributions

CurrencyHistory (global, sin userId)
Auditor (base de datos separada — registros de auditoría)
System (base de datos separada — curriculum, misiones, mentores, checklist, publicaciones)
\`\`\`

### 4.2 Tablas Principales (PostgreSQL)

\`\`\`sql
-- accounts
accounts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('cash','checking','savings','credit_card','investment','loan')),
  currency TEXT NOT NULL DEFAULT 'DOP',
  opening_balance_minor BIGINT DEFAULT 0,
  current_balance_minor BIGINT DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- categories
categories(id UUID, user_id TEXT, name TEXT, group TEXT,
  type TEXT, -- income | expense | transfer | investment | savings
  is_archived BOOLEAN)

-- ledger_transactions
ledger_transactions(
  id UUID PRIMARY KEY,
  user_id TEXT, date DATE,
  payee_name TEXT, memo TEXT,
  status TEXT DEFAULT 'pending',  -- pending | cleared | reconciled
  type TEXT,                      -- income | expense | transfer | investment
  external_ref TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- transaction_lines (doble entrada)
transaction_lines(
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  category_id UUID,
  amount_minor BIGINT NOT NULL,  -- SUM por transaction debe ser 0
  currency VARCHAR(3) DEFAULT 'DOP'
)

-- savings_goals
savings_goals(
  id UUID, user_id TEXT, name TEXT,
  target_amount_minor BIGINT,
  target_date DATE,
  linked_account_id UUID,
  is_active BOOLEAN DEFAULT true
)
\`\`\`

### 4.3 Migración desde SQLite (Datos Legacy)

\`\`\`
DailyTransaction → ledger_transactions + transaction_lines

INCOME:     Checking +amount | Income -amount
EXPENSE:    Checking -amount | Expense +amount
INVESTMENT: Checking -amount | Investment +amount  (corrige error conceptual)
\`\`\`

Checklist ETL:
1. Congelar SQLite (modo mantenimiento)
2. Exportar tablas (CSV/JSON)
3. Aplicar migraciones PostgreSQL
4. ETL con `external_ref = legacy_id` (idempotencia)
5. Validar: `SUM(amount_minor) = 0` por transacción
6. Validar totales mensuales
7. Cutover

---

## 🔌 5. API — Endpoints Completos

### Autenticación
\`\`\`
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/validate
\`\`\`

### Finanzas — Ledger (v2, activo)
\`\`\`
GET    /api/finanza/ledger
POST   /api/finanza/ledger/transactions
PATCH  /api/finanza/ledger/transactions/:id
DELETE /api/finanza/ledger/transactions/:id
PATCH  /api/finanza/ledger/transactions/:id/status
POST   /api/finanza/transfers
\`\`\`

### Finanzas — Cuentas
\`\`\`
GET    /api/finanza/accounts
POST   /api/finanza/accounts
PATCH  /api/finanza/accounts/:id
DELETE /api/finanza/accounts/:id
GET    /api/finanza/accounts/:id/balance
POST   /api/finanza/accounts/reorder
\`\`\`

### Finanzas — Metas de Ahorro
\`\`\`
GET    /api/finanza/savings-goals
POST   /api/finanza/savings-goals
PATCH  /api/finanza/savings-goals/:id
DELETE /api/finanza/savings-goals/:id
POST   /api/finanza/savings-goals/:id/contribute
GET    /api/finanza/savings-goals/:id/progress
GET    /api/finanza/savings-rate
\`\`\`

### Finanzas — Wealth & Import
\`\`\`
GET    /api/finanza/wealth/history
POST   /api/finanza/wealth/snapshot
GET    /api/finanza/import/templates
POST   /api/finanza/import/preview
POST   /api/finanza/import
POST   /api/finanza/import/categorize
\`\`\`

### Finanzas — Legacy (deprecación progresiva)
\`\`\`
GET/POST/PUT/DELETE  /api/finanza/transactions
GET/POST/PUT/DELETE  /api/finanza/daily-transactions
GET/POST             /api/finanza/rates
GET                  /api/finanza/rates/history
\`\`\`

### Publicaciones (Blog de Mentoría)
\`\`\`
GET    /api/publications                ← lectura: todo usuario autenticado
POST   /api/publications                ← solo soberano/admin
PUT    /api/publications/:id            ← solo soberano/admin
DELETE /api/publications/:id            ← solo soberano/admin
POST   /api/publications/upload         ← solo soberano/admin (multipart, imágenes y PDF, máx. 15MB)
\`\`\`

### Sistema y Otros
\`\`\`
GET    /api/health             ← healthcheck Docker
POST   /api/magnus/*           ← módulo personal
GET    /api/auditor/*          ← auditoría contable (rutas activas en backend; sin acceso desde el menú del frontend)
GET    /api/system/*           ← panel soberano
POST   /api/econometrics/*     ← análisis econométrico
/socket.io                     ← WebSocket endpoint (Socket.IO)
\`\`\`

---

## 🐳 6. Infraestructura Docker

### 6.1 Servicios del Stack

| Servicio | Imagen | Puerto | Descripción |
|---|---|---|---|
| postgres | postgres:16-alpine | interno | Base de datos principal |
| magnus | magnus-api:latest | 4000 | Backend Node.js + Frontend |
| ollama | ollama/ollama | interno | LLM local |
| sandbox | python:sandbox | interno | Analítica Python aislada |

### 6.2 Optimización PostgreSQL (8GB RAM)

| Parámetro | Valor | Propósito |
|---|---|---|
| `shared_buffers` | 256MB | Cache de páginas |
| `effective_cache_size` | 768MB | Hint al planner |
| `work_mem` | 4MB | RAM por sort/hash |
| `max_connections` | 50 | Evita desbordamiento |
| `synchronous_commit` | off | Más velocidad de escritura |
| `wal_level` | minimal | Sin replication overhead |

### 6.3 Consumo de Recursos Estimado

| Servicio | RAM | CPU |
|---|---|---|
| postgres | ~150-300MB | Bajo |
| magnus (Node.js) | ~120-200MB | Bajo-Medio |
| ollama | 2-6GB (según modelo) | Alto cuando activo |
| sandbox (Python) | ~50-100MB | Bajo |

> ⚠️ Ollama con modelos grandes puede comprometer los 8GB. Usar `OLLAMA_MAX_LOADED_MODELS=1` y modelos Q4_K_M.

### 6.4 Docker Compose para Portainer

\`\`\`yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: magnus
      POSTGRES_USER: magnus
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - magnus_pgdata:/var/lib/postgresql/data
      - magnus_backups:/backups
    networks: [magnus_internal]
    restart: unless-stopped

  magnus-api:
    image: magnus-api:latest
    environment:
      DATABASE_URL: postgresql://magnus:${POSTGRES_PASSWORD}@postgres:5432/magnus
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on: [postgres]
    networks: [magnus_internal, magnus_edge]
    ports: ["4000:4000"]
    restart: unless-stopped

  magnus-web:
    image: magnus-web:latest
    depends_on: [magnus-api]
    networks: [magnus_edge]
    restart: unless-stopped

networks:
  magnus_internal:
    driver: bridge
    internal: true
  magnus_edge:
    driver: bridge

volumes:
  magnus_pgdata:
  magnus_backups:
\`\`\`

---

## 📊 7. Guía Financiera — KPIs y Algoritmos

### 7.1 Ciclos Financieros

El sistema usa ciclos financieros de nómina (no meses calendario):
- **Definición:** Del día **26 del mes anterior** al **25 del mes actual**.
- **Ejemplo:** El ciclo "Febrero" = 26 Enero → 25 Febrero.

### 7.2 KPIs Principales

#### A. Tasa de Ahorro
$$\text{Tasa de Ahorro} = \left( \frac{\text{Ingresos} - \text{Gastos}}{\text{Ingresos}} \right) \times 100$$

| Rango | Estado |
|---|---|
| < 0% | Déficit |
| 0-10% | Riesgo alto |
| 10-20% | Saludable |
| > 20% | Excelente |

#### B. Disciplina Financiera
$$\text{Disciplina} = \left( \frac{\text{Días únicos con registros}}{90} \right) \times 100$$
Ventana: últimos 90 días. Mide el hábito de registro, no el dinero.

#### C. Adherencia al Plan
$$\text{Adherencia} = \frac{\text{Meses con Ahorro Positivo}}{\text{Total meses proyectados}} \times 100$$

#### D. Cash Runway (Supervivencia)
$$\text{Runway} = \frac{\text{Ahorros Totales}}{\text{Gasto Mensual Promedio}}$$

| Runway | Interpretación |
|---|---|
| 3 meses | Fondo emergencia mínimo |
| 6 meses | Seguridad financiera sólida |
| 12+ meses | Libertad financiera |

#### E. Estabilidad de Gastos
$$\text{Estabilidad} = 100 - \left( \frac{\sigma}{\bar{x}} \times 100 \right)$$
Mayor score = gastos controlados y predecibles.

### 7.3 Algoritmos de Predicción

#### Cold Start (< 3 ciclos): Promedio Simple
#### Análisis de Tendencias (≥ 3 ciclos): Regresión Lineal
$$y = mx + b$$
Detecta si las finanzas están mejorando o empeorando.

#### Predicción de Fin de Mes
\`\`\`javascript
const gastoDiarioPromedio = gastoAcumuladoMes / diaDelMes;
const gastoProyectadoFinMes = gastoAcumuladoMes + (gastoDiarioPromedio * diasRestantes);
const balanceProyectado = ingresoMensualTotal - gastoFijoMensual - gastoProyectadoFinMes;
\`\`\`

#### Predicción de Metas de Ahorro
\`\`\`javascript
const avgMonthly = totalContributed / monthsElapsed;
const monthsToGo = remaining / avgMonthly;
projectedDate = addMonths(today, Math.ceil(monthsToGo));
const monthlyNeeded = remaining / monthsLeft;
\`\`\`

### 7.4 Tiempos de Maduración de Datos

| Nivel | Tiempo | Capacidades |
|---|---|---|
| Básico | 1 mes | Tasa de Ahorro, Disciplina, proyecciones estáticas |
| Confiable | 3 meses | Regresión Lineal activa, Estabilidad, Adherencia |
| Óptimo | 6+ meses | Cash Runway máximo, patrones estacionales |

### 7.5 Mapeo Contable Base

| Categoría UI | Tipo | Cuenta Contable |
|---|---|---|
| Salario | income | Income:Salary |
| Freelance | income | Income:Freelance |
| Comida | expense | Expenses:Food |
| Transporte | expense | Expenses:Transport |
| Servicios | expense | Expenses:Services |
| Salud | expense | Expenses:Health |
| Criptomonedas | investment | Assets:Investments |
| Transferencia banco | transfer | Assets:Checking → Assets:Savings |

---

## 📋 8. Plan de Implementación por Fases

### Fase P0 — Base Operativa (1 sprint)
- [ ] Stack Portainer (Postgres + API + Web)
- [ ] Volúmenes, redes, `.env` con secretos
- [ ] Script backup diario automático
- [ ] Healthchecks configurados
- [ ] Migración `0001_init.sql` aplicada

**✅ Salida P0:** Sistema estable, DB lista, backups funcionando.

### Fase P1 — Core Financiero Correcto (2–3 sprints)
- [ ] Implementar `accounts`, `ledger_transactions`, `transaction_lines`
- [ ] Endpoint `POST /transactions` con validación de balance
- [ ] UI ledger (lista + filtros) + modal con splits
- [ ] `transfers` (helper)
- [ ] Estados `pending/cleared/reconciled`

**✅ Salida P1:** Operación correcta de ingresos/gastos/transferencias.

### Fase P2 — Ahorros y Control (1–2 sprints)
- [ ] `savings_goals` + vista de metas
- [ ] KPI: savings rate mensual
- [ ] Aportes recurrentes (recurring_templates)

**✅ Salida P2:** Ahorro medible y automatizable.

### Fase P3 — Importación + Reglas (1–2 sprints)
- [ ] Import CSV (preview + commit)
- [ ] Dedupe por hash
- [ ] Rules engine para autocategorizar
- [ ] Conciliación mejorada por lotes

**✅ Salida P3:** Captura rápida, menos trabajo manual.

### Fase P4 — Migración de Datos (si aplica)
- [ ] Export SQLite
- [ ] Transform + import a Postgres ledger
- [ ] Validación de balances y totales

**✅ Salida P4:** Sistema definitivo sobre PostgreSQL.

### Criterios de Aceptación
- [ ] Transferencia Checking→Savings **no** aparece como gasto
- [ ] Cashflow mensual refleja solo ingresos/gastos reales
- [ ] Net worth = suma de balances por cuenta
- [ ] Todas las transacciones balanceadas: `SUM(lines)=0`
- [ ] Meta de ahorro con progreso + aporte mensual sugerido
- [ ] Import CSV no duplica al reimportar
- [ ] Backup diario existe y es restaurable

---

## 🔒 9. Seguridad y Backups

### 9.1 Seguridad del Backend

\`\`\`javascript
app.use(helmet());                           // Headers CSP, HSTS, etc.
app.use(rateLimiter);                        // express-rate-limit
app.use(express.json({ limit: '1mb' }));     // Payload limit
router.use(verifyJWT);                       // Todas las rutas financieras
\`\`\`

**Reglas obligatorias:**
- Secrets en `.env` — NUNCA en el repositorio
- PostgreSQL NO expuesto al exterior
- HTTPS obligatorio si se expone a red pública
- CORS restringido al dominio del frontend
- Rate limiting en todas las rutas
- Usuario DB sin superuser (principio de mínimos privilegios)

### 9.2 Política de Backups

| Frecuencia | Método | Destino | Retención |
|---|---|---|---|
| Diario | `pg_dump` automático (cron) | `/backups/` Docker | 14 días |
| Semanal | Copia a almacenamiento externo | Disco externo / NAS | 4 semanas |
| Mensual | Prueba de restauración | DB temporal | — |

\`\`\`bash
# Backup manual
docker exec -t magnus_postgres pg_dump -U magnus magnus > magnus_$(date +%F).sql

# Restaurar
docker exec -i magnus_postgres psql -U magnus magnus < magnus_YYYY-MM-DD.sql
\`\`\`

### 9.3 Observabilidad

\`\`\`bash
curl http://localhost:4000/api/health   # Healthcheck
docker compose logs -f                  # Logs en tiempo real
docker compose ps                       # Estado de contenedores
docker stats                            # Uso de recursos
\`\`\`

---

## 🚀 10. Mejoras y Roadmap

### Corto Plazo (1–3 meses)
- [ ] Integrar `savingsRate` con el ledger real
- [ ] Dashboard unificado: legacy + ledger en un solo panel
- [ ] Suavizado exponencial en la predicción de fin de mes
- [ ] Alertas Telegram automáticas
- [ ] Backup automático diario configurado
- [ ] Middleware `compression` en Express
- [ ] Endpoint dedicado `/api/finanza/prediction`

### Mediano Plazo (3–9 meses)
- [ ] Vista materializada mensual en PostgreSQL (-80% tiempo de query)
- [ ] Redis cache para dashboard y prediction (TTL: 60s)
- [ ] Promedio móvil ponderado (WMA) para predicción de gasto
- [ ] Categorización automática via ML (scikit-learn en sandbox)
- [ ] Detección de anomalías (Isolation Forest)
- [ ] Reporte mensual PDF automático
- [ ] Importación CSV de bancos locales (BHD, Popular, BanReservas)
- [ ] Multi-moneda real: conversión USD/EUR → DOP

### Largo Plazo (9–24 meses)
- [ ] AI Analyst real con contexto completo del ledger (Ollama)
- [ ] Forecasting ARIMA en Python Sandbox (3–6 meses)
- [ ] Optimizador de presupuesto por categoría
- [ ] Análisis de fecha de libertad financiera
- [ ] Módulo de impuestos DOP (ISR anual, AFP/SFS)
- [ ] App móvil PWA con push notifications

### Mejoras Matemáticas Propuestas

\`\`\`
Suavizado Exponencial (ETS): S_t = α × X_t + (1 - α) × S_{t-1}
Promedio Móvil Ponderado (WMA): WMA_n = Σ(w_i × x_i) / Σw_i
Regresión Lineal OLS: y = β₀ + β₁ × t + ε
Bandas de Confianza:  IC = ȳ ± z × (σ / √n)
\`\`\`

| Mejora de Infraestructura | Ganancia estimada |
|---|---|
| Vistas materializadas PostgreSQL | -80% tiempo query dashboard |
| Redis cache (TTL 30s) | -90% queries repetidas |
| WebSocket push vs polling | -100% requests innecesarios |
| Compresión HTTP | -60-80% tamaño respuesta JSON |
| Worker Threads | No bloquear el event loop |

---

## 📎 Apéndices

### Apéndice A — Variables de Entorno

\`\`\`env
# Database
DATABASE_URL=postgresql://magnus:PASSWORD@postgres:5432/magnus
POSTGRES_DB=magnus
POSTGRES_USER=magnus
POSTGRES_PASSWORD=CHANGE_ME

# API
JWT_SECRET=CHANGE_ME_MIN_32_CHARS
PORT=4000
NODE_ENV=production

# CORS
CORS_ORIGINS=http://tu-dominio.com,https://tu-dominio.com

# Redis (opcional)
REDIS_HOST=redis
REDIS_PORT=6379
\`\`\`

### Apéndice B — Migración SQL Inicial

\`\`\`sql
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
  type TEXT NOT NULL CHECK (type IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
  currency TEXT NOT NULL DEFAULT 'DOP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  payee_name TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT,
  external_ref TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'DOP',
  memo TEXT
);
COMMIT;
\`\`\`

### Apéndice C — Pseudoflujo ETL (Idempotente)

\`\`\`
1) Leer CSV/SQLite legacy
2) Normalizar (fecha a UTC, monto, tipo, categoría)
3) Resolver cuentas (crear si no existe)
4) Construir ledger_transaction + transaction_lines (doble entrada)
5) Insertar con external_ref = legacy_id
6) Si external_ref ya existe: SKIP
7) Validar: SUM(transaction_lines.amount_minor) = 0
8) Registrar en etl_runs (run_id, started_at, finished_at, rows_in, rows_out, status)
\`\`\`

### Apéndice D — Tabla de Decisiones Técnicas

| Área | Decisión | Estado |
|---|---|---|
| Core | Node.js/Express + PostgreSQL | ✅ Decidido |
| Contabilidad | Ledger doble entrada | ✅ Decidido |
| Infra | Ubuntu 24.04 + Docker + Portainer | ✅ Decidido |
| Frontend | React + Vite (SPA responsive) | ✅ Decidido |
| ORM | Sequelize 6 | ✅ Decidido |
| Herramienta de migraciones | SQL puro vs Prisma/TypeORM | ⏳ Pendiente |
| Estándar de signos en postings | Convención debit/credit | ⏳ Pendiente |
| Multi-moneda en P0 | Si entra en P0 o P1 | ⏳ Pendiente |
| Reverse proxy | Traefik / Caddy / Nginx + TLS | ⏳ Pendiente |

---

*Documento unificado — Julio 2026 | MagnusOS2 por YoxeLaunch*
