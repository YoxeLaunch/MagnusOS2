# MAGNUSOS2 — AUDITORÍA DE DEPENDENCIAS Y MATRIZ DE ALCANZABILIDAD (F-07)

**Fecha:** 2026-10-04  
**Rama:** `phase2/final-remediation`  
**Entorno de análisis:** Producción (`npm audit --omit=dev`)  
**Directiva de seguridad:** Prohibición absoluta de `npm audit fix --force` para evitar rotura de dependencias pares (`react-simple-maps` vs `react 18`).

---

## 1. Resumen Ejecutivo

La auditoría de dependencias en modo producción (`--omit=dev`) identificó 39 advertencias en dependencias transitivas. Tras el análisis estático de código y rastreo de flujo de ejecución (data flow & call graph analysis), se determinó que:

1. **Cero dependencias directas vulnerables:** Ningún paquete de primer nivel en `dependencies` presenta vulnerabilidades directas explotables en código propio.
2. **Superficie de ataque no alcanzable (Unreachable in Runtime):** El 100% de las dependencias críticas (`tar`, `underscore`, `uuid`) pertenecen a herramientas de compilación (`node-gyp`), scripts de instalación o utilidades auxiliares que no procesan entrada del usuario en runtime.
3. **Mitigaciones activas en runtime (Defense in Depth):** Para `ws` (usado internamente por `socket.io`), el middleware `socketAuthMiddleware` rechaza conexiones no autenticadas en el handshake HTTP antes de procesar frames de WebSocket, neutralizando vectores DoS no autenticados.

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

Por tanto, preservar la integridad arquitectónica y documentar la inalcanzabilidad de las dependencias transitivas es la postura de ingeniería correcta y segura.
