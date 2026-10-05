# MAGNUSOS2 — AUDITORÍA DE DEPENDENCIAS Y MATRIZ DE ALCANZABILIDAD (F-07)

**Fecha:** 2026-10-04  
**Rama:** `phase2/final-remediation`  
**Entorno de análisis:** Producción (`npm audit --omit=dev`)  
**Directiva de seguridad:** Prohibición absoluta de `npm audit fix --force` para evitar rotura de dependencias pares (`react-simple-maps` vs `react 18`).

---

## 1. Resumen Ejecutivo

Tras actualizar versiones compatibles sin cambios mayores, `npm audit --omit=dev` identifica 31 vulnerabilidades: 2 críticas, 17 altas, 10 moderadas y 2 bajas. No todas poseen la misma exposición, pero ninguna debe presentarse como resuelta sin una actualización o una aceptación explícita de riesgo.

1. **Dependencias directas afectadas:** se actualizaron sin cambios mayores `body-parser`, `express`, `express-rate-limit`, `figlet` y `multer`. Permanecen avisos directos para `dockerode`, `react-router-dom`, `sequelize` y `sqlite3`; requieren plan de actualización/remoción y pruebas de compatibilidad.
2. **Riesgos transitivos:** `tar`, `protobufjs`, `ws`, `socket.io`, `hono` y otros siguen presentes. Algunos pueden limitarse a build tooling, pero esta clasificación debe demostrarse por ruta de ejecución y no elimina el hallazgo.
3. **Mitigaciones activas:** autenticación, límites HTTP y aislamiento reducen superficie, pero no neutralizan vulnerabilidades de parser/protocolo una vez aceptada una conexión.

---

## 2. Matriz de Clasificación de Vulnerabilidades y Alcanzabilidad

| Paquete | Versión instalada | Severidad | CVE / GHSA | Ruta de dependencia | ¿Alcanzable en Runtime? | Justificación Técnica y Mitigación |
|---|---|---|---|---|---|---|
| `tar` | `<=7.5.20` | Critical / High | GHSA-23hp-3jrh-7fpw, GHSA-r292-9mhp-454m, GHSA-8x88-c5mf-7j5w | `sqlite3` → `node-gyp` → `tar` / `cacache` → `tar` | **NO (Inalcanzable)** | Utilizado exclusivamente durante la fase de compilación nativa de `sqlite3` (`node-gyp`) durante `npm install`. MagnusOS2 no acepta ni procesa archivos `.tar` vía HTTP ni en background. |
| `uuid` | `<11.1.1` | Moderate | GHSA-w5hq-g745-h8pq | `sequelize` → `uuid`, `dockerode` → `uuid` | **NO (Inalcanzable)** | La vulnerabilidad radica en falta de verificación de límites de buffer al invocar UUID v3/v5 con buffer de usuario personalizado. MagnusOS2 utiliza exclusivamente UUID v4 y `crypto.randomUUID()` nativo de Node.js. |
| `underscore` | `<=1.13.7` | High | GHSA-qpx9-hpmf-5gmw | Transitiva (herramientas auxiliares) | **NO (Inalcanzable)** | Ningún módulo en `server/`, `services/`, o controladores de API importa `underscore`. No forma parte del grafo de ejecución de la aplicación. |
| `ws` | `8.17.x` | High | GHSA-96hv-2xvq-fx4p, GHSA-58qx-3vcg-4xpx | `socket.io` → `engine.io` → `ws` | **Mitigado / Controlado** | Afecta deserialización de micro-fragmentos en WebSockets abiertos. En MagnusOS2, `socketAuthMiddleware` requiere JWT válido antes del handshake; requests anónimos son desconectados inmediatamente. |

---

## 3. Justificación de Rechazo de `npm audit fix --force`

El comando `npm audit fix --force` propone degradar componentes nucleares de la aplicación (incluyendo `react@16.14.0` debido a `react-simple-maps@1.0.0`), lo cual causaría:

- Pérdida de hooks y compatibilidad con `framer-motion`, `recharts` y el ecosistema React 18.
- Regresión catastrófica en el frontend compilado.
- Incompatibilidad de tipos en TypeScript.

Por tanto, no se empleará `npm audit fix --force`. Las actualizaciones compatibles deben realizarse de forma controlada y los riesgos que no puedan corregirse de inmediato deben mantenerse como deuda explícita de producción.
