# MAGNUSOS2

## Auditoría técnica del sistema en ejecución

**Proyecto:** Providence  
**Fecha:** 4 de octubre de 2026, 11:37 UTC  
**Servidor:** `providence`  
**Repositorio:** `/home/osvaldo/proyectos/sistema-m/Magnus-OS2`  
**Commit:** `53ee472d5d9501202b1503fd4816143eb3187b2e`  
**Branch:** `main`  
**Estado Git al inicio:** limpio; `main` coincidía con la referencia local conocida de `origin/main` (`0 ahead / 0 behind`, sin ejecutar `fetch` ni `pull`)  
**Código inspeccionado:** aproximadamente 49,936 líneas en `src/` y `server/`

---

## Alcance y método

La auditoría se realizó sobre el sistema real en ejecución, usando la documentación únicamente como hipótesis. Se contrastaron:

```text
Documentación
    ↓
Código
    ↓
Configuración
    ↓
PostgreSQL / SQLite
    ↓
Contenedores y red
    ↓
Logs y comportamiento HTTP/WebSocket
```

Se inspeccionaron repositorio Git, árbol de fuentes, frontend, backend, endpoints, modelos, esquema real, ledger, precisión monetaria, FX, jobs, WebSockets, autenticación, Docker, volúmenes, redes, logs, consumo de recursos, dependencias y tests.

No se modificaron código, configuración, contenedores, migraciones ni saldos. Los secretos se mantuvieron censurados.

### Incidente de observación

Dos consultas de comprobación a `GET /api/markets` provocaron cuatro escrituras inesperadas en `CurrencyHistories` —USD y EUR por consulta— alrededor de las 11:34 UTC. El endpoint, pese a ser una operación GET, ejecuta `CurrencyHistory.create(...)`. Las filas no se eliminaron ni se alteraron posteriormente.

Este efecto lateral forma parte de los hallazgos: una carga normal de la UI y su polling pueden escribir repetidamente en PostgreSQL.

---

# 1. Resumen ejecutivo

MAGNUSOS2 está operativo y contiene una base funcional considerable: frontend modular, API Express, PostgreSQL, un ledger nuevo en centavos, ingestión FX por múltiples proveedores, jobs de contexto económico y un sandbox Python opcional.

El sistema responde con rapidez y consume pocos recursos. La arquitectura Docker es apropiada para un sistema personal/self-hosted y no necesita una migración hacia Kubernetes, Kafka o microservicios masivos.

Sin embargo, su nivel de confianza financiera y de seguridad es bajo por cuatro problemas estructurales:

1. **Autenticación sin autorización suficiente.** Varios controladores aceptan `userId` desde el cliente y no lo comparan con el usuario autenticado. Un usuario autenticado puede actuar sobre datos de otro usuario, modificar perfiles y potencialmente elevar privilegios.
2. **WebSockets sin autenticación.** El chat, las conversaciones privadas, los broadcasts y el namespace Docker aceptan identidad y comandos suministrados por el cliente.
3. **El ledger no es la fuente única de verdad.** Los paneles principales siguen dependiendo de `Transactions` y `DailyTransactions`, almacenadas con `DOUBLE PRECISION`. El ledger nuevo está actualmente cuadrado, pero PostgreSQL no impone la suma cero.
4. **Garantías operativas insuficientes.** PostgreSQL utiliza `synchronous_commit=off`, la cuenta de aplicación es superusuario, las copias permanecen en el mismo disco y tienen permisos de lectura amplios.

No se encontró corrupción actual en el ledger: las 28 transacciones tienen dos líneas, todas suman cero y los tres saldos cacheados coinciden con el cálculo del ledger. Esto es positivo, pero actualmente es una propiedad de los datos, no una garantía del sistema.

### Clasificación global

- 🔴 **P0 — Crítico:** autorización horizontal/vertical, autenticación WebSocket, invariantes contables y durabilidad financiera.
- 🟠 **P1 — Importante:** sandbox, backups, migraciones, duplicación de tasas, dependencias vulnerables, errores econométricos e inicialización concurrente.
- 🟡 **P2 — Mejora:** tests, observabilidad, componentes grandes y duplicidad de servicios frontend.
- 🟢 **P3 — Evolución:** Home dinámico, mejoras UX y consolidación futura.

---

# 2. Servidor y repositorio

## Host

| Recurso | Estado observado |
|---|---|
| Hostname | `providence` |
| Sistema operativo | Ubuntu 26.04.1 LTS |
| Kernel | Linux 7.0.0-34 |
| Arquitectura | x86_64 |
| Equipo | Dell Latitude E6410 |
| CPU | Intel Core i5 M 520, 2 cores / 4 threads |
| RAM | 7.2 GiB; aproximadamente 3.5 GiB disponibles |
| Swap | 4 GiB; prácticamente sin uso |
| Disco raíz | 455 GiB; 348 GiB disponibles, 21% utilizado |

El host no presentaba presión inmediata de memoria, swap o almacenamiento.

## Git

- Rama activa: `main`.
- Último commit: `53ee472d5d9501202b1503fd4816143eb3187b2e`.
- Fecha del commit: `2026-10-04T00:37:47Z`.
- Mensaje: `feat(finanza): modernizar y animar menú lateral con física de resorte y micro-interacciones`.
- Working tree inicialmente limpio.
- Remote: repositorio GitHub vía SSH.
- No se ejecutó `pull`, `push`, `reset`, `checkout` ni `clean`.
- La divergencia `0/0` corresponde a la referencia remota local; no se ejecutó `fetch` para actualizarla.

## Estructura real

```text
Magnus-OS2
├── src
│   ├── apps
│   │   ├── landing
│   │   ├── magnus
│   │   ├── finanza
│   │   ├── auditor
│   │   └── server-admin
│   ├── shared
│   ├── context
│   └── __tests__
├── server
│   ├── config
│   ├── controllers
│   ├── routes
│   ├── services
│   │   ├── fx
│   │   ├── macro
│   │   └── energy
│   ├── models
│   ├── jobs
│   ├── socket
│   ├── scripts
│   └── data
├── scripts
├── tests
├── docs
├── Dockerfile.api
├── Dockerfile.sandbox
└── docker-compose.yml
```

---

# 3. Arquitectura real

```text
                            PROVIDENCE
       Ubuntu 26.04.1 / x86_64 / 2C-4T / RAM 7.2 GiB
                                  │
                        Docker Engine 29.1.3
                                  │
                 Puerto host 4000 — HTTP sin TLS
                                  │
                    ┌─────────────▼─────────────┐
                    │     magnus_os2_app        │
                    │ Node 20.20.2 / Express 4  │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │ React 18 / Vite 7   │  │
                    │  │ dist/ servido       │  │
                    │  │ estáticamente       │  │
                    │  └─────────────────────┘  │
                    │                           │
                    │ REST API + Socket.IO      │
                    │ jobs cron en proceso Node │
                    └───────┬───────────┬───────┘
                            │           │
       magnus-os2_magnus_net│           │
       bridge, no interna   │           │
             ┌──────────────▼──┐   ┌────▼────────────────┐
             │ magnus_postgres │   │ magnus_sandbox      │
             │ PostgreSQL 16.15│   │ Flask + Python 3.11 │
             │ volumen Docker  │   │ pandas/numpy/       │
             │                 │   │ statsmodels/scipy   │
             └─────────────────┘   └─────────────────────┘
                    │                         │
          35 tablas PostgreSQL        bind RW server/data/sandbox
                    │
      auditor.db SQLite activo aparte

Servicios externos:
  Gemini 2.5 Flash ── análisis financiero
  TasaReal / InfoDolar / BCRD / Yahoo ── FX
  open.er-api.com ── tasa legacy diaria
  MICM / BCRD ── energía y macroeconomía
  worldtimeapi.org ── reloj del frontend

Opcional y actualmente ausente:
  Ollama / qwen2:0.5b
```

El contenedor `magnus_portal` de Providence pertenece a otro proyecto Compose, está en otra red y no funciona como reverse proxy de MAGNUSOS2. La URL comprobada es `http://providence.local:4000`.

---

# 4. Stack real

## Frontend

- React 18.2.
- TypeScript en modo estricto.
- Vite 7.3.1.
- React Router 6.30.
- Tailwind CSS 3.4.
- Framer Motion.
- Lucide React.
- Recharts.
- i18next.
- Socket.IO Client.
- Estado mediante React contexts; no se encontró Redux/Zustand.

## Backend

- Node.js 20.20.2.
- Express 4.19.2.
- Sequelize 6.37.7.
- JWT con `jsonwebtoken`.
- `bcryptjs` para hashing.
- Helmet, CORS y express-rate-limit.
- Multer para uploads.
- Socket.IO.
- Jobs con `node-cron`.

## Persistencia

- PostgreSQL 16.15 como base principal.
- SQLite activo para el módulo Auditor.
- Archivos SQLite legacy conservados en `server/data`.
- Sin sistema formal de migraciones versionadas.

## Dependencias y solapamiento

- `body-parser` está declarado pero no se encontró importado; Express ya proporciona parsers integrados.
- `@types/jsonwebtoken` y `@types/seedrandom` están en dependencias productivas, aunque deberían ser dependencias de desarrollo.
- `boxen`, `chalk`, `figlet` y `gradient-string` se usan únicamente en scripts/launchers, pero se instalan en la imagen productiva.
- MCP SDK está instalado para `server/mcp-server.js`, proceso que no está ejecutándose como parte de la aplicación web.
- `sqlite`/`sqlite3` siguen siendo necesarios para Auditor y migraciones legacy.
- `dockerode` está activo en código, pero no puede operar sin Docker socket.
- Existen dos implementaciones divergentes del servicio de autenticación frontend.

---

# 5. Docker y Providence

## Contenedores MAGNUSOS2

| Contenedor | Imagen | Estado | Exposición | Memoria observada | Restart policy |
|---|---|---|---|---:|---|
| `magnus_os2_app` | `magnus-os2-magnus` | Healthy | `0.0.0.0:4000`, IPv6 | 105.6 MiB | `unless-stopped` |
| `magnus_postgres` | `postgres:16-alpine` | Healthy | Solo red Docker `5432` | 47.6 MiB | `always` |
| `magnus_sandbox` | `magnus-os2-sandbox` | Running, sin healthcheck | Solo red Docker `5000` | 30.4 MiB | `unless-stopped` |

## Red y almacenamiento

- Red: `magnus-os2_magnus_net`.
- Driver: bridge.
- `Internal=false`: permite salida de red.
- PostgreSQL utiliza un volumen Docker persistente.
- App monta `server/data` en modo RW.
- App monta `/home/osvaldo/backups/magnus-os2` en modo RW.
- Sandbox monta `server/data/sandbox` en modo RW.

## Aspectos correctos

- PostgreSQL no expone `5432` al host.
- Dependencia de app a PostgreSQL con healthcheck.
- Volumen persistente para la base.
- Restart policies configuradas.
- Ollama deshabilitado por profile.

## Riesgos

- No existen límites de CPU, memoria o PID.
- App y sandbox ejecutan como `root`.
- Root filesystem escribible.
- Sandbox sin healthcheck y con servidor Flask de desarrollo.
- Puerto 4000 publicado en todas las interfaces IPv4/IPv6.
- No existe TLS delante de MAGNUSOS2.
- App y PostgreSQL son single points of failure.
- Uploads se guardan en `/app/public`, directorio ausente en la imagen y no persistente.
- El panel Docker espera `/var/run/docker.sock`, pero no está montado.

---

# 6. Sistema en ejecución

## Comprobaciones HTTP

| Recurso | Resultado |
|---|---|
| `/` | HTTP 200 |
| `/home` | HTTP 200, SPA fallback |
| `/api/health` | HTTP 200, ~3 ms |
| `/api/markets` | HTTP 200, ~0.8 s y con efecto lateral DB |
| `/api/notifications` | HTTP 200 sin JWT |
| `/api/finanza/accounts` | HTTP 401 sin JWT |
| `/api/users` | HTTP 401 sin JWT |
| `/api/system/stats` | HTTP 401 sin JWT |
| `/api/does-not-exist` | HTTP 401 por middleware financiero |

El healthcheck es superficial: devuelve `status: ok`, pero no comprueba PostgreSQL, sandbox, providers ni jobs. Existe además otro controller de health que queda oculto por el handler directo anterior.

Los archivos estáticos se sirven antes de Helmet. La raíz devuelve `X-Powered-By: Express` y carece de los headers de seguridad que sí aparecen en la API.

Socket.IO permite handshake sin token y anuncia upgrade a WebSocket.

---

# 7. Frontend

## Mapa real

```text
App / BrowserRouter
├── Landing pública
├── Login / registro
├── Home principal de MAGNUSOS2
├── Sabiduría Magnus
│   ├── Dashboard
│   ├── Mentorship Room
│   ├── Publications
│   ├── Laboratory
│   └── Style Lab
├── Finanzas
│   ├── Centro de Comando
│   ├── Dashboard legacy
│   ├── Flujo de caja
│   ├── Patrimonio
│   ├── Mercado
│   ├── Seguimiento
│   ├── Proyecciones
│   ├── Cuentas
│   ├── Ahorros
│   ├── Libro mayor
│   └── Importador
├── Server Admin
└── Auditor
    └── Código conservado, ruta redirigida a Home
```

## Home de MAGNUSOS2

El Home principal está correctamente separado de Magnus Capital/Finanzas.

### Confirmado

- Reloj y saludo contextual.
- Header, ajustes, chat y panel administrativo.
- Iconos Magnus/Finanzas configurables mediante preferencias.
- Tarjetas “Sabiduría Magnus”, “Finanzas” y “En Construcción”.
- Auditor existe en código, pero su ruta está deshabilitada.
- Intro y novedades obtenidas del backend.
- Layout responsive con grid de una a tres columnas.
- Lazy loading de aplicaciones principales.

### Hardcoded

- Inventario de módulos, títulos, descripciones, rutas y estados.
- Estado “En Construcción”.
- Versión visible `v2.0`.
- Fondo remoto de `grainy-gradients.vercel.app`.

### Evolución recomendada sin rediseñar

- Extraer un componente `ModuleCard`.
- Crear un catálogo declarativo de módulos con `id`, ruta, icono, estado y feature flag.
- Obtener disponibilidad operativa desde el backend.
- Conservar preferencias visuales del usuario como override.
- Añadir `aria-label` a controles de icono.
- Separar saludo/reloj, catálogo y paneles modales.

## Errores frontend

- `Ledger.tsx` usa `fetch` nativo para cuentas y omite JWT; la solicitud recibe `401`.
- `CronologiaHeader.tsx` llama a `/api/ledger/investments`, endpoint inexistente.
- El registro no recibe token del backend; la UI queda “autenticada” localmente hasta que la primera API provoca logout.
- `/admin/*` verifica solamente que exista un usuario local, no su rol.
- `ViewState.STYLE_LAB` aparece dos veces en el mismo switch.
- `TimeContext` consulta `worldtimeapi.org` hasta cuatro veces y actualiza el reloj cada segundo.
- `HashRouter`, `ThemeToggle` y otros imports están sin uso.

## Componentes grandes

| Archivo | Líneas aproximadas | Observación |
|---|---:|---|
| `MarketIntel.tsx` | 1,406 | UI, red, gráficos y estado mezclados |
| `CashFlow.tsx` | 1,065 | Alta complejidad y difícil testabilidad |
| `FxMercadoModal.tsx` | 971 | Presentación y lógica FX acopladas |
| `PrintReport.tsx` | 695 | Render y transformación mezclados |
| `Login.tsx` | 659 | Login, registro, diseño y flujo local juntos |
| `DeepAnalysisPanel.tsx` | 646 | IA, snapshots y UI en un componente |
| `Projections.tsx` | 605 | Modelo, red y visualización acoplados |

El chunk `vendor-ui` mide aproximadamente 1.03 MB sin comprimir.

---

# 8. Backend y API

## Flujo real

```text
Express routes
    ↓
Controllers
    ↓
Services parciales
    ↓
Sequelize models / SQLite directo
    ↓
PostgreSQL + auditor.db
```

FX, energía, macroeconomía y econometría tienen una separación service/controller razonable. Finanzas, usuarios, imports e IA concentran demasiada lógica en controllers.

## Endpoints agrupados

| Método | Ruta | Auth efectiva | Responsable |
|---|---|---|---|
| POST | `/api/login`, `/api/register` | Pública + rate limit | Auth / `User` |
| GET | `/api/health` | Pública | Handler directo |
| GET/POST | `/api/markets/energy[-rd]/*` | Pública | Energía/MICM |
| GET/POST | `/api/markets/macro/*` | GET pública; refresh opcional | Macro/BCRD |
| GET/PATCH/POST | `/api/notifications/*` | Pública | Notificaciones macro |
| GET/POST | `/api/markets/*`, `/api/telemetry/markets/*` | Pública; refresh opcional | Mercado/FX |
| CRUD | `/api/finanza/accounts/*` | JWT | Accounts |
| CRUD | `/api/finanza/ledger*` | JWT | Ledger |
| POST | `/api/finanza/transfers` | JWT | Ledger |
| CRUD | `/api/finanza/savings-goals/*` | JWT | Savings |
| GET | `/api/finanza/savings-rate` | JWT | Savings |
| GET/POST | `/api/finanza/import/*` | JWT | Importador |
| GET/POST | `/api/wealth/*` | JWT | Patrimonio |
| CRUD | `/api/transactions/*` | JWT | Finanzas legacy |
| CRUD | `/api/daily-transactions/*` | JWT | Finanzas legacy |
| GET/POST | `/api/rates/*` | JWT | Tasas legacy |
| CRUD | `/api/users/*` | JWT, sin rol | Usuarios |
| GET/POST | `/api/mentors`, `/data`, `/checklist`, `/calendar` | JWT, sin rol | Magnus |
| CRUD | `/api/curriculum/*` | JWT, sin rol | Magnus |
| CRUD | `/api/publications/*` | Lectura JWT; escritura admin | Publications |
| GET/POST | `/api/system/stats`, `/updates`, `/upload`, `/settings/banners` | JWT, sin rol | Sistema |
| CRUD | `/api/system/backups/*` | JWT + admin | Backup |
| POST | `/api/system/broadcast` | JWT + admin | Broadcast |
| CRUD | `/api/auditor/*` | JWT incidental | SQLite Auditor |
| POST/GET | `/api/telegram/*` | JWT incidental | Telegram |
| POST/GET/DELETE | `/api/ai/*` | JWT | Gemini/Ollama/sandbox |
| GET | `/api/centro-comando/*` | JWT | Centro de Comando |
| GET/POST | `/api/econometrics/*` | JWT | Econometría |

“JWT incidental” significa que la ruta no declara protección propia. Recibe autenticación solo porque el router financiero, montado anteriormente en `/`, intercepta cualquier ruta posterior. Esto explica que incluso una ruta inexistente devuelva `401`.

---

# 9. Base de datos

## Estado real

- PostgreSQL 16.15.
- 35 tablas en el esquema `public`.
- Sequelize 6.37.7.
- SQLite activo para `auditor.db`.
- `finanza.db` y `magnus_system.db` permanecen como archivos legacy.
- No existe un sistema normal de migraciones versionadas.
- El arranque utiliza `sequelize.sync()`.

## Tablas por dominio

- Usuarios/sistema: `Users`, `Mentors`, `Messages`, `CurriculumModules`, `Missions`, `Publications`, `SystemUpdates`, `UserCalendars`, `UserChecklists`, `app_settings`, `telegram_links`.
- Finanzas legacy: `Transactions`, `DailyTransactions`, `CurrencyHistories`, `WealthSnapshots`.
- Ledger: `accounts`, `categories`, `payees`, `ledger_transactions`, `transaction_lines`, `savings_goals`, `savings_contributions`.
- Analítica: `monthly_snapshots`, `financial_anomalies`.
- Mercado: `fx_rate_observations`, `fx_provider_healths`, tablas macro, energía, eventos y notificaciones.

## Hallazgos

- `[ERROR · P1]` `initDb()` e `initSystemDb()` ejecutan `.sync()` concurrentemente sobre la misma conexión PostgreSQL.
- `[ERROR · P1]` `telegram_links` tiene 55 índices únicos equivalentes sobre `chatId`.
- `[RIESGO · P0]` La cuenta `magnus` es superusuario, puede crear roles/bases y saltarse RLS.
- `[IMPLEMENTACIÓN DIFERENTE]` El modelo declara `transaction_id` y `account_id` no nulos, pero el esquema real permite `NULL`.
- `[RIESGO · P1]` `user_id` del ledger no tiene FK a `Users`.
- `[RIESGO · P1]` `SavingsContribution.transactionId` no tiene FK.
- `[DEUDA]` `Users.tags_old` y `preferences_old` siguen presentes.
- `[RIESGO · P1]` No existe control formal de deriva modelo/schema.

Los logs muestran colisiones en índices y catálogos PostgreSQL durante sincronizaciones. También muestran repetidamente `column Account.status does not exist`.

---

# 10. Ledger e integridad financiera

## Estado observado

| Comprobación | Resultado |
|---|---:|
| Transacciones ledger | 28 |
| Líneas | 56 |
| Líneas por transacción | Exactamente 2 |
| Transacciones con suma distinta de cero | 0 |
| Cuentas | 3 |
| Saldos cacheados divergentes | 0 |
| Líneas con cuenta | 28 |
| Líneas con categoría | 28 |
| Líneas sin cuenta ni categoría | 0 |

**CONFIRMADO:** los datos actuales están cuadrados.

## Fuente de verdad real

```text
Dashboards / CashFlow / Savings / Econometrics
                  ↓
      Transactions + DailyTransactions
          DOUBLE PRECISION legacy

Accounts / Ledger / Import
                  ↓
 ledger_transactions + transaction_lines
              BIGINT cents
```

La afirmación documental “el ledger manda” está implementada solo parcialmente.

## Riesgos críticos

- La suma cero se valida únicamente en el controller.
- No existe trigger, constraint diferido ni procedimiento DB que impida una transacción desbalanceada.
- La validación puede saltarse mediante SQL, scripts, Sequelize directo o futuros jobs.
- Operaciones por ID no comprueban propiedad.
- No se comprueba que las cuentas de una transferencia pertenezcan al usuario.
- No se valida compatibilidad de monedas.
- El saldo cacheado se actualiza con read-modify-write sin lock.
- Modificar `openingBalance` no recalcula `currentBalance`.
- El endpoint de balance ignora `asOf` y devuelve únicamente el caché.
- El importador crea ambas líneas sobre la misma cuenta y actualiza el saldo con una sola.
- PostgreSQL utiliza `synchronous_commit=off`.

## Precisión monetaria

- Ledger nuevo: `BIGINT` en centavos.
- `transaction_lines.fx_rate`: `NUMERIC(12,6)`.
- Legacy: importes, patrimonio, tasas y anomalías usan `DOUBLE PRECISION`.

Clasificación:

- **ERROR REAL:** persistencia monetaria legacy en flotantes.
- **RIESGO POTENCIAL:** `Math.round(amount * 100)` sin validar `NaN`, rango ni moneda.
- **USO SEGURO UI:** `toFixed` utilizado solo para presentar.
- **RIESGO:** Sequelize puede devolver `BIGINT` como string y el operador `+` puede concatenar si no se normaliza.

---

# 11. Autenticación y seguridad

## Crítico

### Escalada de privilegios y modificación arbitraria de usuarios

`magnusController.updateUser` pasa el body completo a `user.update()`. Cualquier usuario autenticado puede intentar cambiar rol, contraseña u otros campos de cualquier usuario.

### Reset de contraseña basado en identidad declarada

`authController.updatePassword` verifica que el `adminUsername` enviado en el body pertenezca a un admin, pero no comprueba que coincida con `req.user`.

### IDOR financiero

Cuentas, ledger, ahorros, imports, patrimonio, econometría e IA aceptan `userId` del cliente y no lo comparan con `req.user.username`.

### Socket.IO sin autenticación

El servidor permite:

- Conexión sin JWT.
- Elegir el username de `join`.
- Enviar mensajes como cualquier usuario.
- Solicitar historias privadas indicando dos usernames.
- Emitir `admin:broadcast` sin rol.

### Namespace Docker sin autenticación

El namespace `/docker` expone listado, métricas y terminal sin autorización. Actualmente no puede controlar Docker porque el socket no está montado, pero sería crítico si se habilitara en ese estado.

## Alto

- Notificaciones pueden marcarse como leídas sin autenticación.
- Refresh FX/macro y sync energía pueden dispararse sin autenticación.
- `/api/markets` público escribe en DB.
- Sandbox ejecuta Python arbitrario como root, con red, bind RW y sin límites.
- Snapshots mensuales no tienen `user_id`.
- IA puede construir contexto usando cualquier `userId` y enviarlo a Gemini.
- IA registra username y los primeros 50 caracteres del mensaje.
- `.env` tiene permisos `0664`; contiene secretos, mantenidos censurados en este reporte.
- Backups tienen permisos `0644/0664`.
- Cuenta PostgreSQL de aplicación superusuario.
- JWT almacenado en `localStorage`.
- Sin refresh tokens ni revocación.
- Login distingue “usuario inexistente” de “contraseña incorrecta”.
- Compatibilidad con contraseñas legacy en texto plano hasta el siguiente login.

## Dependencias

`npm audit --omit=dev` reportó:

| Severidad | Cantidad |
|---|---:|
| Crítica | 2 |
| Alta | 22 |
| Moderada | 13 |
| Baja | 2 |
| Total | 39 |

Incluye avisos en Sequelize, Socket.IO/Engine.IO, Express/routing, express-rate-limit, Multer y dependencias transitivas. El reporte requiere triaje; no implica que todos los avisos sean explotables en esta configuración.

## Medio/bajo

- CSP permite `'unsafe-inline'` y `'unsafe-eval'`.
- HSTS está desactivado.
- Estáticos se sirven antes de Helmet.
- `CORS_ORIGINS=*` se convierte en lista `['*']` y no autoriza orígenes reales como se esperaría.
- `/admin` depende de estado en localStorage.

---

# 12. Backups

- Existe un cron de usuario a las 03:00 UTC.
- Existe un panel de backup manual con `pg_dump` disponible dentro del contenedor.
- La última copia encontrada es del 27 de septiembre de 2026.
- La última copia supera `gzip -t`.
- No se encontró log de ejecuciones del cron.
- El host arrancó después de las 03:00 el día de la auditoría, por lo que no puede concluirse que el cron esté roto solo por la ausencia del backup de ese día.
- Las copias están en el mismo filesystem que el sistema.
- Permisos observados: `0644/0664`, por lo que otros usuarios locales pueden leerlas.
- No se encontró evidencia de restore drill ni copia externa.

Clasificación: `[RIESGO · P1]`. La copia existe, pero recuperación, privacidad y continuidad no están suficientemente garantizadas.

---

# 13. FX y multimoneda

## Arquitectura real

```text
TasaReal ─┐
InfoDolar ├── Normalizer ── Validator/Consolidator ── SWR cache
BCRD ─────┤                                         │
Yahoo ────┘                                         ▼
                                             PostgreSQL
                                                 │
                                                 ▼
                                             API / UI
```

## Aspectos bien diseñados

- Providers independientes.
- Normalización canónica de instituciones.
- USD/DOP y EUR/DOP separados.
- Compra, venta, midpoint, spread, timestamps y health.
- Cache SWR y single-flight por proceso.
- Fallback desde PostgreSQL.
- Circuit breaker y reintentos.

## Problemas

- Al persistir consolidación se almacena solo el primer provider y se pierde atribución completa.
- No hay unique constraint natural para observaciones FX.
- BCRD falló en intentos recientes; otros providers/fallback mantienen servicio.
- Coexisten Providence FX, `CurrencyHistories` legacy y Yahoo/mercado.
- El fallback EUR contiene referencias hardcoded.
- `GET /api/markets` muta `CurrencyHistories`.
- El refresh público puede forzar tráfico externo y escrituras.
- `CurrencyHistories` tenía 944 filas, con hasta 215 registros por moneda/día.

---

# 14. IA, Ollama y sandbox

- Ollama no está ejecutándose.
- No existe CLI local ni listener en `11434`.
- El contenedor está definido bajo profile deshabilitado.
- Gemini 2.5 Flash es el motor primario configurado.
- Ollama `qwen2:0.5b` es fallback.
- MAGNUSOS2 financiero arranca y opera sin Ollama.
- Sin Gemini ni Ollama, falla la función IA, no el núcleo financiero.

**Conclusión:** MAGNUS CORE puede operar sin MAGNUS AI local.

La documentación que afirma que los datos nunca salen del servidor no coincide con la implementación: contextos financieros pueden enviarse a Gemini.

## Sandbox

- Python 3.11.
- pandas, NumPy, Matplotlib, requests, Flask, statsmodels y SciPy.
- Endpoint `/execute` sin autenticación interna.
- Código arbitrario escrito a un archivo compartido `temp_exec.py`.
- Timeout de 30 segundos, pero sin memoria/PID/CPU limits.
- Contenedor root, con red y bind RW.
- Dos ejecuciones concurrentes pueden colisionar sobre el mismo archivo.

---

# 15. Econometría

## Implementado

- MPC.
- Agregación mensual y diaria.
- Forecast de liquidez.
- Detección de anomalías.
- Implementación productiva en JavaScript/Node.

## No implementado o no conectado

- Los cálculos productivos no usan Python ni statsmodels.
- Scikit-learn no está instalado.
- No se encontró ARIMA productivo.
- `monthlyAnalysisJob.js` contiene un cron, pero no se importa en `server/index.js`.
- El job agrega transacciones de todos los usuarios y genera un snapshot global por período.

## Bug confirmado

`econometricsController` consulta `Account.status = 'active'`, columna inexistente. La excepción se silencia y el forecast usa saldo inicial cero. PostgreSQL registra el error repetidamente.

---

# 16. Jobs

| Job | Frecuencia | Función | Riesgo |
|---|---|---|---|
| Currency legacy | Diario 06:00, más al arranque | USD/EUR → DOP | Duplica registros sin unique |
| FX | Lun–Vie 07:00–20:00 cada hora y 23:00 RD | Actualiza USD/DOP y EUR/DOP | Sin leader lock |
| Macro | Lun–Vie 08:30/16:30; días 28–31 20:00 RD | BCRD y eventos | Sin leader lock |
| Energía | Viernes cada 30 min; sábado 08:00; lunes/jueves 12:00 RD | MICM | Sync público y repetible |
| Análisis mensual | Día 1, 03:00 en archivo | Snapshot IA | No cargado; mezcla usuarios |
| Backup host | Diario 03:00 UTC | `pg_dump` | Ejecución reciente no demostrada |

Los jobs activos viven dentro del proceso web. Varias instancias o reinicios pueden producir ejecuciones duplicadas.

---

# 17. WebSockets

```text
Servidor default namespace
├── connection → entrega últimos 50 mensajes públicos
├── join(username)
├── send_message(username, text)
├── send_private_message(from, to, text)
├── get_private_history(currentUser, withUser)
├── typing / stop_typing
└── admin:broadcast

Namespace /docker
├── list-containers
├── subscribe-system-stats
├── subscribe-stats
└── terminal-init/input/resize
```

No existe middleware `io.use()` o middleware de namespace para JWT. Los hooks cliente limpian listeners y conexiones razonablemente, pero el servidor no establece identidad autenticada.

La tabla `Messages` estaba vacía durante la auditoría, por lo que no se observó exposición efectiva de contenido existente. El riesgo permanece cuando existan mensajes.

---

# 18. Logs

## Hallazgos agrupados

- Errores repetidos `column Account.status does not exist`.
- Colisiones `pg_type_typname_nsp_index` y `pg_class_relname_nsp_index` durante sincronizaciones.
- Relaciones/índices ya existentes por `.sync()` concurrente.
- 55 índices equivalentes sobre `telegram_links.chatId`.
- Fallos recientes del provider BCRD.
- Sandbox advierte que Flask development server no debe usarse en producción.
- No se observaron crashes actuales del proceso Node.

El error de conexión a una base llamada `magnus_os` fue producido por una consulta de diagnóstico con nombre incorrecto y no se clasifica como fallo de la aplicación.

---

# 19. Rendimiento

## Fotografía

- App: aproximadamente 105.6 MiB.
- PostgreSQL: aproximadamente 47.6 MiB.
- Sandbox: aproximadamente 30.4 MiB.
- Total objetivo: aproximadamente 184 MiB.
- `/api/health`: ~3 ms.
- `/api/markets`: ~0.8 s, sujeto a red externa.
- Disco con 348 GiB libres.

No existe evidencia suficiente para afirmar un memory leak.

## Riesgos

- Polling duplicado de tasas/mercado cada 60 segundos.
- Monitores de sistema cada 2 y 5 segundos.
- GET de mercado produce escrituras y crecimiento de tabla.
- Chat privado consulta usuarios en bucle.
- Importador procesa filas secuencialmente.
- Jobs sin locks distribuidos.
- Bundle frontend grande.
- Sandbox sin límites puede agotar el host de 8 GB.

---

# 20. Tests

## Resultado

- `tsc --noEmit`: correcto.
- Jest: 0 tests ejecutados.
- Causa: Jest 26.5.3 incompatible con `jest-environment-jsdom` 30.2.
- Cinco archivos de test encontrados.
- Los tests de energía/macro no se ejecutaron porque escriben y eliminan datos mediante la conexión configurada.

`tests/macroService.test.js` elimina notificaciones y eventos en su hook `before`, por lo que no es seguro contra producción.

## Cobertura conceptual

| Área | Estado |
|---|---|
| Finanzas UI | Parcial |
| Ledger | Ninguna |
| Auth/autorización | Ninguna |
| WebSockets | Ninguna |
| FX | Integración parcial, no aislada |
| Forecast | Utils parciales |
| API | Energía/macro, inseguras para producción |
| Frontend | CashFlow, DatePicker y calidad de datos |
| Constraints DB | Ninguna |

---

# 21. Deuda técnica

- 71 coincidencias de `TODO` en la búsqueda amplia; requieren triaje contextual.
- 424 usos de `console.log` en fuentes y scripts.
- Código legacy y archivos archivados conservados.
- `aiController.js.bak` dentro de controllers.
- Servicios de autenticación duplicados.
- Código Auditor activo en backend pero deshabilitado en frontend.
- Componentes de 600–1,400 líneas.
- URLs y servicios externos hardcoded.
- Puertos hardcoded/defaults solapados.
- Credenciales fallback en Compose y scripts de migración; valores censurados.
- Rutas y prefijos API inconsistentes entre legacy y nuevos módulos.
- `sequelize.sync()` sustituye migraciones versionadas.
- Healthcheck superficial.

No se clasificó automáticamente todo archivo legacy como código muerto; varios todavía tienen referencias o rutas indirectas.

---

# 22. Errores prioritarios

| Severidad | Ubicación | Evidencia | Impacto | Solución propuesta |
|---|---|---|---|---|
| 🔴 P0 | `server/controllers/magnusController.js` | Body completo enviado a `user.update()` | Escalada/modificación de terceros | DTO allowlist + ownership + rol |
| 🔴 P0 | `server/controllers/authController.js` | `adminUsername` no ligado al JWT | Reset arbitrario de contraseña | Autorizar con `req.user` |
| 🔴 P0 | Controllers financieros | `userId` confiado desde cliente | IDOR financiero | Derivar usuario del JWT |
| 🔴 P0 | `server/socket/chatHandler.js` | Sin middleware de auth | Suplantación y lectura privada | JWT handshake y ACL |
| 🔴 P0 | `server/models/ledger.js` / controller | Suma cero solo en controller | Ledger desbalanceable | Garantía DB diferida |
| 🔴 P0 | `docker-compose.yml` | `synchronous_commit=off` | Pérdida de commits recientes | Activar durabilidad |
| 🟠 P1 | `server/controllers/importController.js` | Dos líneas sobre la misma cuenta | Contabilidad incorrecta | Contrapartidas contables reales |
| 🟠 P1 | `server/controllers/marketController.js` | GET ejecuta create | Duplicación y side effects | Upsert/unique + separar command/query |
| 🟠 P1 | `server/controllers/econometricsController.js` | Consulta campo `status` inexistente | Forecast parte de cero | Usar `isArchived=false` |
| 🟠 P1 | Inicialización modelos | Dos `.sync()` concurrentes | Índices duplicados/race | Inicialización única + migraciones |
| 🟠 P1 | `sandbox-bridge.py` | Ejecución arbitraria débilmente aislada | DoS/exfiltración | Non-root, red off y límites |
| 🟠 P1 | Registro | Backend no devuelve token | Flujo de alta roto | Emitir token o exigir login |
| 🟠 P1 | `Ledger.tsx` | `fetch` sin JWT | Página recibe 401 | Usar `apiFetch` |
| 🟠 P1 | `monthlyAnalysisJob.js` | Snapshot global | Mezcla usuarios | Añadir `user_id` |
| 🟡 P2 | `Home.tsx` | Catálogo hardcoded | Evolución rígida | Catálogo declarativo |

---

# 23. Documentación vs realidad

| Documentado | Implementado | Estado |
|---|---|---|
| “El ledger manda” | Dashboard/econometría usan legacy | **IMPLEMENTACIÓN DIFERENTE** |
| Ledger inmutable | Update/delete y sin constraint DB | **NO GARANTIZADO** |
| Cifras reconstruibles | Balance devuelve caché | **PARCIALMENTE CONFIRMADO** |
| Datos nunca salen del servidor | Gemini, WorldTime y APIs externas | **FALSO** |
| JWT estricto en finanzas/admin | JWT sí; ownership/roles no | **PARCIALMENTE CONFIRMADO** |
| HSTS activo | `hsts: false` | **NO IMPLEMENTADO** |
| Panel Docker activo | Docker socket ausente | **OPERACIÓN AUSENTE** |
| Ollama opcional | Definido y apagado | **CONFIRMADO** |
| Sandbox aislado | Separado, pero root/red/RW | **PARCIALMENTE CONFIRMADO** |
| PostgreSQL aislado | 5432 no publicado | **CONFIRMADO** |
| Backup diario | Cron presente; última copia 27/09 | **NO VERIFICADO** |
| Econometría Python | Producción usa JavaScript | **IMPLEMENTACIÓN DIFERENTE** |
| Auditor deshabilitado | UI apagada; API/SQLite activos | **PARCIALMENTE CONFIRMADO** |
| Server Admin protegido | UI local y API parcial | **IMPLEMENTACIÓN INSEGURA** |

---

# 24. Top 10 mejoras

| Orden | Mejora | Impacto | Riesgo del cambio | Esfuerzo |
|---:|---|---|---|---|
| 1 | Autorización central por `req.user`; eliminar `userId` confiado | Crítico | Medio | Medio |
| 2 | Autenticar Socket.IO y deshabilitar `/docker` hasta asegurar roles | Crítico | Medio | Medio |
| 3 | Garantía DB de ledger y reconciliación de saldos | Crítico | Alto | Alto |
| 4 | `synchronous_commit=on` y rol PostgreSQL no-superuser | Crítico | Bajo/medio | Bajo |
| 5 | Backup/restore probado, permisos `0600` y copia fuera del disco | Alto | Bajo | Medio |
| 6 | Migraciones versionadas; retirar sync concurrente e índices duplicados | Alto | Medio | Medio |
| 7 | Corregir GET con escrituras y deduplicar `CurrencyHistories` | Alto | Medio | Medio |
| 8 | Unificar tablas legacy con ledger y migrar flotantes | Alto | Alto | Alto |
| 9 | Reparar Jest y añadir tests de seguridad/ledger | Alto | Bajo | Medio |
| 10 | Endurecer sandbox, headers, TLS y límites Docker | Alto | Medio | Medio |

---

# 25. Roadmap

## AHORA — P0/P1

- Restringir temporalmente el acceso a una red confiable.
- Corregir autorización de usuarios y finanzas.
- Deshabilitar o autenticar WebSockets.
- Activar durabilidad PostgreSQL.
- Crear rol de aplicación con privilegios mínimos.
- Verificar backup y restauración.
- Corregir forecast `Account.status`.
- Detener duplicación de `CurrencyHistories`.
- Decidir explícitamente el tratamiento de las cuatro filas creadas durante la auditoría.

## PRÓXIMO

- Introducir migraciones versionadas.
- Implementar garantía DB del ledger y reconciliación automática.
- Eliminar carrera de saldos.
- Reparar importador.
- Añadir `user_id` a snapshots.
- Aislar completamente los tests.
- Endurecer sandbox.
- Actualizar dependencias con pruebas de regresión.

## DESPUÉS

- Migrar dashboards legacy al ledger.
- Catálogo dinámico de módulos del Home.
- Reducir bundles y componentes gigantes.
- Healthcheck profundo.
- Métricas de jobs, latencia y reconciliación.
- Retirar SQLite legacy y código muerto confirmado.

---

# 26. Archivos recomendados para modificar

No se modificaron durante la auditoría.

| Archivo | Motivo | Cambio sugerido | Riesgo |
|---|---|---|---|
| `server/middleware/auth.js` | Falta autorización reusable | `requireSelfOrAdmin` e identidad normalizada | Medio |
| `server/routes/magnus.routes.js` | CRUD administrativo sin rol | Aplicar `requireSoberano` | Bajo |
| `server/controllers/magnusController.js` | Mass assignment | Allowlist y transacciones | Medio |
| `server/controllers/authController.js` | Registro/reset | Token y autorización real | Medio |
| Controllers financieros | IDOR | Sustituir `userId` por JWT | Medio |
| `server/controllers/ledgerController.js` | Integridad y concurrencia | Ownership, locks y operaciones atómicas | Alto |
| `server/controllers/importController.js` | Contabilidad incorrecta | Contrapartidas contables | Alto |
| `server/models/ledger.js` | Modelo/schema no coinciden | Migración y constraints | Alto |
| `server/socket/chatHandler.js` | Socket abierto | JWT y rooms autorizadas | Medio |
| `server/socket/dockerSocket.js` | Terminal sin ACL | Admin obligatorio o retirar | Alto |
| `server/controllers/marketController.js` | GET con escritura | Upsert y service dedicado | Medio |
| `server/config/database.js` | Privilegios/conexión | Rol limitado | Medio |
| `docker-compose.yml` | Durabilidad/hardening | Sync commit, limits, users y health | Medio |
| `server/scripts/sandbox-bridge.py` | Executor débil | Aislamiento y archivos por request | Alto |
| `src/shared/components/home/Home.tsx` | Catálogo hardcoded | Separar cards/config | Bajo |
| `jest.config.ts` / `package.json` | Tests no arrancan | Alinear Jest, ts-jest y jsdom | Bajo |
| `scripts/backup.sh` | Continuidad | umask, verificación, locking y reporte | Bajo |

---

# 27. Veredicto final

| Área | Nota |
|---|---:|
| Arquitectura | 6/10 |
| Código | 5/10 |
| Integridad financiera | 4/10 |
| Seguridad | 2/10 |
| Docker | 5/10 |
| Base de datos | 4/10 |
| Frontend | 6/10 |
| Backend | 4/10 |
| Mantenibilidad | 4/10 |
| Performance | 7/10 |
| Preparación futura | 5/10 |

## MAGNUSOS2 TECHNICAL HEALTH SCORE: 45/100

MAGNUSOS2 es un producto real y funcional, no un cascarón documental. Providence FX, el diseño visual, el uso de centavos en el ledger nuevo, el aislamiento del puerto PostgreSQL y el consumo moderado son fortalezas claras.

El principal problema no es la falta de funcionalidades, sino la capa de confianza. Antes de ampliar Home, IA o analítica, deben asegurarse identidad, autorización, durabilidad, invariantes contables y recuperación.

La arquitectura actual de Docker + Node + PostgreSQL es suficiente para el alcance self-hosted si se endurece y simplifica. No se recomienda introducir Kubernetes, Kafka, service mesh ni una fragmentación masiva en microservicios.

---

## Estado al cierre

- Código/configuración original: sin cambios durante la auditoría.
- Contenedores: no reiniciados ni eliminados.
- PostgreSQL: sin migraciones ni cambios manuales.
- Excepción documentada: cuatro filas de `CurrencyHistories` generadas por dos consultas GET con efecto lateral.
- Secretos: no incluidos en el reporte.

