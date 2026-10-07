# Auditoría SB v2 / Sistema Bancario

**Fecha de auditoría:** 2026-10-06  
**Tipo:** post-implementación, solo lectura  
**Commit auditado:** `53a87377c89fe482675319a07a5997e4919de9d2`  
**Alcance:** código, PostgreSQL, endpoints, scheduler, frontend, Docker, seguridad, Providence FX y documentación.

> No se modificaron código, base de datos, históricos, scheduler, contenedores ni credenciales durante esta auditoría.

## Resultado general

| Área | Evaluación |
|---|---:|
| Integridad de datos | 8/10 |
| Exactitud financiera | 7/10 |
| Backend | 6/10 |
| Frontend | 7/10 |
| Seguridad | 5/10 |
| DevOps | 5/10 |
| **Global** | **6.3/10** |

Los cálculos principales almacenados y servidos para agosto de 2026 son matemáticamente consistentes con PostgreSQL. Los riesgos prioritarios son operativos y de seguridad: el runtime no tiene claves SB, el POST de sincronización no exige autenticación y hay drift entre el contenedor activo y la imagen etiquetada.

## Inventario real

| Componente | Ubicación | Estado |
|---|---|---|
| Ingesta SB v2 | `server/services/sb/sbStatisticsService.js` | Implementada; timeout, paginación, reintentos y failover en código |
| API bancaria | `server/controllers/sbBankingController.js` | Operativa |
| Rutas | `server/routes/sbBanking.routes.js` | 8 GET reales y POST sync |
| Scheduler | `server/jobs/sbSchedulerJob.js` | Activo: día 16, 03:00, `America/Santo_Domingo` |
| Registro scheduler | `server/index.js` | Confirmado |
| Migración SB | `server/migrations/011_sb_banking_statistics.sql` | Aplicada |
| Frontend | `src/apps/finanza/pages/BankingPage.tsx` | Ruta `/finanza/banca` activa |
| Navegación | `src/apps/finanza/components/Layout.tsx` | “Sistema Bancario”, badge SB v2 |
| Contenedor app | `magnus_os2_app` | Healthy |
| PostgreSQL | `magnus_postgres` | Healthy, volumen persistente |

## PostgreSQL real

Tablas SB activas:

- `sb_banking_metrics`
- `sb_sync_runs`

No existen `sb_captaciones_balance`, `sb_captaciones_geografia`, `sb_sync_history` ni `v_sb_latest_system_summary`.

### `sb_banking_metrics`

- 17,311 filas.
- Períodos: 2026-01 a 2026-08.
- 40 entidades históricas; 39 en agosto.
- Divisas: DOP, USD y EUR.
- Grain: `periodo + entidad + tipo_entidad + provincia + persona + divisa`.
- Clave única real: `(periodo, entidad, tipo_entidad, provincia, persona, divisa)`.
- Sin duplicados de esa clave y sin NULL inesperados en dimensiones o balance.

| Período | Registros | Entidades | DOP | USD | EUR | Balance total | Instrumentos |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-01 | 2,162 | 40 | 1,366 | 549 | 247 | RD$3.225T | 14,041,163 |
| 2026-02 | 2,169 | 40 | 1,371 | 550 | 248 | RD$3.189T | 14,115,647 |
| 2026-03 | 2,113 | 40 | 1,334 | 528 | 251 | RD$3.307T | 14,236,753 |
| 2026-04 | 2,184 | 40 | 1,377 | 556 | 251 | RD$3.368T | 14,364,169 |
| 2026-05 | 2,182 | 40 | 1,377 | 555 | 250 | RD$3.419T | 14,477,530 |
| 2026-06 | 2,181 | 40 | 1,377 | 554 | 250 | RD$3.493T | 14,374,941 |
| 2026-07 | 2,184 | 40 | 1,378 | 555 | 251 | RD$3.477T | 14,753,298 |
| 2026-08 | 2,136 | 39 | 1,324 | 558 | 254 | RD$3.518T | 14,869,650 |

No hay meses faltantes dentro del rango disponible. Agosto pierde una entidad respecto a los siete meses previos; debe monitorearse como anomalía, sin tratarlo aún como error demostrado.

## KPI recalculados — agosto 2026

| KPI | Backend | Recalculado SQL | Resultado |
|---|---:|---:|---|
| Balance total | RD$3,517,507,877,440.76 | Igual | Correcto |
| MoM | 1.17% | 1.17% | Correcto |
| DSI USD / total | 29.70% | 29.70% | Correcto |
| Tasa ponderada global | 3.6171% | 3.6171% | Correcto |
| Tasa ponderada DOP | 4.4453% | 4.4453% | Correcto |
| Tasa ponderada USD | 1.7298% | 1.7298% | Correcto |
| HHI | No expuesto | 2,024.84 | No implementado/expuesto |

Top entidades por cuota, usando el universo completo:

1. Banreservas: 35.8520%
2. Popular: 21.2381%
3. BHD: 14.8854%
4. Santa Cruz: 4.2310%
5. APAP: 3.9388%
6. Scotiabank: 3.9269%

La suma de cuotas de todas las entidades es 100.000000%. El Top 5 no se presenta como “el sistema”; esa lógica es correcta.

El HHI recalculado usa escala porcentual 0–10,000. No existe cálculo ni exposición de HHI en backend o frontend, pese a que la documentación afirma que existe.

Sobre doble conteo: la tabla representa una partición simultánea por entidad, provincia, persona y divisa. Las agregaciones usan exclusivamente esa tabla y no mezclan tablas geográficas y de balance separadas. No se encontró doble conteo interno. La conclusión depende de que la SB publique esas dimensiones como particiones mutuamente excluyentes.

## Idempotencia

La estrategia usa `INSERT ... ON CONFLICT` sobre la clave natural indicada. El segundo run registrado para agosto produjo:

- received: 2,136
- inserted: 0
- updated: 23
- unchanged: 2,113
- failed: 0

No se crearon duplicados. No se ejecutó otra sincronización durante la auditoría porque el contenedor activo carece de claves SB configuradas y la auditoría era no intrusiva.

## Scheduler

- Archivo: `server/jobs/sbSchedulerJob.js`.
- Cron: `0 3 16 * *`.
- Zona horaria: `America/Santo_Domingo`.
- Función: `syncLatestSbPeriod()`.
- También realiza una comprobación 15 segundos tras cada inicio.
- Usa `jobObservability`, que incorpora leases para evitar concurrencia de la misma tarea.

La comprobación compara el último período en DB con candidatos recientes de la API. Si no detecta publicación, devuelve `NO_OP` sin fallo crítico. Los últimos ocho chequeos de arranque terminaron como exitosos, sin período nuevo.

## Endpoints

| Endpoint | HTTP | Latencia observada | Estado |
|---|---:|---:|---|
| `/summary` | 200 | 49 ms frío / 14 ms cache | Correcto |
| `/yields?currency=DOP` | 200 | 16 ms / 8 ms | Correcto |
| `/yields?currency=USD` | 200 | 7 ms | Correcto |
| `/deposits` | 200 | 46 ms / 8 ms | Correcto |
| `/dollarization-trend` | 200 | 8 ms | Correcto |
| `/institution/BANRESERVAS` | 200 | 42 ms | Correcto |
| `/history` | 200 | 93 ms | Correcto |
| `/sync-status` | 200 | 53 ms | Correcto |
| `/provinces` | 200 | 7 ms | Correcto |
| `/geography` | 401 | 11 ms | No existe como ruta SB real |

El endpoint documentado `/geography` no existe. El frontend consume correctamente `/provinces`.

## Frontend

Ruta real: `/finanza/banca`, con redirección desde `/finanza/sistema-bancario`.

| Sección | Endpoint |
|---|---|
| Resumen | `/summary` |
| Rendimientos | `/yields` |
| Instituciones | `/deposits`, `/institution/:entity` |
| Dolarización | `/dollarization-trend` |
| Geografía | `/provinces` |
| Histórico | `/history` |
| Widget Providence FX | `/summary`, `/dollarization-trend` |

El frontend visualiza los KPI del backend. Solo calcula derivados de presentación, como variación de DSI y suma Top N; no recalcula DSI, market share ni tasas ponderadas desde datos crudos.

## Providence FX

No se detectó regresión estructural causada por SB:

- `fx_rate_observations`: 294 observaciones.
- Pares persistidos: USD/DOP y EUR/DOP.
- Últimas observaciones: 2026-10-06.
- Endpoints USD/DOP e histórico respondieron HTTP 200.
- Los logs muestran errores recientes de conectividad con BCRD; fuentes alternativas continuaron produciendo observaciones. Es un riesgo operativo separado de SB.

## Docker y Git

- Contenedor activo: `magnus_os2_app`, healthy.
- Imagen ejecutada: `sha256:8b5603dbddee…`.
- Tag actual `magnus-os2-magnus:latest`: `sha256:47479e2315d…`.
- Persistencia PostgreSQL: volumen Docker `magnus-os2_magnus_pgdata`.
- Política de reinicio app: `unless-stopped`; PostgreSQL: `always`.

**Drift: YES.** El contenedor ejecuta una imagen distinta de la que actualmente porta el tag `latest`. La documentación describe una imagen “congelada con docker commit”, no un artefacto reproducible vinculado a un SHA Git. Los hashes de archivos SB críticos dentro del contenedor coincidieron con el checkout auditado, pero no hay trazabilidad suficiente para garantizarlo tras una recreación.

## Hallazgos

| ID | Severidad | Problema | Evidencia | Recomendación |
|---|---|---|---|---|
| SB-01 | P1 | El runtime no recibe claves SB. | `/sync-status`: `hasPrimaryKey=false`, `hasSecondaryKey=false`; host `.env` sí las contiene. | Recrear el contenedor desde configuración verificada y validar variables sin exponer secretos. |
| SB-02 | P1 | `POST /api/markets/banking/sync` está efectivamente público. | La ruta usa `optionalJWT`, que permite requests sin token. Puede alterar datos y consumir cuota externa. | Exigir JWT y rol admin/soberano; auditar el endpoint. |
| SB-03 | P1 | Drift de imagen/producción. | Contenedor `8b5603…`; tag actual `47479e…`. | Build reproducible con SHA Git/labels y despliegue controlado. |
| SB-04 | P2 | Documentación afirma HHI implementado, pero no existe código ni payload HHI. | Búsqueda en server/frontend sin implementación; SQL da 2,024.84. | Implementarlo o corregir documentación/UI. |
| SB-05 | P2 | Contrato documentado `/geography` no existe. | HTTP 401; ruta real `/provinces`. | Elegir alias compatible o actualizar contrato/documentación. |
| SB-06 | P2 | Documentación declara tasa ponderada global 4.76%; realidad 3.6171%. | SQL independiente y `/summary`. | Corregir informe e indicar período/metodología. |
| SB-07 | P2 | Las claves faltantes convierten el scheduler en un `NO_OP` aparentemente exitoso. | Logs y `job_executions` registran éxito aunque no hay claves runtime. | Incorporar estado `misconfigured` y alerta explícita. |
| SB-08 | P3 | Cobertura automatizada SB insuficiente. | No hay pruebas específicas de KPI, UPSERT, endpoint o failover. | Añadir pruebas de integración con DB aislada y fixtures SB. |
| SB-09 | INFO | Agosto tiene 39 entidades frente a 40 previas. | Conteos por período. | Alertar sobre caída/aparición de entidades. |

## Documentación vs. realidad

- Confirmado: ruta `/finanza/banca`, frontend dedicado, scheduler día 16 a las 03:00 RD, tablas `sb_banking_metrics` y `sb_sync_runs`, DSI 29.70% y 40 entidades históricas.
- Desactualizado: el informe oficial dice cache de 5 minutos; el controlador usa una hora.
- Incorrecto: el informe oficial menciona scheduler día 3 a las 06:00 UTC; la implementación real usa día 16 a las 03:00 RD.
- Incorrecto: `sb_captaciones_balance`, `sb_captaciones_geografia`, `sb_sync_history` y la vista materializada descrita no existen.
- Incorrecto: `/geography` no existe como endpoint bancario.
- Incorrecto: HHI no está implementado ni servido.
- Incorrecto: tasa global 4.76%; el dato real actual es 3.6171%.
- No verificable: alta disponibilidad por dual-key failover en runtime; existe en código, pero no hay claves cargadas en el contenedor.

## Plan de remediación

### P1

1. **Corregir inyección de variables SB al contenedor y recrear mediante el compose/Dockerfile reproducible.**
   - Archivos/proceso: `docker-compose.yml` y procedimiento de despliegue.
   - Riesgo: requiere recreación controlada del contenedor.
   - Prueba: `/sync-status` debe reportar ambas claves configuradas sin revelar valores.

2. **Proteger la sincronización manual.**
   - Archivo: `server/routes/sbBanking.routes.js`.
   - Cambio: reemplazar `optionalJWT` por autenticación estricta y autorización de administrador/soberano.
   - Prueba: sin token devuelve 401; token no admin devuelve 403; admin autorizado puede ejecutar.

3. **Eliminar drift de imagen.**
   - Cambio: build desde commit fijo, etiquetas con SHA y despliegue de la misma imagen auditada.
   - Prueba: SHA Git, image ID y contenedor deben ser trazables y coincidentes.

### P2

1. Añadir HHI al backend o retirar esa promesa de documentación/UI.
2. Unificar contrato geográfico: alias `/geography` o actualizar documentación hacia `/provinces`.
3. Ajustar documentación SB al esquema y métricas reales.
4. Cambiar `NO_OP` por alerta/configuración inválida cuando faltan claves SB.
5. Agregar alarma por disminución inesperada de entidades o registros mensuales.

### P3

1. Añadir pruebas de KPI, DSI, HHI, UPSERT y autorización.
2. Documentar el grain de la tabla y el supuesto de partición exclusiva de los datos SB.
3. Revisar errores de conectividad BCRD en Providence FX por separado.

## Estimación de trabajo

| Grupo | Estimación |
|---|---:|
| P1: claves runtime, protección POST y drift Docker | 2–4 horas |
| P2: HHI, contrato, alertas y documentación | 3–5 horas |
| P3: pruebas y observabilidad | 3–6 horas |
| **Total** | **8–15 horas; aproximadamente 1 jornada o 1–2 días con despliegue controlado** |

## Precondiciones antes de remediar

1. Confirmar una ventana de despliegue para recrear el contenedor de aplicación.
2. Tomar backup verificable de PostgreSQL antes de cambios de runtime.
3. No ejecutar sincronización manual masiva durante la corrección.
4. Validar cada cambio en base de datos aislada antes de producción.
