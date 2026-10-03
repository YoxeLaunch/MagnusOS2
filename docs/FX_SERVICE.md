# 🏛️ Providence FX Service // Mercado Cambiario Dominicano (USD / DOP)

Servicio de agregación multifiuente, validación cruzada y análisis del mercado de divisas de la República Dominicana, integrado de forma nativa en **Magnus-OS2**.

---

## 1. Visión General & Filosofía de Arquitectura

En la República Dominicana no existe un API público unificado provisto por el sistema financiero estatal o privado para consultar simultáneamente las tasas de cambio de los bancos comerciales. 

Para resolver esta necesidad sin comprometer la estabilidad ni incurrir en bloqueos por peticiones excesivas (*scraping bans*), **Providence FX** implementa una arquitectura desacoplada basada en proveedores independientes, ingesta controlada, normalización canónica, validación cruzada y doble capa de persistencia (Caché en Memoria RAM + Base de Datos PostgreSQL/SQLite).

```
                            ┌─────────────────┐
                            │   FX Scheduler  │ (America/Santo_Domingo)
                            │ Lun-Vie 07–20h  │
                            └────────┬────────┘
                                     │
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
    [TasaRealProvider]      [InfoDolarProvider]     [Yahoo & BCRD Provider]
     (Aggregator API)         (Cheerio DOM)          (Market & Official)
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     ▼
                           Normalization Layer
                       (Aliases & Numeric Sanitization)
                                     │
                                     ▼
                             Validation Engine
                       (Cross-check & Confidence)
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
                  Memory Cache               PostgreSQL
                 (SWR + Lock)             (Deduplicated History)
                        │                         │
                        └────────────┬────────────┘
                                     ▼
                                REST API
                        (/api/markets/fx/usd-dop)
                                     │
                                     ▼
                             Magnus Frontend
                         (Terminal Cambiaria RD)
```

### Clasificación de Cotizaciones (Rate Types)

No todas las cotizaciones son comparables directamente:

* **`MARKET` (Yahoo Finance - DOP=X):** Tasa interbancaria global de referencia macroeconómica.
* **`OFFICIAL_REFERENCE` (Banco Central de la República Dominicana - BCRD):** Tasa spot oficial ponderada de referencia regulatoria.
* **`RETAIL_BANK` (Bancos Comerciales):** Tasas minoristas reales de ventanilla ofrecidas al público (Banreservas, Banco Popular, Banco BHD, Lafise, APAP, etc.).
* **`AGGREGATOR` (TasaReal / InfoDolar):** Plataformas que consolidan cotizaciones del sistema bancario.

---

## 2. Proveedores (Providers)

Cada proveedor hereda de `BaseFxProvider` (`server/services/fx/providers/baseProvider.js`) y opera de forma aislada con:
* **Timeout estricto** (`FX_REQUEST_TIMEOUT_MS=7000`).
* **Reintentos con Backoff Exponencial y Jitter** (`FX_MAX_RETRIES=3`, pausas de 1s y 3s).
* **Circuit Breaker autónomo** (5 fallos consecutivos pasan el estado a `OPEN` durante 15 minutos; luego entra en `HALF_OPEN` para probar recuperación).

### Proveedor 1: TasaReal (`TasaRealProvider`)
* **Endpoint:** `https://tasareal.com/api/v1/rates`
* **Autenticación:** `Authorization: Bearer $TASAREAL_API_KEY`
* **Seguridad:** La API key **NUNCA** se imprime en logs, ni se expone al cliente, ni se versiona en Git. Si `TASAREAL_API_KEY` no está configurada, el proveedor se auto-desactiva de forma silenciosa y segura sin romper la aplicación.

### Proveedor 2: InfoDolar RD (`InfoDolarProvider`)
* **Fuente:** `https://www.infodolar.com.do/`
* **Parser:** **Cheerio DOM Parser** (no regex frágil).
* **Validación:** Extrae exclusivamente `td[data-order]` numéricos dentro de tablas de cotizaciones bancarias.
* **Tolerancia a Fallos:** Si el HTML cambia o la página devuelve menos de 3 entidades válidas, se aborta y se registra el error sin sobreescribir el último dato bueno con ceros o valores nulos.

### Proveedor 3: Yahoo Finance (`YahooProvider`)
* **Ticker:** `DOP=X`
* **Propósito:** Mantener intacta la telemetría histórica y el gráfico de mercado global existente en Magnus.

### Proveedor 4: Banco Central (`BcrdProvider`)
* **Propósito:** Tasa oficial spot de referencia del BCRD.

---

## 3. Normalización & Resolución de Aliases

Diferentes fuentes nombran a las mismas entidades con variaciones léxicas. `server/services/fx/normalizer.js` resuelve estas discrepancias mediante un catálogo canónico (`INSTITUTION_REGISTRY`):

* `"Banco de Reservas"`, `"Banreservas"`, `"Banco Reservas"` ➔ **`banreservas`** (*Banreservas*)
* `"Banco Popular Dominicano"`, `"Popular"`, `"BPD"` ➔ **`popular`** (*Banco Popular*)
* `"Banco BHD León"`, `"BHD"`, `"Banco BHD"` ➔ **`bhd`** (*Banco BHD*)
* `"Asociación Popular de Ahorros y Préstamos"`, `"APAP"` ➔ **`apap`** (*Asociación Popular*)

### Reglas Numéricas & Spread
* `spread = sell - buy`
* `mid = (buy + sell) / 2`
* Se descartan valores fuera del rango plausible de mercado dominicano ($40.00 – $100.00 DOP).

---

## 4. Validación Cruzada & Motor de Confianza (Confidence Engine)

Cuando una entidad es observada por múltiples fuentes activas (ej. TasaReal vs InfoDolar), `validator.js` calcula la diferencia absoluta:
* `differenceBuy = |buy_tasareal - buy_infodolar|`
* `differenceSell = |sell_tasareal - sell_infodolar|`

### Clasificación:
* **`VERIFIED`** ($\le 0.05$ DOP): Concordancia casi exacta. Confianza: **1.00** (100%).
* **`ACCEPTABLE`** ($\le 0.15$ DOP): Discrepancia leve atribuible a minutos de diferencia en la actualización. Confianza: **0.85** (85%).
* **`WARNING`** ($\le 0.50$ DOP): Diferencia notable entre fuentes. Confianza: **0.60** (60%).
* **`CONFLICT`** ($> 0.50$ DOP): Discrepancia severa. Confianza: **0.30** (30%). Ambas observaciones se preservan para auditoría y la entidad se excluye del cálculo de mejores tasas automáticas.
* **`SINGLE_SOURCE`**: Reportado por solo 1 proveedor activo. Confianza: **0.75** (75%).

---

## 5. Caché, SWR y Anti-Stampede

Para proteger a los proveedores externos y brindar tiempos de respuesta de **0 milisegundos**:

1. **Memoria RAM con TTL (60 minutos):** Las peticiones dentro de la ventana de TTL se responden inmediatamente sin tocar la red ni la base de datos.
2. **Stale-While-Revalidate (SWR):** Cuando la caché expira pero existe un dato previo, el servidor entrega inmediatamente el dato anterior marcando `meta.stale = true` y lanza un refresco en segundo plano de manera asíncrona.
3. **Anti-Stampede (Single-Flight Mutex):** Si llegan 100 peticiones concurrentes en el instante en que expira la caché, todas se acoplan a la **misma promesa en vuelo (`activeRefreshPromise`)**. Hacia TasaReal e InfoDolar se despacha únicamente **1 llamada real**.
4. **Límite Máximo Stale (`FX_MAX_STALE_HOURS=24`):** Si un dato supera 24 horas (ej. tras un fin de semana o feriado largo), la UI lo marca con advertencia clara y nunca lo etiqueta como "En vivo".

---

## 6. Persistencia e Histórico

* **Tabla `fx_rate_observations`:** Almacena el histórico discreto por institución.
  * **Deduplicación Inteligente:** No se insertan filas idénticas cada hora; únicamente se añade un nuevo registro si cambió de fecha calendario o si la cotización varió en $\ge 0.01$ DOP.
* **Tabla `fx_provider_healths`:** Guarda la telemetría operativa de cada llamada (latencia en ms, éxito, código HTTP, número de registros extraídos, reintentos y estado de circuit breaker) para auditoría de proveedores.

---

## 7. Reporte de Evaluación TasaReal (Trial de 29 Días)

Para evaluar si conservar TasaReal al finalizar el período de prueba, el endpoint `GET /api/markets/fx/evaluation/tasareal` calcula:
* **Disponibilidad:** Porcentaje de llamadas exitosas sobre el total.
* **Latencia Promedio y P95.**
* **Porcentaje de Concordancia:** Coincidencia de tasas frente a InfoDolar.
* **Recomendación Automatizada:**
  * $\ge 95\%$ disponibilidad $\rightarrow$ `TASAREAL PRIMARY`
  * $\ge 80\%$ disponibilidad $\rightarrow$ `TASAREAL SECONDARY`
  * $< 80\%$ disponibilidad $\rightarrow$ `TASAREAL FALLBACK`

---

## 8. Variables de Entorno (.env)

Configuración recomendada para producción y desarrollo:

```bash
# ---- Providence FX Service ----
TASAREAL_API_KEY=               # Coloca aquí tu clave secreta de TasaReal
TASAREAL_ENABLED=true
INFODOLAR_ENABLED=true
BCRD_ENABLED=true
YAHOO_ENABLED=true

FX_CACHE_TTL_MINUTES=60
FX_ACTIVE_START_HOUR=7
FX_ACTIVE_END_HOUR=20
FX_LATE_REFRESH_HOUR=23

FX_REQUEST_TIMEOUT_MS=7000
FX_MAX_RETRIES=3
FX_CIRCUIT_BREAKER_FAILURES=5
FX_CIRCUIT_BREAKER_COOLDOWN_MINUTES=15
FX_MAX_STALE_HOURS=24

FX_DIFF_VERIFIED=0.05
FX_DIFF_ACCEPTABLE=0.15
FX_DIFF_WARNING=0.50
```

---

## 9. Endpoints de la REST API

| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/markets/fx/usd-dop` | Público | Retorna el estado consolidado de tasas, resumen, benchmarks y estado de fuentes. |
| `GET` | `/api/markets/fx/history/:institution` | Público | Retorna la serie temporal histórica (Line/Step) para una entidad o para el mercado (`general`). |
| `GET` | `/api/markets/fx/evaluation/tasareal` | Interno | Reporte estadístico y auditoría del trial de 29 días de TasaReal. |
| `POST` | `/api/markets/fx/refresh` | Autenticado | Fuerza la revalidación inmediata de todas las fuentes en background. |

---

## 10. Guía Operativa: Cómo Desactivar o Cambiar Proveedores

### Cómo deshabilitar TasaReal tras el trial
Si decides no continuar con la suscripción paga tras los 29 días:
1. En tu archivo `.env`, cambia:
   ```bash
   TASAREAL_ENABLED=false
   ```
2. Reinicia el contenedor (`docker compose restart magnus`).
3. El sistema continuará funcionando al 100% utilizando **InfoDolar** como agregador primario y **Yahoo Finance / BCRD** como referencias sin alterar el frontend ni la base de datos.

### Cómo añadir un proveedor nuevo
1. Crea una clase que extienda `BaseFxProvider` en `server/services/fx/providers/miNuevoProvider.js`.
2. Implementa el método `getRates()`.
3. Normaliza cada entidad con `normalizeRateObservation()`.
4. Regístralo en el constructor de `server/services/fx/fxService.js`.
