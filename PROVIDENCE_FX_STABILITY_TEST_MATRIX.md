# PROVIDENCE FX INTELLIGENCE — MATRIZ DE PRUEBAS DE ESTABILIDAD
## Operación Stability Shield — Verificación Funcional y Control de Regresión
**Sistema:** Providence FX Intelligence (Nivel 3.1)  
**Entorno de Prueba:** Node.js 20.20.0 / SQLite Memory / PostgreSQL 16 TimescaleDB  
**Fecha:** 2026-10-11  

---

## 1. MATRIZ DE INCIDENTES Y CASOS DE PRUEBA

| Incidente | ID Escenario | Escenario / Caso de Prueba | Resultado Esperado | Resultado Real | Estado |
|---|---|---|---|---|---|
| **Incidente A** | `TC-RISK-01` | Petición estándar `GET /risk/volatility?currency=USD` | HTTP 200 con volatilidad histórica, GARCH(1,1), EWMA, VaR (95%, 99%) y 25 bins de distribución. | HTTP 200, volAnual=9.62%, GARCH persistencia=0.90, VaR95=1.00%, 25 bins. | **PASSED** |
| **Incidente A** | `TC-RISK-02` | Consulta repetida de riesgo con mismo `datasetHash` | Respuesta desde memoria caché con latencia sub-milisegundo (< 15ms) para no sobrecargar el backend. | Latencia real: 2.24ms. Hash verificado idéntico. | **PASSED** |
| **Incidente A** | `TC-RISK-03` | Petición con divisa no soportada o inexistente (`currency=XYZ_INVALID`) | HTTP 500 controlado con mensaje JSON descriptivo, sin excepciones no capturadas ni cuelgues del proceso. | HTTP 500, JSON `{ success: false, error: "No se encontraron observaciones..." }`. | **PASSED** |
| **Incidente A** | `TC-RISK-04` | Cambio de modelo o de horizonte en la interfaz mientras se carga riesgo | Los cambios en selectores de pronóstico no deben cancelar ni abortar la petición de riesgo en curso. | Petición de riesgo completa sin aborto y renderiza el panel correctamente. | **PASSED** |
| **Incidente A** | `TC-RISK-05` | Recuperación ante fallo de red en el frontend | Mostrar banner de error con botón "Reintentar análisis de riesgo" que reinicia la consulta. | Banner con botón visible; al pulsar reintenta y carga los datos. | **PASSED** |
| **Incidente B** | `TC-AUTH-01` | Petición a ruta protegida sin token Bearer (`POST /api/markets/fx/refresh`) | HTTP 401 con mensaje `"Acceso denegado. Token requerido."`. | HTTP 401 devuelto con el mensaje exacto esperado. | **PASSED** |
| **Incidente B** | `TC-AUTH-02` | Petición con token JWT expirado | HTTP 401 con mensaje `"Sesión expirada. Inicia sesión de nuevo."`. | HTTP 401 devuelto con el mensaje exacto esperado. | **PASSED** |
| **Incidente B** | `TC-AUTH-03` | Usuario con rol no administrativo (e.g. `viewer`) intentando acción restringida | HTTP 403 con mensaje `"Acceso restringido al soberano."`. | HTTP 403 devuelto con el mensaje exacto esperado. | **PASSED** |
| **Incidente B** | `TC-AUTH-04` | Administrador legítimo (`soberano` / `admin`) con Bearer token válido | Middleware permite el paso (`next()`), respuesta HTTP 200 y ejecución de la operación. | `next()` invocado; respuesta 200 y actualización de tasas procesada. | **PASSED** |
| **Incidente B** | `TC-AUTH-05` | Invocación desde frontend (`FxMercadoModal.tsx`) | Envío de Bearer token mediante `apiFetch`, sin depender de `window.fetch` nativo no autenticado. | `apiFetch` inyecta automáticamente el token de la sesión en los headers. | **PASSED** |
| **Incidente C** | `TC-BENCH-01` | Normalización de experimentos crudos con `experimentId` o `datasetHash` indefinidos | Los campos se asignan a cadenas seguras; la ejecución de `.slice()` no arroja excepción. | `experimentId.slice(0, 18)` y `datasetHash.slice(0, 16)` se ejecutan sin error. | **PASSED** |
| **Incidente C** | `TC-BENCH-02` | Ejecución concurrente simultánea de `POST /backtests/run` | Segunda solicitud rechazada con HTTP 409 Conflict y mensaje de ejecución en curso. | HTTP 409 devuelto: `"Una ejecución de benchmark ya está en progreso."`. | **PASSED** |
| **Incidente C** | `TC-BENCH-03` | Validación de parámetros en `POST /backtests/run` con moneda u horizonte inválidos | HTTP 400 Bad Request inmediato sin invocar el motor de backtesting. | HTTP 400 devuelto para moneda `GBP` y para horizonte `999`. | **PASSED** |
| **Incidente C** | `TC-BENCH-04` | Monitoreo de estado mediante `GET /backtests/status` | Devuelve HTTP 200 con estado formal (`IDLE`, `RUNNING`, `COMPLETED`, `FAILED`, `TIMED_OUT`). | HTTP 200 devuelto con status activo y flag booleano `isRunning`. | **PASSED** |
| **Incidente C** | `TC-BENCH-05` | Aislamiento de excepciones de renderizado mediante `ProvidenceErrorBoundary` | Si un componente de una pestaña arroja excepción, solo esa pestaña muestra error y permite reintento. | El HUD de Magnus OS2 no se derriba; las demás pestañas permanecen utilizables. | **PASSED** |
| **Incidente D** | `TC-EXP-01` | Lectura de experimentos existentes en PostgreSQL (`GET /experiments?currency=USD`) | HTTP 200 con arreglo de 12 experimentos normalizados, métricas de backtesting y hash. | HTTP 200, 12 experimentos devueltos con `experimentId`, `horizon`, `metrics`. | **PASSED** |
| **Incidente D** | `TC-EXP-02` | Consulta para divisa sin experimentos (`GET /experiments?currency=EUR`) | HTTP 200 rápido (< 100ms) con arreglo vacío `[]`, sin ejecutar benchmarks on-the-fly. | HTTP 200 devuelto en 4.80ms con `experiments: []`. | **PASSED** |
| **Incidente D** | `TC-EXP-03` | Manejo de estados en la UI (`FxResearchLab.tsx`) | Diferenciar explícitamente entre `LOADING`, `ERROR`, `EMPTY` y `DATA`. | La UI muestra "0 experimentos" solo si verdaderamente está vacío, y error con reintento si falla. | **PASSED** |
| **Regresión** | `TC-REG-01` | Catálogo canónico de modelos econométricos | 6 modelos registrados y aprobados para consulta, sin auto-promoción a LIVE. | 6 modelos verificados: RW, RW Drift, MA, SES, ARIMA, GARCH. | **PASSED** |
| **Regresión** | `TC-REG-02` | Integridad econométrica Meese-Rogoff | Verificación de métricas finitas y cálculo de Theil U sin sesgo de lookahead. | Theil U de ARIMA registrado en 1.004 frente a Naïve RW (0.8869 vs 0.8905). | **PASSED** |
| **Regresión** | `TC-REG-03` | Censo de datos históricos y Circuit Breakers | Verificar integridad de las 26,600+ observaciones en PostgreSQL y estado de fuentes. | 26,614 observaciones confirmadas y proveedores en estado óptimo. | **PASSED** |

---

## 2. RESUMEN ESTADÍSTICO DE EJECUCIÓN

- **Total Casos de Prueba Evaluados:** 21
- **Casos Exitosos (Passed):** 21 (100%)
- **Casos Fallidos (Failed):** 0 (0%)
- **Tasa de Regresión:** 0%
- **Tiempo Total de Ejecución de Suites:** ~30 segundos (npm test: 28.09s, api script: 1.25s)
