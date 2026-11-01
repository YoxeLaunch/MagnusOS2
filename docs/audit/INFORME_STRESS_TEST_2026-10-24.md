# 🔥 Informe de Stress Test — MagnusOS2

**Fecha:** 2026-10-24 · **Método:** réplica idéntica aislada (código + migraciones completas sobre `magnus_postgres_test` en tmpfs, puerto 4100) · **Producción:** sin interrupciones (verificada healthy durante toda la prueba)

---

## 📊 Resultado principal: usuarios simultáneos

| Escenario | Usuarios | Resultado |
|---|---|---|
| ✅ **Cómodo (SLA estricto)** | **300** | p95 = 39ms, 0% errores, HTTP + WebSockets estables |
| ⚠️ Aceptable | **500** | p95 = 229ms, p99 = 1.5s, 0% errores |
| 🔶 Borde de saturación | **750** | p95 = 1.9s, throughput pico (195 req/s) |
| ❌ Colapso | **1.000** | 14% timeouts, latencias de 10s |

**Perfil de usuario virtual:** login + 4 endpoints de dashboard en rotación (`accounts`, `net-worth`, `transactions`, `cashflow`) con pausa de lectura de 1.5–4.5s (media ~3s).

### Techo configurado (verificado en producción)
- **Rate limit global: 300 peticiones / 15 min POR IP** — confirmado empíricamente: la petición 301 recibió `429`.
- **20 logins / hora por IP** (authLimiter).
- Implicación: varios usuarios detrás de una misma IP comparten 300 llamadas API / 15 min (~1 cada 3s). Con IPs individuales (LAN normal), cada usuario dispone de su propio presupuesto de 300/15min, y el límite real pasa a ser el hardware (~300–500 usuarios).

---

## 🧱 Métricas de techo

| Métrica | Valor | Causa |
|---|---|---|
| Throughput máx. | ~150–195 req/s | Pool Sequelize (max=10) + `net-worth` ~900ms/query |
| Logins sostenidos | **~6.5/s** | bcryptjs (JS puro) ≈ 150ms CPU por login, 1 núcleo |
| Ráfaga de logins simultáneos | **≥100 = bloqueo temporal** | bcrypt serializa el event loop → timeout de pool (`ConnectionAcquireTimeoutError`); recuperación en minutos |
| WebSockets estables | 300 (sin pérdida) | El sistema de presencia reenvía la lista COMPLETA de usuarios a TODOS los sockets en cada conexión (O(N²)) |
| Memoria máx. del app | 215 MiB / 2048 MiB | ✅ No es cuello de botella (10%) |

---

## 🔍 Cuellos de botella identificados (en orden de impacto)

1. **Login (bcryptjs puro JS):** ~6.5 logins/s; una ráfaga de ~100 logins simultáneos congela el servidor varios minutos. Es el punto más frágil del sistema.
2. **Pool de BD (max=10) + endpoint pesado:** cada request autenticada hace 2 queries (verificación de sesión en `AuthSession.findByPk` + la query propia). `net-worth` (~900ms incluso con datos casi vacíos) consume el pool: a ~50 req/s de `net-worth` las 10 conexiones quedan matemáticamente saturadas.
3. **Proceso Node único (sin cluster):** todo el JS corre en 1 núcleo (host: 4 vCPU compartidas con ~30 contenedores).
4. **Presencia por broadcast O(N²)** en Socket.io (`io.emit('users_update', lista)` por cada connect/disconnect).
5. *Caveat de medición:* el generador de carga corría en el mismo host, compitiendo por CPU. Con cliente de carga dedicado, la capacidad real sería ~20–40% mayor.

---

## 🛠️ Recomendaciones (si se desea escalar)

1. `pool.max` de 10 → 25 (PostgreSQL soporta `max_connections=50`; quedaría margen).
2. Cachear la verificación de sesión (TTL 30–60s en memoria) → elimina 1 de cada 2 queries.
3. Optimizar `net-worth` (índices/agregación SQL/caché) — es el endpoint dominante del pool.
4. Migrar `bcryptjs` → `bcrypt` nativo (o `argon2`): ~5-10× más rápido en login.
5. Node en cluster (2 workers) o limitar logins concurrentes en cola (semáforo de bcrypt).
6. Presencia: enviar deltas (`user_joined`/`user_left`) en vez de la lista completa.

Con (1)+(2)+(3) el techo de navegación estimado subiría a >1.000 usuarios en este hardware.

---

## 🧪 Entorno y artefactos

- Réplica: `NODE_ENV=test` + `DATABASE_URL_TEST` (guardarrueles del propio proyecto: imposible tocar producción).
- Scripts de prueba: versionados en `tests/stress/` (load.mjs, load2.mjs, socket-test.mjs, prod_ratelimit_probe.mjs, ramp.sh, ramp2.sh).
- Cambio en el repo: `server/middleware/security.js` ahora admite `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS` por env — **por defecto idéntico a producción** (300/15min, 20/hora). Revertible con `git checkout server/middleware/security.js`.
- Limpieza realizada: réplica detenida, `magnus_postgres_test` detenido (datos en tmpfs = eliminados), producción verificada healthy (uptime 7h, sin reinicios).
