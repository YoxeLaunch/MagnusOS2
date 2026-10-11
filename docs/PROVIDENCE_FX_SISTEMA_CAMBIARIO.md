# 🏛️ PROVIDENCE FX // Motor Cambiario Inteligente (USD & EUR / DOP)
**Ecosistema Magnus OS2 / Sistema M — República Dominicana**  
*Documento de Arquitectura, Funcionamiento Técnico y Hoja de Ruta para Equipos de Ingeniería*

---

## 📋 1. Resumen Ejecutivo

### 1.1. El Problema
En la República Dominicana no existe un API unificado provisto por el sistema financiero estatal o privado que exponga simultáneamente y en tiempo real las cotizaciones de divisas de las diferentes entidades bancarias comerciales. La información está dispersa entre múltiples portales con formatos heterogéneos, riesgos de bloqueo por peticiones continuas (*rate limits / anti-bot*), y discrepancias horarias entre la tasa oficial del regulador y las ventanillas bancarias.

### 1.2. La Solución: Providence FX
**Providence FX** es el motor cambiario institucional integrado en **Magnus-OS2**. Funciona como un orquestador multicanal que ingesta, limpia, valida de forma cruzada y consolida las cotizaciones de **USD/DOP** y **EUR/DOP** del mercado dominicano.

### 1.3. Principios de Diseño
* **Tolerancia a fallos de grado bancario:** Si una o más fuentes externas caen, el sistema degrada con gracia hacia cachés vivas o snapshots persistidos sin interrumpir la operación del usuario.
* **Cero sobrecarga (*Anti-Stampede*):** Implementa concurrencia protegida mediante *Single-Flight Mutex* y política *Stale-While-Revalidate (SWR)*, respondiendo en **0 ms** desde memoria y ejecutando una única consulta remota compartida.
* **Consenso algorítmico:** No asume que un proveedor tiene la verdad absoluta; cruza cotizaciones entidad por entidad y calcula un puntaje de confianza probabilístico.
* **Respeto regulatorio y analítico:** Distingue rigurosamente entre tasas de ventanilla comercial (`RETAIL_BANK`), tasa oficial del Banco Central (`OFFICIAL_REFERENCE`) y precio spot interbancario (`MARKET`).

---

## 🏗️ 2. Arquitectura General del Sistema

El flujo completo desde las fuentes externas hasta el usuario final se estructura en capas desacopladas:

```
                                  PROVIDENCE FX ENGINE
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                        │
│   [ TasaReal API ]      [ InfoDolar DOM ]     [ BCRD Oficial ]     [ Yahoo Finance ]   │
│   (Bearer Token)        (Cheerio Scraping)    (API Comunitaria)    (Spot DOP=X/EUR=X)  │
│          │                      │                    │                     │           │
│          └──────────────┬───────┴────────────┬───────┴─────────────────────┘           │
│                         ▼                    ▼                                         │
│            ┌──────────────────────────────────────────────┐                            │
│            │ 1. CAPA DE RESILIENCIA (BaseFxProvider)      │                            │
│            │    - Circuit Breaker (CLOSED/OPEN/HALF_OPEN) │                            │
│            │    - Timeout estricto (7000 ms)              │                            │
│            │    - Reintentos con Backoff Exponencial      │                            │
│            └──────────────────────┬───────────────────────┘                            │
│                                   ▼                                                    │
│            ┌──────────────────────────────────────────────┐                            │
│            │ 2. MOTOR DE NORMALIZACIÓN (normalizer.js)    │                            │
│            │    - Catálogo canónico (INSTITUTION_REGISTRY)│                            │
│            │    - Resolución de aliases y diacríticos     │                            │
│            │    - Validación de cotas de precio plausibles│                            │
│            └──────────────────────┬───────────────────────┘                            │
│                                   ▼                                                    │
│            ┌──────────────────────────────────────────────┐                            │
│            │ 3. MOTOR DE CONSENSO (validator.js)          │                            │
│            │    - Agrupación por institución              │                            │
│            │    - Cálculo de discrepancia Δ compra/venta  │                            │
│            │    - Estados: VERIFIED, WARNING, CONFLICT... │                            │
│            │    - Score de confianza (0.30 - 1.00)        │                            │
│            └──────────────────────┬───────────────────────┘                            │
│                                   ▼                                                    │
│            ┌──────────────────────────────────────────────┐                            │
│            │ 4. ORQUESTADOR DE MERCADO (fxService.js)     │                            │
│            │    - SWR Cache (TTL configurable: 60m)       │                            │
│            │    - Single-Flight Promise Lock por par      │                            │
│            │    - Benchmark triangular: EUR/USD x USD/DOP │                            │
│            │    - Detección de mejores tasas (Best Buy/Sell)│                          │
│            └──────────────┬───────────────────────────────┘                            │
│                           │                                                            │
│             ┌─────────────┴─────────────┐                                              │
│             ▼                           ▼                                              │
│   ┌───────────────────┐       ┌───────────────────┐                                    │
│   │ Memoria RAM (Map) │       │ Base de Datos     │                                    │
│   │ Snapshot vivo     │       │ PostgreSQL/SQLite │                                    │
│   │ Respuestas 0 ms   │       │ FxRateObservation │                                    │
│   └─────────┬─────────┘       └─────────┬─────────┘                                    │
│             │                           │                                              │
│             └─────────────┬─────────────┘                                              │
│                           ▼                                                            │
│                  API REST / CONTROLLERS                                                │
│               (/api/markets/fx/usd-dop, etc.)                                          │
│                           │                                                            │
│                           ▼                                                            │
│                    CLIENTES FRONTEND                                                   │
│           (Magnus OS2 Hub, Banking Context, 3DS)                                       │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 3. Proveedores de Datos (Data Providers)

Todos los proveedores heredan de la clase base `BaseFxProvider` (`server/services/fx/providers/baseProvider.js`), lo que les otorga capacidades estandarizadas de resiliencia.

| Proveedor | Identificador | Tipo de Ingesta | Destino / URL | Monedas | Rol Principal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TasaReal** | `tasareal` | API REST JSON | `https://tasareal.com/api/v1/rates` | USD, EUR | Cotizaciones agregadas de bancos comerciales con metadatos. |
| **InfoDolar RD** | `infodolar` | Scraping DOM (Cheerio) | `https://www.infodolar.com.do/` | USD, EUR | Extracción directa de cotizaciones bancarias de ventanilla. |
| **Banco Central (BCRD)** | `bcrd` | REST API | `https://api.dominicanaapi.com/v1/bcrd/tasa-cambio` | USD, EUR | Tasa oficial spot ponderada del ente regulador. |
| **Yahoo Finance** | `yahoo` | API de Mercado | Yahoo Finance (`DOP=X`, `EURDOP=X`, `EURUSD=X`) | USD, EUR | Benchmark interbancario global y cálculo de tasas implícitas. |

---

## 🛡️ 4. Mecanismos de Resiliencia y Rendimiento

### 4.1. Patrón Circuit Breaker (Interruptor de Fallos)
Para evitar que un proveedor caído degrade el servidor:
* **`CLOSED` (Operación Normal):** Las peticiones fluyen libremente hacia la fuente externa.
* **`OPEN` (Circuito Abierto):** Si ocurren **5 fallos consecutivos**, el circuito se interrumpe. Las llamadas subsiguientes se rechazan de inmediato sin consumir tiempo ni recursos de red durante un período de enfriamiento (*cooldown*) de **15 minutos**.
* **`HALF_OPEN` (Prueba de Recuperación):** Transcurridos los 15 minutos, el motor despacha una única petición de sondeo. Si tiene éxito, el circuito vuelve a `CLOSED`; si falla, regresa a `OPEN`.

### 4.2. Timeouts y Reintentos Inteligentes
* **Timeout estricto:** 7,000 ms por petición mediante `AbortController`.
* **Reintentos:** Hasta 3 intentos automáticos con retroceso exponencial (*exponential backoff*) y fluctuación aleatoria (*jitter*) para no sobrecargar el destino.

### 4.3. Stale-While-Revalidate (SWR) & Anti-Stampede Lock
* **Caché en RAM:** Las cotizaciones se almacenan en un `Map` indexado por par (`USD/DOP` y `EUR/DOP`) con un TTL nominal de 60 minutos.
* **SWR:** Si un cliente consulta y el TTL expiró, el servidor responde en **0 ms** con el dato en memoria marcado con `meta.stale = true` y lanza de manera asíncrona la revalidación en segundo plano.
* **Single-Flight Mutex:** Si 200 usuarios solicitan el refresco simultáneamente, Providence FX bloquea la concurrencia a nivel de par (`activeRefreshPromises.get(pair)`). Todas las peticiones esperan y resuelven sobre la **misma promesa en vuelo**, evitando peticiones redundantes contra los servidores de origen.

---

## 🏷️ 5. Capa de Normalización Canónica

Diferentes fuentes nombran a las entidades financieras con variantes léxicas o acrónimos. La capa `normalizer.js` resuelve estas variaciones contra el registro oficial `INSTITUTION_REGISTRY`:

```javascript
// Ejemplos de mapeo canónico en INSTITUTION_REGISTRY
{ id: 'banreservas', aliases: ['banreservas', 'banco de reservas', 'banco reservas', 'reservas'] }
{ id: 'popular',     aliases: ['popular', 'banco popular', 'banco popular dominicano', 'bpd'] }
{ id: 'bhd',         aliases: ['bhd', 'banco bhd', 'banco bhd leon', 'bhd leon'] }
{ id: 'scotiabank',  aliases: ['scotiabank', 'scotia', 'banco scotiabank'] }
{ id: 'santa_cruz',  aliases: ['santa cruz', 'banco santa cruz', 'bsc'] }
{ id: 'promerica',   aliases: ['promerica', 'banco promerica'] }
{ id: 'banesco',     aliases: ['banesco', 'banco banesco'] }
{ id: 'lafise',      aliases: ['lafise', 'banco lafise', 'banco lafise dominicana'] }
```

### Reglas Numéricas Aplicadas
1. **Sanitización de cadenas:** Normalización Unicode NFD (remoción de tildes y diacríticos) y conversión a minúsculas antes de la comparación.
2. **Cálculo de métricas derivadas:**
   $$\text{Spread} = \text{Tasa Venta} - \text{Tasa Compra}$$
   $$\text{Mid Price} = \frac{\text{Tasa Compra} + \text{Tasa Venta}}{2}$$
3. **Filtro de admisibilidad:** Descarte automático de observaciones anómalas fuera del rango plausible para el mercado dominicano (por defecto, $40.00 \le \text{tasa} \le 100.00$ DOP).

---

## ⚖️ 6. Motor de Validación Cruzada y Scoring de Confianza

Cuando múltiples proveedores reportan cotizaciones para una misma entidad financiera (ej. TasaReal vs InfoDolar), `validator.js` calcula la diferencia máxima observada:

$$\Delta_{\text{compra}} = |\text{compra}_A - \text{compra}_B|, \quad \Delta_{\text{venta}} = |\text{venta}_A - \text{venta}_B|$$

$$\Delta_{\text{máx}} = \max(\Delta_{\text{compra}}, \Delta_{\text{venta}})$$

### Tabla de Estados y Ponderación de Confianza:

| Estado de Validación | Condición Numérica ($\Delta$) | Nivel de Confianza | Interpretación en Plataforma |
| :--- | :--- | :--- | :--- |
| **`VERIFIED`** | $\Delta \le 0.05$ DOP | **1.00 (100%)** | Coincidencia exacta entre fuentes independientes. Dato certificado. |
| **`ACCEPTABLE`** | $0.05 < \Delta \le 0.15$ DOP | **0.85 (85%)** | Desfase mínimo, usualmente atribuible a minutos de diferencia en actualización. |
| **`WARNING`** | $0.15 < \Delta \le 0.50$ DOP | **0.60 (60%)** | Discrepancia notable entre proveedores. Se presenta advertencia visual. |
| **`CONFLICT`** | $\Delta > 0.50$ DOP | **0.30 (30%)** | Conflicto severo entre fuentes. Requiere revisión manual o exclusión. |
| **`SINGLE_SOURCE`** | Observado en solo 1 fuente | **0.75 (75%)** | Dato válido de un único proveedor activo sin contraste disponible. |

---

## 📐 7. Motor Analítico & Benchmark Triangular (EUR/DOP)

Además de registrar cotizaciones bancarias de ventanilla, Providence FX implementa un modelo de **arbitraje sintético internacional** para el euro:

$$\text{EUR/DOP}_{\text{implícito}} = (\text{EUR/USD}) \times (\text{USD/DOP})$$

* **Propósito:** Permite auditar si el *spread* aplicado por la banca local sobre el euro responde al valor real del mercado internacional de divisas o a un sobreprecio de intermediación local.
* **Clasificación de Mejores Tasas:**
  * **`bestToBuy`:** Entidad con la **menor tasa de venta** (donde al cliente le cuesta menos adquirir divisas).
  * **`bestToSell`:** Entidad con la **mayor tasa de compra** (donde el cliente recibe más pesos dominicanos al vender sus divisas).

---

## ⏰ 8. Planificador Automatizado & Persistencia Inteligente

### 8.1. Scheduler de Horario Bancario (`fxSchedulerJob.js`)
Configurado estrictamente en la zona horaria oficial `America/Santo_Domingo`:
* **Lunes a Viernes (07:00 – 20:00):** Se ejecuta al minuto `0` de cada hora (`0 7-20 * * 1-5`) sincronizando concurrentemente USD/DOP y EUR/DOP.
* **Cierre Diario (23:00):** Ejecución a las `23:00` (`0 23 * * 1-5`) para fijar la cotización oficial de cierre de jornada.

### 8.2. Deduplicación en Base de Datos (`FxRateObservation`)
Para no inflar la base de datos con millones de registros idénticos si los bancos mantienen sus pizarras sin cambios:
* Solo se inserta una nueva fila si:
  1. Cambió el día calendario (corte diario asegurado), **O**
  2. La cotización de compra o venta varió en al menos $\ge 0.01$ DOP con respecto al último registro de ese banco, **O**
  3. Hubo cambio en el estado de validación (`validationStatus`).

---

## 📡 9. Catálogo de Endpoints de la API REST

Los endpoints se exponen a través del router de mercado de Magnus OS2 (`/api/markets`):

### 9.1. Tasas Consolidadas USD/DOP
* **Ruta:** `GET /api/markets/fx/usd-dop`
* **Acceso:** Público / Autenticación Opcional
* **Cabecera:** `Cache-Control: public, max-age=60`

```json
{
  "pair": "USD/DOP",
  "baseCurrency": "USD",
  "quoteCurrency": "DOP",
  "generatedAt": "2026-10-10T18:00:00.000Z",
  "summary": {
    "avgBuy": 60.12,
    "avgSell": 60.45,
    "avgSpread": 0.33,
    "institutionsCount": 14,
    "bestToBuy": {
      "institutionId": "banreservas",
      "institutionName": "Banreservas",
      "rate": 60.38,
      "validationStatus": "VERIFIED"
    },
    "bestToSell": {
      "institutionId": "popular",
      "institutionName": "Banco Popular",
      "rate": 60.18,
      "validationStatus": "VERIFIED"
    }
  },
  "reference": {
    "market": { "price": 60.25, "change": 0.05, "ticker": "DOP=X" },
    "official": { "buy": 60.11, "sell": 60.42, "provider": "bcrd" }
  },
  "banks": [
    {
      "institutionId": "banreservas",
      "institutionName": "Banreservas",
      "buy": 60.15,
      "sell": 60.38,
      "spread": 0.23,
      "validationStatus": "VERIFIED",
      "confidence": 1.0,
      "providers": ["tasareal", "infodolar"]
    }
  ],
  "meta": {
    "cache": true,
    "stale": false,
    "ageMinutes": 12
  }
}
```

### 9.2. Tasas Consolidadas EUR/DOP
* **Ruta:** `GET /api/markets/fx/eur-dop`
* **Particularidad:** Incluye el bloque `reference.implied` con el benchmark triangular internacional.

### 9.3. Consulta Parametrizada por Par
* **Ruta:** `GET /api/markets/fx/pair/:pair`
* **Parámetros:** `:pair` puede ser `usd-dop`, `eur-dop`, `USD/DOP` o `EUR/DOP`.

### 9.4. Serie Histórica de Cotizaciones
* **Ruta:** `GET /api/markets/fx/history/:institution?days=30&currency=USD`
* **Parámetros:**
  * `:institution`: Identificador del banco (ej. `banreservas`, `popular`, o `general` para el promedio del mercado).
  * `days`: Número de días a recuperar (por defecto `30`, máx. `365`).
  * `currency`: `USD` o `EUR`.

### 9.5. Evaluación de Salud y Trial de Proveedor (TasaReal)
* **Ruta:** `GET /api/markets/fx/evaluation/tasareal?days=29`
* **Retorna:** SLA de disponibilidad (`availabilityPercent`), latencia media y P95, tasa de coincidencia contra InfoDolar y recomendación operativa (`PRIMARY`, `SECONDARY` o `FALLBACK`).

### 9.6. Refresco Forzado
* **Ruta:** `POST /api/markets/fx/refresh`
* **Acceso:** Protegido (requiere token JWT activo). Fuerza la ejecución inmediata de la llamada a los proveedores externos ignorando la caché.

---

## 🚀 10. Hoja de Ruta y Opciones de Refinamiento Futuro

Para escalar o profundizar las capacidades de Providence FX, se identifican las siguientes áreas de evolución:

### 10.1. Emisión en Tiempo Real vía WebSockets / SSE
* **Estado Actual:** El frontend sondea periódicamente cada pocos minutos mediante peticiones HTTP.
* **Propuesta de Refinamiento:** Utilizar la instancia de Socket.IO ya activa en el servidor de Magnus OS2 (`:4000`) para emitir un evento `fx:tick` cada vez que el cron detecte variaciones significativas o cambio de liderazgo en las mejores tasas de compra/venta.

### 10.2. Integración Directa con la Superintendencia de Bancos (SB RD)
* **Propuesta de Refinamiento:** Conectar las cotizaciones de ventanilla con las estadísticas de la **API v2 de la SB**, cruzando el tipo de cambio diario con el volumen de captaciones, cartera de crédito en moneda extranjera y tasas activas/pasivas promedio ponderadas del sistema financiero.

### 10.3. Conectores Directos a Portales Bancarios Clave
* **Propuesta de Refinamiento:** Diseñar adaptadores dedicados para consultar directamente los endpoints JSON públicos que utilizan los portales web de **Banreservas** y **Banco Popular Dominicano**. Esto reduce la intermediación de terceros y blinda el sistema en caso de caídas de agregadores externos.

### 10.4. Alertas Push y Automatizaciones (n8n / Telegram)
* **Propuesta de Refinamiento:** Crear un servicio de suscripción donde los usuarios configuren reglas de disparo (ej. *"Notificarme si la tasa de venta del dólar baja de RD$ 60.30"*), despachando mensajes automáticos a través del contenedor `n8n` ya integrado en el servidor.

### 10.5. Soporte para Dólar Canadiense (CAD) y Agentes de Remesas
* **CAD/DOP:** Vital para análisis en sectores de turismo y comercio exterior.
* **Módulo de Remesadoras:** Incorporar entidades especializadas en remesas familiares (Caribe Express, Western Union, Vimenca), cuyas tasas difieren habitualmente de la banca múltiple comercial.

---

## 📂 11. Ubicación de Archivos en el Repositorio

| Rol / Módulo | Ruta en el Proyecto |
| :--- | :--- |
| **Orquestador Principal** | `Magnus-OS2/server/services/fx/fxService.js` |
| **Constantes y Tipos** | `Magnus-OS2/server/services/fx/types.js` |
| **Motor de Normalización** | `Magnus-OS2/server/services/fx/normalizer.js` |
| **Motor de Validación** | `Magnus-OS2/server/services/fx/validator.js` |
| **Clase Base & Circuit Breaker** | `Magnus-OS2/server/services/fx/providers/baseProvider.js` |
| **Proveedor TasaReal** | `Magnus-OS2/server/services/fx/providers/tasaRealProvider.js` |
| **Proveedor InfoDolar** | `Magnus-OS2/server/services/fx/providers/infoDolarProvider.js` |
| **Proveedor BCRD** | `Magnus-OS2/server/services/fx/providers/bcrdProvider.js` |
| **Proveedor Yahoo Finance** | `Magnus-OS2/server/services/fx/providers/yahooProvider.js` |
| **Planificador Cron** | `Magnus-OS2/server/jobs/fxSchedulerJob.js` |
| **Modelo de Observaciones** | `Magnus-OS2/server/models/fxObservation.js` |
| **Modelo de Salud/SLA** | `Magnus-OS2/server/models/fxProviderHealth.js` |
| **Controlador y Rutas HTTP** | `Magnus-OS2/server/controllers/marketController.js` y `server/routes/market.routes.js` |
| **Componentes Frontend** | `Magnus-OS2/src/apps/finanza/components/MarketIntel.tsx` y `FxMercadoModal.tsx` |

---
*Documentación oficial generada para el equipo técnico de Magnus System & Providence Architecture.*
