# Informe de rediseño — Panel Admin

## Resumen ejecutivo

Se sustituyó la experiencia administrativa activa de `/admin` (un Server HUD basado en Docker) por un **Panel Admin** de operación de Magnus OS2. El Centro de mando es ahora la vista inicial e integra datos reales de salud profunda, recursos, usuarios, respaldos y Providence FX. No se muestran métricas de ejemplo.

## Auditoría inicial

| Capacidad | Estado encontrado | Backend disponible | Acción |
| --- | --- | --- | --- |
| Usuarios | `GET /api/users`, protegido | Sí | Integrado en modo lectura |
| Mentores/Pensum | Código antiguo en `src/apps/magnus/components/admin` | Sí, pero educativo | Retirado de la navegación nueva; no se eliminó código aún |
| Providence FX | USD/DOP y EUR/DOP con cache, fallback y proveedores | Sí | Integrado; refresco ahora exige admin |
| Sistema | `GET /api/health/deep` y `/api/system/stats` | Sí | Integrado y distinguido como proceso/host |
| Backups | `GET/POST /api/system/backups` y `/api/system/backup` | Sí | Integrado; se declara que no hay prueba de restauración |
| Jobs | `jobObservabilityService` expuesto por salud profunda | Sí | Visible dentro de Diagnósticos |
| Auditoría administrativa | Logs puntuales; no hay bitácora persistente central | Parcial | Pendiente, no se simuló |

La aplicación es React 18 + TypeScript + Vite. El backend es Express + Socket.IO, Sequelize y PostgreSQL (con fallback SQLite documentado). La autenticación usa JWT y el rol `admin`/usuario `soberano`. Los jobs usan `node-cron` y `jobObservabilityService`. Providence FX usa TasaReal, InfoDolar, BCRD y Yahoo a través de `fxService`.

## Archivos modificados

- `src/apps/server-admin/App.tsx`
- `src/apps/server-admin/pages/Dashboard.tsx`
- `src/App.tsx`
- `src/index.css`
- `server/routes/market.routes.js`
- `server/routes/admin.routes.js`
- `server/controllers/adminController.js`
- `server/services/adminAuditService.js`
- `server/models/adminAuditEvent.js`
- `server/migrations/012_admin_audit_events.sql`

## Funciones implementadas

- Sidebar por dominios funcionales y Centro de mando predeterminado.
- Estado de aplicación, memoria del host autorizada, cuentas, último backup, alertas de salud y diagnósticos.
- Consola Providence FX para USD/DOP y EUR/DOP con compra, venta, caché, antigüedad y calidad solo cuando el contrato lo entrega.
- Inventario de usuarios de solo lectura.
- Inventario y creación autorizada de backups, con confirmación cliente y autorización servidor.
- La ruta visual `/admin` redirige a usuarios no administrativos; el backend continúa siendo la autoridad.
- `POST /api/markets/fx/refresh` dejó de aceptar autenticación opcional y requiere JWT + administrador.
- Se añadió `012_admin_audit_events.sql`, el modelo y los endpoints administrativos protegidos `GET /api/admin/audit-events` y `GET /api/admin/jobs`.
- Se añadió `GET /api/admin/fx/providers`, que devuelve la última telemetría persistida de cada proveedor, y su health grid en Providence FX.
- Se añadió `POST /api/system/backups/:filename/verify`: verifica la integridad de compresión gzip y registra el resultado. No afirma que una restauración PostgreSQL sea posible.
- Se integró Comms global en el Panel Admin. El servidor valida título, mensaje y severidad; requiere administrador, confirmación de interfaz y registro de auditoría.
- Los cambios de contraseña también generan un evento de auditoría sin almacenar la contraseña.
- Se incorporaron Novedades y Portada: listado administrativo, publicación validada y edición de banners mediante los servicios existentes.
- Se añadió `013_auth_sessions.sql` y el registro de sesiones JWT revocables para tokens nuevos, junto con `POST /api/logout`, inventario administrativo y revocación controlada de sesiones ajenas.
- Se añadió `014_admin_audit_hardening.sql`: trigger append-only para la bitácora y revocación condicional de `UPDATE`, `DELETE` y `TRUNCATE` al rol `magnus_app` cuando exista. Cada solicitud recibe/delega un identificador de correlación (`X-Correlation-Id`).
- La vista de auditoría muestra correlación y política de retención. La política por defecto es 365 días y no borra automáticamente; los eventos vencidos requieren archivo verificable y procedimiento aprobado.
- Se auditan las solicitudes de refresh FX, creación de backups, borrado/etiquetado de usuarios, publicaciones de novedades, broadcasts y cambios de portada.
- Se reforzaron en backend las rutas de publicación de novedades, upload administrativo y configuración de portada.

## Seguridad y límites deliberados

El flujo nuevo no instancia el socket Docker ni presenta terminal, contenedores o ejecución de comandos. No se añadió ningún acceso al socket Docker, credenciales o servicios externos a Magnus.

No se habilitaron cambios de roles, sesiones, overrides manuales FX ni restauración de backups: faltan controles de último administrador, autorización reforzada y pruebas de recuperación. El panel lo declara en vez de aparentar soporte.

La auditoría y el registro de sesiones usan migraciones PostgreSQL versionadas. `npm run db:status` confirmó que el entorno local está usando SQLite y mantiene toda la cadena de migraciones PostgreSQL como pendiente; por seguridad no se ejecutó `db:migrate` contra ese almacén ni contra producción. Al desplegar en PostgreSQL, aplicar las migraciones mediante el runbook y confirmar el estado antes de exponer estas capacidades.

## Resultados de pruebas

- `npm run build`: correcto (Vite completó la compilación).
- La compilación muestra advertencias existentes/no bloqueantes: `NODE_ENV=production` en `.env`, datos de Browserslist antiguos y chunks superiores a 500 kB.
- `npm test`: iniciado; los primeros 19 subtests reportaron `ok`, pero la suite no alcanzó una salida final dentro de la ventana de ejecución porque consulta repetidamente proveedores externos de energía/FX. No se reporta como una ejecución completa.
- Las operaciones administrativas autenticadas no se ejecutaron durante el smoke test, pues no se utilizaron credenciales de usuario.

### Validación de despliegue — 2026-10-10

- Imagen `magnus-os2-magnus:latest` reconstruida y servicio `magnus_os2_app` recreado.
- Migraciones PostgreSQL `012_admin_audit_events.sql`, `013_auth_sessions.sql` y `014_admin_audit_hardening.sql` aplicadas correctamente mediante `MigrationRunner`.
- Smoke test: `GET /api/health/live` = `200`; `GET /api/health/ready` = `200` con base de datos, migraciones y schema drift en estado correcto.
- Controles sin credenciales: `POST /api/markets/fx/refresh`, `GET /api/admin/audit-events` y `GET /api/admin/sessions` devolvieron `401`.
- No se efectuó una operación administrativa autenticada durante el smoke test, pues no se utilizaron credenciales de usuario.

## Plan de reversión

Revertir los cinco archivos de código anteriores restituye el HUD previo. No se realizaron migraciones, cambios de esquema ni modificaciones de datos financieros. El endurecimiento de `POST /api/markets/fx/refresh` debe conservarse; para revertirlo explícitamente habría que volver a `optionalJWT`, lo cual no se recomienda.

## Recuperación aislada

El restore drill existente se actualizó para aceptar dumps SQL gzip, configurar explícitamente host/puerto/contenedor de prueba y rechazar el host o puerto productivo. El procedimiento completo está en `docs/RESTORE_DRILL_RUNBOOK.md`.

Se ejecutó el 2026-10-10 contra `127.0.0.1:5433/magnus_restore_drill`, usando `/home/osvaldo/backups/magnus-os2/magnus_pre_phase2c_backup.sql` (SHA-256 `7416e670800df0643a4c067c020f5465f2cb51f672efa4c499161390caca7a36`). Resultado: `SUCCESS`, RTO 2.03 s, 14 migraciones aplicadas con checksums correctos, reconciliación financiera sin anomalías y drift sincronizado. La base temporal y roles de prueba fueron eliminados.

Incidente operativo: al desmontar el perfil de prueba se usó `docker compose --profile test down`, que también detuvo los servicios Magnus del mismo Compose. No se eliminaron volúmenes ni datos. Se restauraron inmediatamente con `docker compose up -d` y se verificó `healthy` para `magnus_postgres`, `magnus_os2_app` y `magnus_sandbox`. El runbook fue corregido para usar `stop/rm postgres_test` y prohibir `down`.
