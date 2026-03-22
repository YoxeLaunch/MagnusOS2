# MagnusOS2 – Extended Technical Architecture Report

> **Versión del Documento:** 1.0  
> **Fecha:** 2026-03-07  
> **Propósito:** Reporte técnico exhaustivo para análisis, investigación y optimización por sistemas de IA externos (Claude, Gemini, etc.)  
> **Fuente de verdad:** Código fuente real en `/home/osvaldo/proyectos/sistema-m/Magnus-OS2/`

---

## 1. Visión General del Sistema

### ¿Qué es MagnusOS2?

MagnusOS2 es un **Financial Operating System** personal de uso privado. Se trata de una aplicación web full-stack que funciona como sistema integral de control financiero personal: registra ingresos, gastos e inversiones; gestiona presupuestos; realiza seguimiento diario de flujo de caja; proyecta balances a fin de mes; administra metas de ahorro; y expone dashboards analíticos en tiempo real.

El nombre "OS2" señala que es la segunda generación del sistema (evolución desde `magnus-capital.archived`), con arquitectura rediseñada que incorpora un **ledger de doble entrada** como núcleo contable.

### ¿Qué problema resuelve?

| Problema | Solución en MagnusOS2 |
|---|---|
| Control financiero fragmentado | Sistema centralizado en un solo servidor privado |
| Pérdida de trazabilidad contable | Ledger de doble entrada: toda cifra es reconstruible |
| Dependencia de servicios cloud de terceros | Stack 100% auto-hospedado en Ubuntu Server |
| Herramientas genéricas que no se adaptan al usuario | Sistema "HomeMade" diseñado específicamente para el usuario soberano |
| Falta de predicciones financieras | Módulo de proyección de fin de mes y metas de ahorro |

### Filosofía del Sistema

1. **El ledger manda**: toda cifra visible en la UI debe poder reconstruirse desde el libro contable.
2. **Transacciones atómicas**: una operación financiera se guarda completa o no se guarda.
3. **Migraciones versionadas**: no hay cambios manuales en producción.
4. **Idempotencia**: importaciones y jobs pueden re-ejecutarse sin duplicar datos.
5. **Observabilidad mínima**: healthchecks, logs, backups desde el día 1.
6. **Independencia tecnológica**: sin dependencias de servicios SaaS externos para la operación core.

### Enfoque de Diseño

- **Eficiencia sobre features**: se prefiere un sistema que funcione perfectamente a uno cargado de funcionalidades inestables.
- **Minimalismo infraestructural**: 4 contenedores Docker es toda la infraestructura requerida.
- **Control total del stack**: desde el motor de base de datos hasta el frontend, todo es propio y auditable.
- **Dual-layer de entrada**: una capa "Seguimiento Diario" (simple, rápida) y una capa "Ledger Contable" (precisa, auditable).

---

## 2. Arquitectura del Sistema

### Vista de Alto Nivel

```
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
                    │
         ┌──────────▼──────────┐
         │  Ollama (AI local)  │  ← LLM hospedado localmente
         │  (Docker interno)   │
         └─────────────────────┘
         ┌──────────▼──────────┐
         │  Sandbox (Python)   │  ← Ejecución de código arbitrario
         │  (Docker aislado)   │     para analítica futura
         └─────────────────────┘
```

### Stack Tecnológico Completo

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

### Estructura de Directorios

```
Magnus-OS2/
├── server/                  # Backend Node.js
│   ├── index.js             # Entry point (Express + Socket.IO)
│   ├── routes/              # Definición de endpoints REST
│   │   ├── finanza.routes.js
│   │   ├── magnus.routes.js
│   │   ├── auth.routes.js
│   │   ├── ai.routes.js
│   │   ├── auditor.routes.js
│   │   ├── system.routes.js
│   │   └── telegram.routes.js
│   ├── controllers/         # Lógica de negocio por módulo
│   ├── models/              # Modelos Sequelize (DB schema)
│   ├── middleware/          # JWT auth, rate limiting, security
│   ├── services/            # Servicios externos (Docker API)
│   ├── socket/              # Handlers de WebSocket
│   ├── config/              # Config de base de datos
│   └── scripts/             # Scripts de mantenimiento
├── src/                     # Frontend React/TypeScript
│   ├── App.tsx              # Root component + routing
│   ├── apps/
│   │   ├── finanza/         # Módulo financiero principal
│   │   ├── magnus/          # Dashboard principal + sistema
│   │   ├── auditor/         # Módulo de auditoría contable
│   │   └── server-admin/    # Panel de administración
│   ├── context/             # React Context providers
│   └── shared/              # Componentes compartidos
├── docker-compose.yml       # Orquestación 4 servicios
├── Dockerfile.api           # Imagen del backend
├── nginx.conf               # Proxy/static file server
└── package.json             # Dependencias unificadas
```

### Flujo de Datos General

```
Usuario → Browser (React SPA)
         → fetch/axios con JWT header
         → Express: verifyJWT middleware
         → Router → Controller
         → Sequelize ORM
         → PostgreSQL

Respuesta:  PostgreSQL → Sequelize → Controller → JSON
            → Browser → React state update → UI render

Tiempo real: servidor emite via Socket.IO → browser recibe evento → update UI
```

---

## 3. Módulo de Finanzas

### Tres Capas de Registro

MagnusOS2 opera con **dos sistemas de transacciones en coexistencia**:

#### Capa 1 — Legacy (Transacciones Simples)

Modelo `Transaction` (tabla `Transactions`):
```
id         STRING (PK)
userId     STRING
name       STRING         ← nombre descriptivo
amount     FLOAT
frequency  STRING         ← 'Mensual', 'Semanal', etc.
category   STRING
currency   STRING         ← 'DOP', 'USD', 'EUR'
date       DATEONLY
type       STRING         ← 'income', 'expense', 'investment'
deductions JSON           ← AFP, SFS, ISR (deducciones salariales)
validFrom  DATEONLY       ← Para tracking histórico no destructivo
validTo    DATEONLY
```

Modelo `DailyTransaction` (tabla `DailyTransactions`):
```
id          INTEGER (PK, autoincrement)
userId      STRING
date        DATEONLY
amount      FLOAT
description STRING
type        STRING
category    STRING
```

#### Capa 2 — Ledger de Doble Entrada (P1, activo)

Modelo `LedgerTransaction` (tabla `ledger_transactions`):
```
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
```

Modelo `TransactionLine` (tabla `transaction_lines`):
```
id              UUID (PK)
transaction_id  UUID (FK → LedgerTransaction, CASCADE DELETE)
account_id      UUID (FK → Account)
category_id     UUID (FK → Category)
amount_minor    BIGINT    ← en centavos (sin decimales flotantes)
currency        STRING(3) ← 'DOP'
fx_rate         DECIMAL   ← para multi-divisa
memo            STRING
```

#### Invariante Contable (Regla de Oro)

Para cada `LedgerTransaction`, la suma de todos sus `TransactionLine.amount_minor` **debe ser exactamente cero**:

```
SUM(transaction_lines.amount_minor) WHERE transaction_id = X = 0
```

Esta validación ocurre en el controlador **antes del commit**:

```javascript
// ledgerController.js línea 112-119
const total = lines.reduce((sum, line) => sum + toMinorUnits(line.amount), 0);
if (total !== 0) {
    await t.rollback();
    return res.status(400).json({ error: `Transaction lines must sum to 0.` });
}
```

### Flujo Completo de una Transacción

```
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
```

### Categorías por Defecto

El sistema siembra categorías automáticamente si no existen:

**Ingresos:** Salario (Trabajo), Freelance (Trabajo), Inversiones (Pasivo), Otros Ingresos  
**Gastos:** Alimentación, Transporte, Vivienda, Servicios, Salud (Necesidades); Educación (Desarrollo); Entretenimiento, Ropa (Deseos)

---

## 4. Sistema de Presupuesto

### Definición del Presupuesto

En MagnusOS2, el presupuesto se gestiona a través de dos mecanismos:

1. **Transacciones recurrentes** en el modelo `Transaction`: cada ítem tiene `frequency` ('Mensual', 'Semanal', 'Anual') y `type` ('income'|'expense'). El presupuesto mensual total se calcula sumando todos los ingresos recurrentes y restando todos los gastos recurrentes del usuario.

2. **Seguimiento diario** con `DailyTransaction`: cada gasto real del día se registra y compara contra el presupuesto teórico.

### Fórmulas de Presupuesto (Calculadas en Frontend)

```
Ingreso Mensual Total    = SUM(transactions WHERE type='income' AND frequency='Mensual')
                         + SUM(transactions WHERE type='income' AND frequency='Semanal') × 4.33
                         + SUM(transactions WHERE type='income' AND frequency='Anual') / 12

Gasto Mensual Fijo Total = SUM(transactions WHERE type='expense' AND frequency='Mensual')

Gasto Diario Real        = SUM(dailyTransactions WHERE date=HOY AND type='expense')

Gasto Acumulado Mes      = SUM(dailyTransactions WHERE date BETWEEN inicio_mes AND HOY AND type='expense')

Presupuesto Restante     = Ingreso Mensual Total - Gasto Mensual Fijo - Gasto Acumulado Mes

Ratio Gasto/Ingreso      = Gasto Acumulado Mes / Ingreso Mensual Total × 100
```

### Estructura de Deducciones Salariales

El modelo `Transaction` incluye un campo `deductions` (JSON) para registrar:

```json
{
  "AFP":    2800.00,
  "SFS":    1400.00,
  "ISR":    3500.00,
  "Others": 0.00
}
```

Esto permite calcular el **ingreso neto real** después de deducciones obligatorias (legislación dominicana: AFP, SFS, ISR).

### Alertas de Presupuesto

Las alertas se implementan en el frontend como umbrales sobre el ratio de gasto:

```
< 70%  → Estado: VERDE  (bajo control)
70-90% → Estado: AMARILLO (atención)
> 90%  → Estado: ROJO   (sobre-gasto inminente)
= 100% → Estado: CRÍTICO (presupuesto agotado)
```

---

## 5. Sistema de Predicción Financiera

### Predicción de Fin de Mes

El cálculo de proyección usa **extrapolación lineal basada en tasa de gasto diario promedio**:

```javascript
// Pseudocódigo del cálculo de proyección
const hoy = new Date();
const diaDelMes = hoy.getDate();
const diasEnMes = new Date(año, mes + 1, 0).getDate();
const diasRestantes = diasEnMes - diaDelMes;

// Gasto diario promedio (hasta hoy)
const gastoDiarioPromedio = gastoAcumuladoMes / diaDelMes;

// Proyección aditiva lineal
const gastoProyectadoFinMes = gastoAcumuladoMes + (gastoDiarioPromedio × diasRestantes);

// Balance proyectado
const balanceProyectado = ingresoMensualTotal - gastoFijoMensual - gastoProyectadoFinMes;
```

**Modelo matemático:** Extrapolación lineal simple.

```
ĝ(T) = ĝ_actual + (ĝ_actual / d_actual) × d_restantes

donde:
  ĝ(T)      = gasto proyectado al fin del mes
  ĝ_actual  = gasto acumulado hasta hoy
  d_actual  = días transcurridos en el mes
  d_restantes = días que faltan para fin de mes
```

### Predicción de Metas de Ahorro

Para `SavingsGoal`, la proyección usa **promedio de contribuciones históricas** (`getSavingsController.js`, línea 284-303):

```javascript
// Calcular promedio mensual de contribuciones
const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);
const monthsElapsed = max(1, meses_entre(first_date, last_date));
const avgMonthly = totalContributed / monthsElapsed;

// Proyección de fecha de completado
if (avgMonthly > 0 && remaining > 0) {
    const monthsToGo = remaining / avgMonthly;
    projectedDate = addMonths(today, ceil(monthsToGo));
}

// Contribución mensual necesaria para cumplir deadline
const monthlyNeeded = remaining > 0 ? remaining / monthsLeft : 0;
```

**Modelo matemático:** Media aritmética de contribuciones × extrapolación lineal.

```
Fecha_proyectada = Hoy + ceil( Monto_restante / Promedio_mensual_contribuciones )

Contribución_mensual_necesaria = (Meta - Actual) / Meses_hasta_deadline
```

### Limitaciones Actuales del Módulo de Predicción

1. **Sin suavizado**: no usa promedio móvil ponderado (WMA) ni suavizado exponencial.
2. **Sin estacionalidad**: no modela meses con gasto mayor (diciembre, vacaciones).
3. **Sin bandas de confianza**: la predicción es puntual, sin intervalo de confianza.
4. **Sin regresión**: no hay regresión sobre series históricas largas.

---

## 6. Seguimiento Diario

### Registro Diario

El módulo usa `DailyTransaction` con estos campos clave:
- `date`: fecha del gasto (YYYY-MM-DD)
- `amount`: monto en flotante (moneda local DOP por default)
- `type`: 'income' | 'expense' | 'investment'
- `category`: categoría textual libre

### Cálculo del Gasto Diario

```javascript
// Gasto del día actual
const gastoDiario = dailyTransactions
  .filter(tx => tx.date === today && tx.type === 'expense')
  .reduce((sum, tx) => sum + tx.amount, 0);

// Tendencia (comparación día anterior)
const gastoAyer = dailyTransactions
  .filter(tx => tx.date === yesterday && tx.type === 'expense')
  .reduce((sum, tx) => sum + tx.amount, 0);

const tendencia = gastoDiario > gastoAyer ? 'up' : gastoDiario < gastoAyer ? 'down' : 'stable';
```

### Detección de Sobre-Gasto

```javascript
const presupuestoDiarioIdeal = presupuestoMensualRestante / diasRestantesEnMes;
const sobreGasto = gastoDiario > presupuestoDiarioIdeal;
```

### Seguimiento de Tasas de Cambio

El sistema incluye `CurrencyHistory` para registrar el historial de USD/DOP y EUR/DOP:

```javascript
// finanzaController.js - Cache de tasas (5 minutos)
const CACHE_DURATION = 5 * 60 * 1000; // 5 min
// Obtiene últimas 2 entradas para calcular tendencia (up/down/neutral)
const getTrend = (current, previous) => {
    const diff = current - previous;
    return { trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral', change: Math.abs(diff) };
};
```

---

## 7. Sistema de Inversiones

### Registro de Inversiones

Las inversiones se registran de dos formas:

**Vía Legacy:** `Transaction` con `type='investment'` — registra inversiones recurrentes (Criptomonedas, ETFs, etc.)

**Vía Ledger:** `LedgerTransaction` con `type='investment'` y líneas que debitan `Assets:Investments` y acreditan `Assets:Cash`

```
Ejemplo de una inversión en ledger:
LedgerTransaction { type: 'investment', date: '2026-03-07' }
  └─ TransactionLine: accountId=EFECTIVO_ID, amount_minor=-50000  (sale dinero de efectivo)
  └─ TransactionLine: accountId=INVERSIONES_ID, amount_minor=+50000 (entra a inversiones)
```

### Tipos de Cuenta para Inversiones

El modelo `Account` tiene `type = 'investment'` como opción:
```
ENUM('cash', 'checking', 'savings', 'credit_card', 'investment', 'loan')
```

### Wealth Tracking

El modelo `WealthSnapshot` registra fotografías del patrimonio en el tiempo:

```javascript
// wealthController.js
POST /api/finanza/wealth/snapshot   → createWealthSnapshot()
GET  /api/finanza/wealth/history    → getWealthHistory()
```

Esto permite calcular la **curva de crecimiento patrimonial** a lo largo del tiempo.

### Diferencia Conceptual: Gasto vs Inversión

| Concepto | Comportamiento en Ledger |
|---|---|
| Gasto | Debita Expenses:*, Acredita Assets:Cash → reduce patrimonio neto |
| Inversión | Debita Assets:Investments, Acredita Assets:Cash → transforma activo, patrimonio se mantiene |
| Ingreso | Debita Assets:Cash, Acredita Income:* → aumenta patrimonio neto |

---

## 8. Dashboard Financiero

### Módulos de UI

El frontend está organizado en 4 aplicaciones (`src/apps/`):

| App | Descripción |
|---|---|
| `finanza/` | Dashboard financiero principal, ledger, daily tracking, savings |
| `magnus/` | Dashboard personal: curriculum, checklist, mentores, calendario |
| `auditor/` | Módulo de auditoría contable, reconciliación |
| `server-admin/` | Panel soberano: gestión de usuarios, sistema, Docker |

### Indicadores del Dashboard Financiero

```
┌──────────────────────────────────────────────────────────┐
│  PRESUPUESTO MENSUAL                                     │
│  Ingreso Total:        RD$XX,XXX                         │
│  Gasto Fijo:           RD$XX,XXX                         │
│  Gasto Variable:       RD$XX,XXX  (acumulado este mes)   │
│  Presupuesto Libre:    RD$XX,XXX  [barra de progreso]    │
│                                                          │
│  PROYECCIÓN FIN DE MES                                   │
│  Gasto diario promedio: RD$X,XXX                         │
│  Proyección total mes:  RD$XX,XXX                        │
│  Balance proyectado:    RD$XX,XXX  [verde/rojo]          │
│                                                          │
│  HOY                                                     │
│  Gasto hoy:             RD$X,XXX  [tendencia ▲▼]        │
│                                                          │
│  TASAS DE CAMBIO                                         │
│  USD/DOP: 62.50 [▲ +0.25]                               │
│  EUR/DOP: 67.80 [▼ -0.10]                               │
│                                                          │
│  METAS DE AHORRO                                         │
│  Meta 1: Fondo Emergencia  ████░░ 67%  RD$XX,XXX         │
│  Meta 2: Viajes 2026       ███░░░ 45%  RD$XX,XXX         │
└──────────────────────────────────────────────────────────┘
```

### Actualización del Dashboard

1. **Polling/fetch inicial**: al cargar la app, el frontend realiza múltiples `fetch()` paralelos a las distintas APIs
2. **Socket.IO**: para eventos en tiempo real (notificaciones VIP, broadcasts del sistema)
3. **Cache de tasas**: 5 minutos en memoria del servidor para no hacer queries repetidas

---

## 9. Modelos Matemáticos Usados

### Modelos Actuales

#### 9.1 Promedio Aritmético Simple
```
Gasto_diario_promedio = ΣGastos_mes / días_transcurridos
```
Usado para: proyección fin de mes, análisis de tendencia.

#### 9.2 Extrapolación Lineal
```
Proyección_fin_mes = Gasto_acumulado + (Gasto_diario_promedio × días_restantes)
```
Asume ritmo de gasto constante. Simple pero efectiva para períodos cortos.

#### 9.3 Ratio Financiero de Progreso
```
Progress(%) = (current_amount / target_amount) × 100
```
Usado en metas de ahorro. Capped al 100%.

#### 9.4 Cálculo de Contribución Necesaria
```
monthly_needed = (target - current) / months_until_deadline
```
Planificación directa de metas.

#### 9.5 Media Histórica de Contribuciones
```
avg_monthly = total_contributed / months_elapsed
projected_date = today + ceil(remaining / avg_monthly)
```

#### 9.6 Modelo de Tendencia Simple (Tasas de Cambio)
```
trend = current_rate - previous_rate
direction = positive → "up" | negative → "down" | zero → "neutral"
```

### Precisión Numérica: Minor Units

Un punto crítico de diseño es el uso de **minor units (centavos)** para todo almacenamiento de moneda:

```javascript
// account.js
export const toMinorUnits = (amount) => Math.round(amount * 100);
export const fromMinorUnits = (minor) => minor / 100;

// Los amounts en DB son BIGINT (centavos), no FLOAT
// Esto elimina errores de punto flotante en cálculos financieros
// Ejemplo: RD$1,234.56 → se almacena 123456 (centavos)
```

### Posibles Mejoras Matemáticas

#### Suavizado Exponencial (ETS)
```
S_t = α × X_t + (1 - α) × S_{t-1}
donde α ∈ (0,1): peso de la observación actual vs histórica
```
Aplicación: predicción más suave del gasto diario, menos sensible a outliers.

#### Promedio Móvil Ponderado (WMA)
```
WMA_n = Σ(w_i × x_i) / Σw_i
donde w_i son pesos crecientes (más reciente = más peso)
```
Aplicación: tendencia de gasto que da más importancia a días recientes.

#### Regresión Lineal por OLS
```
y = β₀ + β₁ × t + ε
β₁ = Cov(t, y) / Var(t)
```
Aplicación: detectar si el gasto tiene tendencia creciente/decreciente en el mes.

#### Bandas de Confianza (Desviación Estándar)
```
IC = ȳ ± z × (σ / √n)
```
Aplicación: mostrar rango probable del gasto proyectado, no solo valor puntual.

---

## 10. Infraestructura Técnica

### Configuración Docker en Producción

```yaml
# docker-compose.yml — 4 servicios
services:
  postgres:           # PostgreSQL 16-alpine
    command: >
      postgres
        -c shared_buffers=256MB
        -c effective_cache_size=768MB
        -c work_mem=4MB
        -c maintenance_work_mem=64MB
        -c max_connections=50
        -c wal_level=minimal
        -c max_wal_senders=0
        -c synchronous_commit=off   ← sacrifica durabilidad por velocidad
        -c checkpoint_completion_target=0.9
        -c log_min_duration_statement=1000
    # Puerto 5432 NO expuesto al host (acceso solo por red interna magnus_net)

  magnus:             # App principal (Node.js 20)
    ports: ["4000:4000"]
    depends_on: postgres (condition: service_healthy)

  ollama:             # LLM local (sin puerto expuesto al host)

  sandbox:            # Python executor (aislado, para analítica)
```

### Configuración de PostgreSQL para Servidor Pequeño

Las opciones de PostgreSQL están tuneadas para RAM limitada:

| Parámetro | Valor | Propósito |
|---|---|---|
| `shared_buffers` | 256MB | Cache de páginas (25% de RAM recomendado) |
| `effective_cache_size` | 768MB | Hint al planner sobre cache disponible |
| `work_mem` | 4MB | RAM por operación de sort/hash |
| `max_connections` | 50 | Evita desbordamiento de conexiones |
| `synchronous_commit` | off | No espera fsync → más velocidad |
| `wal_level` | minimal | WAL mínimo (no replication) |

### Manejo de la Base de Datos

- **ORM:** Sequelize 6 (no Prisma, no TypeORM — elegido por madurez y flexibilidad)
- **Sync mode:** `alter: false` en producción (seguro, evita pérdida de columnas)
- **Multi-DB:** soporta PostgreSQL (prod) y SQLite (dev/test) con el mismo código
- **Índices definidos en modelo:** `user_id`, `user_id + date`, `user_id + status`, `user_id + type`

### Seguridad del Backend

```javascript
// server/middleware/security.js
app.use(securityHeaders);  // Helmet (CSP, HSTS, etc.)
app.use(apiLimiter);       // express-rate-limit
app.use(express.json({ limit: '1mb' }));  // Payload limit

// Rutas financieras: 100% protegidas con JWT
router.use(verifyJWT);

// Rutas de importación: límite extendido a 10mb (CSV/PDF)
const importBodyParser = express.json({ limit: '10mb' });
```

### Inicialización del Sistema

```javascript
// server/index.js — arranque paralelo de 3 DBs
await Promise.all([initDb(), initSystemDb(), initAuditorDb()]);
// Luego escucha en 0.0.0.0:4000 y anuncia por mDNS: http://Manus.local:4000
```

### Almacenamiento en Disco

- `./server/data/` → montado como volumen Docker (persistencia de archivos)
- `magnus_pgdata` → volumen Docker para PostgreSQL
- `ollama_data` → modelos de IA local

---

## 11. Optimización para Servidores Pequeños

### Análisis de Consumo Actual

| Servicio | RAM estimada | CPU |
|---|---|---|
| `postgres` | ~150-300MB | Bajo (queries simples) |
| `magnus` (Node.js) | ~120-200MB | Bajo-Medio |
| `ollama` | 2-6GB (depende del modelo) | Alto cuando activo |
| `sandbox` (Python) | ~50-100MB | Bajo |
| **Total activo** | **~2.4-6.6GB** | Variable |

> **Riesgo principal:** Ollama con modelos grandes puede comprometer los 8GB de RAM disponibles.

### Optimizaciones Implementadas

1. **Caché de tasas en memoria** (`ratesCache`, 5 min TTL) — evita queries repetidas
2. **Arranque paralelo de DBs** (`Promise.all`) — reduce tiempo de inicio
3. **Puerto PostgreSQL no expuesto al host** — seguridad + reduce latencia de red
4. **`synchronous_commit=off`** — mejora throughput de escritura en DB

### Optimizaciones Propuestas

#### IO / Queries
```sql
-- Añadir índice compuesto para query más común del dashboard
CREATE INDEX idx_daily_user_date_type ON "DailyTransactions" (userId, date, type);

-- Materializar el total del mes (evitar SUM en cada request)
CREATE MATERIALIZED VIEW monthly_totals AS
  SELECT userId, DATE_TRUNC('month', date) as month,
         type, SUM(amount) as total
  FROM "DailyTransactions"
  GROUP BY userId, month, type;
```

#### Caching de Dashboard
```javascript
// Propuesta: cache por usuario con TTL breve (30 segundos)
const dashboardCache = new Map(); // userId → { data, timestamp }
const DASHBOARD_TTL = 30_000;

const getDashboard = (userId) => {
  const cached = dashboardCache.get(userId);
  if (cached && Date.now() - cached.timestamp < DASHBOARD_TTL) {
    return cached.data;
  }
  // recalcular...
};
```

#### Cálculos Diferidos
- Las predicciones de fin de mes pueden calcularse en un **Worker Thread** de Node.js para no bloquear el event loop.
- Los `WealthSnapshot` pueden crearse con un job nocturno (cron) en lugar de demanda.

#### Reducción RAM de Ollama
- Usar modelos cuantizados (Q4_K_M en lugar de Q8)  
- Configurar `OLLAMA_MAX_LOADED_MODELS=1` para evitar múltiples modelos en RAM  
- Considerar ejecutar Ollama solo on-demand (no `restart: always`)

---

## 12. Filosofía HomeMade

### Por Qué Este Enfoque

MagnusOS2 sigue una filosofía explícita de **independencia tecnológica** y **control total del stack** por las siguientes razones:

1. **Privacidad financiera absoluta**: los datos del usuario nunca salen del servidor propio. No hay SaaS que pueda leer, vender o ser hackeado para exponer los datos financieros personales.

2. **Cero costos recurrentes**: el sistema opera en un VPS/servidor propio sin pagar suscripciones a herramientas financieras (YNAB, Mint, etc. cobran mensualmente).

3. **Adaptabilidad total**: cualquier feature, modelo de datos, o comportamiento puede ser modificado sin depender de un proveedor externo.

4. **Resiliencia**: el sistema funciona sin internet (excepto tasas de cambio, que también pueden ser manuales).

5. **Aprendizaje y control**: operar el propio stack financiero profundiza el entendimiento del sistema.

### Principios de Implementación HomeMade

```
✓ Preferir Node.js nativo sobre frameworks complejos (NestJS descartado por peso)
✓ Sequelize sobre Prisma (madurez, flexibilidad sin code generation)
✓ React + Vite sobre Next.js (SPA simple, sin SSR innecesario para uso privado)
✓ PostgreSQL propio vs. Supabase/PlanetScale (sin vendor lock-in)
✓ Ollama local vs. OpenAI API (sin costos por token, sin envío de datos financieros a terceros)
✓ JWT propio vs. Auth0/Clerk (control total del sistema de autenticación)
✓ Docker Compose vs. Kubernetes (apropiado para un solo servidor, sin overhead de orquestación compleja)
```

### Contrapartidas y Trade-offs

| Ventaja HomeMade | Trade-off |
|---|---|
| Total privacidad | El usuario es responsable del backup y uptime |
| Sin costos de API | Capacidad de AI limitada al hardware local |
| Control total | Mayor carga de mantenimiento |
| Sin vendor lock-in | Menos integraciones out-of-the-box |

---

## 13. Posibles Mejoras Científicas

### 13.1 Econometría Aplicada

**Series temporales de gasto personal:**
- **ARIMA(p,d,q)**: modelar el gasto mensual como serie temporal con autocorrelación. Podría detectar si el usuario consistentemente gasta más en ciertos meses.
- **SARIMA**: variante estacional para capturar patrones de gasto estacional (diciembre, vacaciones).
- **VAR (Vector Autoregression)**: modelar la relación entre ingreso, gasto e inversión simultáneamente.

### 13.2 Teoría de Control

El sistema de presupuesto puede modelarse como un **sistema de control de retroalimentación**:

```
Referencia (Set Point) = Presupuesto Mensual Planificado
Planta = Comportamiento de gasto del usuario
Controlador = Alertas + nudges del sistema
Error = Presupuesto - Gasto_actual
Actuador = Notificaciones Telegram / UI warnings
```

Un **Controlador PID** sobre el gasto diario podría calcular:
```
u(t) = Kp × e(t) + Ki × ∫e(τ)dτ + Kd × de/dt

donde:
  e(t) = presupuesto_diario_ideal - gasto_real_hoy
  Kp = ganancia proporcional (alerta inmediata)
  Ki = ganancia integral (deuda acumulada)
  Kd = ganancia derivativa (velocidad de cambio)
```

### 13.3 Optimización Matemática

**Problema de asignación de presupuesto óptimo:**
Dado un conjunto de categorías de gasto con utilidades marginales decrecientes y un presupuesto total, maximizar la utilidad total:

```
Maximizar: Σ U_i(x_i)
Sujeto a:  Σ x_i ≤ Presupuesto_total
           x_i ≥ 0  ∀i

donde U_i(x_i) = utilidad de gastar x_i en categoría i
```

### 13.4 Machine Learning Ligero

Con datos históricos de +3 meses, se pueden aplicar:

- **Regresión Lineal múltiple** (sklearn, mínima RAM): predecir gasto fin de mes usando features (día de semana, semana del mes, gastos pasados).
- **Isolation Forest**: detectar transacciones anómalas (posible fraude o error de registro).
- **K-Means clustering**: agrupar días por patrón de gasto (días de semana vs fin de semana vs quincenas).
- **Gradient Boosting (LightGBM)**: predicción de gasto mensual con alta precisión y bajo overhead.

El servicio `sandbox` (Python Docker) ya está preparado para ejecutar este tipo de código.

### 13.5 Análisis de Series Temporales con Prophet (Meta)

```python
# Ejemplo de implementación en sandbox Python
from prophet import Prophet
import pandas as pd

df = pd.DataFrame({'ds': fechas, 'y': gastos_diarios})
model = Prophet(seasonality_mode='multiplicative')
model.fit(df)
future = model.make_future_dataframe(periods=30)
forecast = model.predict(future)
```

Ventaja sobre la extrapolación lineal actual: captura tendencias no lineales y estacionalidades automáticamente.

### 13.6 Teoría de Decisión

**Multi-criteria Decision Analysis (MCDA)** para ranking de metas de ahorro:
Cuando hay múltiples metas de ahorro en competencia, un sistema de scoring que pondera urgencia, importancia y factibilidad puede sugerir cuál priorizar.

```
Score(meta_i) = w₁×urgencia_i + w₂×importancia_i + w₃×factibilidad_i
```

---

## 14. Posibles Mejoras Tecnológicas

### 14.1 Arquitectura

| Mejora | Descripción | Impacto |
|---|---|---|
| **Event Sourcing** | Registrar todos los cambios como eventos inmutables | Auditoria completa, reproducibilidad |
| **CQRS** | Separar comandos (write) de queries (read) | Optimizar lectura del dashboard |
| **Worker Threads** | Mover cálculos de predicción a hilos separados | No bloquear el event loop de Node |
| **Webhooks internos** | Sistema de eventos para acciones encadenadas | Automáticas: crear snapshot al cerrar mes |

### 14.2 Performance

| Mejora | Técnica | Ganancia estimada |
|---|---|---|
| **Vistas materializadas** | `MATERIALIZED VIEW` en PostgreSQL para totales | -80% tiempo query dashboard |
| **Redis cache** | Cache de resultados de dashboard (ya mencionado en Magnus2.0.md) | -90% queries repetidas |
| **WebSocket push** | En vez de polling, el servidor notifica cambios | -100% requests innecesarios |
| **Compresión HTTP** | `compression` middleware en Express | -60-80% tamaño respuesta JSON |
| **Connection pooling** | `pg-pool` con límite configurado | Mejor manejo de carga concurrente |

### 14.3 Base de Datos

```sql
-- Propuesta: Trigger para mantener balance de cuenta automáticamente
-- (en lugar de hacerlo desde el ORM, más seguro y atómico)
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE accounts
  SET current_balance_minor = current_balance_minor + NEW.amount_minor
  WHERE id = NEW.account_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_transaction_line_insert
  AFTER INSERT ON transaction_lines
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();
```

```sql
-- Propuesta: Constraint de suma cero a nivel DB (más robusto que a nivel app)
CREATE OR REPLACE FUNCTION check_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE balance BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount_minor), 0) INTO balance
  FROM transaction_lines WHERE transaction_id = NEW.transaction_id;
  -- Validar solo cuando la transacción esté 'committed' (usar DEFERRABLE)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 14.4 Cálculo Financiero

| Mejora | Descripción |
|---|---|
| **Soporte multi-moneda real** | El modelo ya tiene `fx_rate` pero no hay conversión automática al calcular totales |
| **Reportes PDF** | Generar reportes mensuales exportables (jsPDF en frontend o puppeteer en backend) |
| **Importación bancaria** | Parsear extractos bancarios de bancos dominicanos (BHD, Popular, BanReservas) |
| **Reconciliación automática** | Matching automático de importaciones con transacciones existentes |

---

## 15. Roadmap de Evolución

### Corto Plazo (1-3 meses) — Consolidación Core

**Objetivo:** Hacer el sistema completamente funcional y confiable para uso diario.

- [ ] **Integrar `savingsRate`** con el ledger real (actualmente retorna placeholder)
- [ ] **Dashboard unificado**: mostrar datos de ambos sistemas (legacy + ledger) en un solo panel
- [ ] **Suavizado exponencial simple** en la predicción de fin de mes (reemplazar extrapolación lineal cruda)
- [ ] **Alertas Telegram**: enviar notificaciones automáticas cuando el ratio de gasto supera umbrales
- [ ] **Backup automático diario**: script de `pg_dump` + almacenamiento en directorio seguro
- [ ] **Compresión HTTP**: agregar middleware `compression` en Express para reducir ancho de banda
- [ ] **Mover cálculos de predicción a endpoint propio** (`/api/finanza/prediction`) para separar concerns

### Mediano Plazo (3-9 meses) — Analítica Avanzada

**Objetivo:** Capacidades predictivas y analíticas reales basadas en datos históricos acumulados.

- [ ] **Vista materializada mensual** en PostgreSQL para acelerar 10x el dashboard
- [ ] **Redis cache** para `dashboard` y `prediction` endpoints (TTL: 60 segundos)
- [ ] **Promedio móvil ponderado (WMA)** para predicción de gasto: últimos 7 días con peso decreciente
- [ ] **Categorización automática via ML ligero** (modelo entrenado sobre historial del usuario con scikit-learn en sandbox Python)
- [ ] **Detección de anomalías** (Isolation Forest) para flaggear transacciones inusuales
- [ ] **Reporte mensual automático**: PDF generado el día 1 de cada mes con resumen financiero
- [ ] **Reconciliación bancaria**: importación de CSV de bancos locales con matching automático
- [ ] **Multi-moneda real**: conversión automática de USD/EUR a DOP usando `fx_rate` almacenado

### Largo Plazo (9-24 meses) — Financial AI Personal

**Objetivo:** Convertir MagnusOS2 en un asesor financiero personal inteligente.

- [ ] **AI Analyst real** con contexto completo del ledger: el modelo Ollama local recibe datos reales estructurados y puede responder preguntas como "¿En qué categoría gasto más los viernes?"
- [ ] **Forecasting ARIMA** en Python Sandbox para predicciones de 3-6 meses
- [ ] **Optimizador de presupuesto**: dado el historial de utilidad por categoría, sugerir asignación óptima
- [ ] **API de integración bancaria** (si los bancos locales exponen API): automatizar ingesta de movimientos
- [ ] **Análisis de "fecha de libertad financiera"**: dado el patrimonio actual, tasa de crecimiento y gastos, predecir cuándo el usuario puede vivir de sus inversiones
- [ ] **Módulo de impuestos DOP**: calcular ISR anual basado en ingresos registrados, con desglose AFP/SFS
- [ ] **Soporte multi-usuario completo**: migrar de user hardcoded `soberano` a sistema real multi-tenant
- [ ] **App móvil PWA**: convertir la SPA en Progressive Web App instalable con push notifications

---

## Apéndice A: Resumen de Endpoints API

### Autenticación
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/validate
```

### Finanzas — Ledger (v2, activo)
```
GET    /api/finanza/ledger                          ← lista transactions con filtros
POST   /api/finanza/ledger/transactions             ← crear transaction (double-entry)
PATCH  /api/finanza/ledger/transactions/:id         ← actualizar header
DELETE /api/finanza/ledger/transactions/:id         ← eliminar + reversal de balance
PATCH  /api/finanza/ledger/transactions/:id/status  ← reconciliación
POST   /api/finanza/transfers                       ← transferencia entre cuentas
```

### Finanzas — Cuentas
```
GET    /api/finanza/accounts
POST   /api/finanza/accounts
PATCH  /api/finanza/accounts/:id
DELETE /api/finanza/accounts/:id
GET    /api/finanza/accounts/:id/balance
POST   /api/finanza/accounts/reorder
```

### Finanzas — Metas de Ahorro
```
GET    /api/finanza/savings-goals
POST   /api/finanza/savings-goals
PATCH  /api/finanza/savings-goals/:id
DELETE /api/finanza/savings-goals/:id
POST   /api/finanza/savings-goals/:id/contribute
GET    /api/finanza/savings-goals/:id/progress      ← incluye proyección de fecha
GET    /api/finanza/savings-rate
```

### Finanzas — Legacy (en deprecación progresiva)
```
GET/POST/PUT/DELETE  /api/finanza/transactions
GET/POST/PUT/DELETE  /api/finanza/daily-transactions
GET/POST             /api/finanza/rates
GET                  /api/finanza/rates/history
```

### Finanzas — Wealth & Import
```
GET    /api/finanza/wealth/history
POST   /api/finanza/wealth/snapshot
GET    /api/finanza/import/templates
POST   /api/finanza/import/preview
POST   /api/finanza/import
POST   /api/finanza/import/categorize
```

### Otros
```
GET  /api/health              ← healthcheck Docker
/socket.io                    ← WebSocket endpoint (Socket.IO)
```

---

## Apéndice B: Diagrama de Modelos de Datos

```
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
System (base de datos separada — curriculum, misiones, mentores, checklist)
```

---

## Apéndice C: Variables de Entorno Requeridas

```env
# Database
DATABASE_URL=postgresql://magnus:PASSWORD@postgres:5432/magnus
POSTGRES_DB=magnus
POSTGRES_USER=magnus
POSTGRES_PASSWORD=CHANGE_ME

# API
JWT_SECRET=CHANGE_ME_MIN_32_CHARS
PORT=4000
NODE_ENV=production

# CORS (para producción)
CORS_ORIGINS=http://tu-dominio.com,https://tu-dominio.com
```

---

*Fin del documento. Generado a partir del análisis del código fuente real de MagnusOS2 en `/home/osvaldo/proyectos/sistema-m/Magnus-OS2/` — Marzo 2026.*
