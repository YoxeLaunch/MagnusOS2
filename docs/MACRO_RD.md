# CONTEXTO MACRO RD // MAGNUS-OS2
### Arquitectura, Ingestión BCRD, Persistencia, Event Engine y Notificaciones

---

## 1. Resumen Ejecutivo y Misión
El módulo **Contexto Macro RD** integra en **MagnusOS2** (dentro de `/finanza/mercado`) una capa integral de inteligencia macroeconómica para la República Dominicana. Este módulo complementa la telemetría de mercado de **Providence FX** (USD/DOP, EUR/DOP) con indicadores estructurales oficiales del **Banco Central de la República Dominicana (BCRD)**, garantizando:

- **Frecuencias oficiales rigurosas**: Cero confusión entre datos continuos de mercado y series mensuales o por decisión de política monetaria (prohibido "EN VIVO" para indicadores mensuales/trimestrales).
- **Consistencia histórica y revisiones**: Persistencia inmutable de publicaciones oficiales con soporte para revisiones estadísticas.
- **Observabilidad y telemetría**: Registro del estado y latencia de fuentes (*source health*).
- **Magnus Event Engine**: Detección de nuevas publicaciones, revisiones y cambios relevantes con deduplicación estricta por clave de idempotencia.
- **Notification Center**: Campana discreta y no invasiva en la cabecera superior con historial agrupado por fechas y estado de lectura.
- **Métricas Derivadas Transparentes**: Tasa Real Simple y Spread Bancario etiquetados explícitamente como `DERIVED` / `MAGNUS`.

---

## 2. Jerarquía Visual en Mercado (`/finanza/mercado`)
```
MERCADO
│
├── KPI DE MERCADO
│   ├── USD/DOP (Providence FX)
│   ├── EUR/DOP (Providence FX)
│   ├── EUR/USD
│   ├── WTI & Brent
│   └── S&P 500, Oro, etc.
│
├── CONTEXTO MACRO RD (Oficial BCRD)     ← MÓDULO NUEVO
│   ├── Inflación Interanual (5.13% // Agosto 2026)
│   ├── Tasa de Política Monetaria (5.50% // Octubre 2026)
│   ├── Tasa Activa Promedio (14.08% // Agosto 2026)
│   ├── Tasa Pasiva Promedio (7.37% // Agosto 2026)
│   ├── IMAE - Actividad Económica (3.8% // Agosto 2026)
│   ├── Crédito al Sector Privado (7.6% // Agosto 2026)
│   ├── Reservas Internacionales Netas (US$ 15,235.2 MM // Septiembre 2026)
│   ├── USD/DOP Referencia BCRD (RD$ 60.43 // 2 de Octubre 2026)
│   │
│   ├── [Métricas Derivadas // Magnus Capital]
│   │   ├── Tasa Real Simple (+0.37% // TPM - Inflación YoY)
│   │   └── Spread Bancario (+6.71 pp // Activa - Pasiva)
│   │
│   └── [Indicadores Complementarios Expandibles]
│       ├── Inflación Mensual (0.38%)
│       ├── Inflación Subyacente (4.76%)
│       └── Tasa Interbancaria (8.45%)
│
├── MERCADOS GLOBALES
│   ├── Índices
│   ├── Commodities
│   ├── Criptomonedas
│   └── Forex
│
└── Resto de Módulos Financieros
```

---

## 3. Catálogo de Indicadores Oficiales Implementados (Fase 1)

| Indicador ID | Nombre Oficial | Categoría | Frecuencia | Unidad | Tipo Gráfico | Fuente Primaria |
|---|---|---|---|---|---|---|
| `INFLATION_YOY` | Inflación Interanual | `PRICES` | `MONTHLY` | `%` | Line | BCRD Portal / Precios |
| `TPM` | Tasa de Política Monetaria | `MONETARY_POLICY` | `EVENT_DRIVEN` | `%` | Step | BCRD Comunicados PM |
| `RATE_ACTIVE` | Tasa Activa Promedio | `BANKING` | `MONTHLY` | `%` | Line | BCRD Sector Financiero |
| `RATE_PASSIVE` | Tasa Pasiva Promedio | `BANKING` | `MONTHLY` | `%` | Line | BCRD Sector Financiero |
| `IMAE_YOY` | IMAE (Actividad Económica) | `ACTIVITY` | `MONTHLY` | `%` | Line | BCRD Sector Real |
| `PRIVATE_CREDIT_YOY` | Crédito al Sector Privado | `CREDIT` | `MONTHLY` | `%` | Line | BCRD Sector Monetario |
| `RESERVES_NET` | Reservas Internacionales Netas | `EXTERNAL` | `MONTHLY` | `US$ MM` | Line | BCRD Sector Externo |
| `USD_DOP_BCRD` | USD / DOP Referencia Spot | `FX` | `DAILY` | `RD$` | Line | BCRD Mercado Cambiario |
| `INFLATION_MONTHLY` | Inflación Mensual | `PRICES` | `MONTHLY` | `%` | Line | BCRD Precios |
| `INFLATION_CORE` | Inflación Subyacente | `PRICES` | `MONTHLY` | `%` | Line | BCRD Precios |
| `RATE_INTERBANK` | Tasa Interbancaria | `BANKING` | `MONTHLY` | `%` | Line | BCRD Sector Monetario |

---

## 4. Arquitectura Backend & Data Flow

```
                      BANCO CENTRAL DE LA REPÚBLICA DOMINICANA (BCRD)
                                  https://www.bancentral.gov.do/
                                                │
                                                ▼
                                    BcrdMacroProvider
                         (SSRF Allowlist, Cheerio, Regex Filters)
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
             Providence FX Bridge                              MacroSourceHealth
          (USD/DOP & EUR/DOP Spot)                         (Latencia, Estado, Registros)
                       │                                                 │
                       └────────────────────────┬────────────────────────┘
                                                ▼
                                           MacroService
                                 (Single-Flight, Stale SWR Cache)
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
            Persistencia PostgreSQL                            MagnusEventEngine
        (macro_indicators, macro_obs)                      (Evaluación de Umbrales)
                        │                                               │
                        │                               ┌───────────────┴───────────────┐
                        │                               ▼                               ▼
                        │                         MagnusEvent                  MagnusNotification
                        │                    (Idempotency Key)                (Persistencia Lectura)
                        │                               │                               │
                        └───────────────────────┬───────┴───────────────────────────────┘
                                                ▼
                                        Express Controllers
                                     (/api/markets/macro, /api/notifications)
                                                │
                                                ▼
                                     Frontend (React 18 / Vite)
                              (MacroRdSection, Detail Modal, NotificationCenter)
```

---

## 5. Modelos de Base de Datos (PostgreSQL / SQLite)

### `macro_indicators`
- `id`: Identificador canónico (ej. `INFLATION_YOY`, `TPM`).
- `name`: Nombre descriptivo formal.
- `short_name`: Nombre compacto para tarjetas y leyendas.
- `category`: Categoría económica (`PRICES`, `MONETARY_POLICY`, `BANKING`, `ACTIVITY`, `CREDIT`, `EXTERNAL`, `FX`).
- `frequency`: Periodicidad oficial (`DAILY`, `MONTHLY`, `QUARTERLY`, `EVENT_DRIVEN`).
- `unit`: Unidad de medida (`%`, `RD$`, `US$ MM`).
- `preferred_chart_type`: `line` o `step` (escalonado para TPM).
- `magnus_interpretation`: Pauta de interpretación económica institucional.

### `macro_observations`
- `indicator_id`: Clave foránea referencial al indicador.
- `reference_period`: Periodo oficial (ej. `Agosto 2026`, `Octubre 2026`, `2 de Octubre 2026`).
- `value`: Valor oficial publicado.
- `revision`: Número entero secuencial (1 para primera publicación; 2+ para revisiones).
- `original_value`: Valor histórico inicial para preservar la memoria económica sin sobrescrituras destructivas.
- `previous_value`, `change_absolute`, `change_percent`: Deltas calculados frente a la observación previa.
- `is_derived`: Booleano para distinguir observaciones oficiales de cálculos analíticos internos.
- `metadata`: Objeto JSON con detalles complementarios (ej. inflación acumulada, spread spot compra/venta, etc.).
- Restricción única: `(indicator_id, reference_period)` impide duplicación de observaciones.

### `magnus_events`
- `id`: UUID.
- `event_type`: `NEW_PUBLICATION`, `VALUE_CHANGE`, `RELEVANT_CHANGE`, `REVISION`, `ANOMALY`.
- `domain`: `MACRO_RD` o `PROVIDENCE_FX`.
- `severity`: `INFO`, `WATCH`, `IMPORTANT`, `CRITICAL`.
- `idempotency_key`: `domain:indicatorId:referencePeriod:newValue:eventType` para deduplicación matemática absoluta.

### `magnus_notifications`
- `id`: UUID.
- `is_read`, `read_at`: Control de lectura para el usuario.
- `link_url`: Ruta navegable (ej. `/finanza/mercado`).

---

## 6. Configuración de Umbrales (`server/config/macro-events.json`)
Los umbrales de severidad son configurables y no están hardcodeados en el código:
```json
{
  "thresholds": {
    "TPM": {
      "watchDelta": 0.25,
      "importantDelta": 0.50,
      "unit": "pp"
    },
    "INFLATION_YOY": {
      "watchDelta": 0.20,
      "importantDelta": 0.50,
      "unit": "pp"
    },
    "USD_DOP_BCRD": {
      "watchPercent": 0.50,
      "importantPercent": 1.00,
      "unit": "%"
    }
  }
}
```

---

## 7. Planificador Inteligente (`macroSchedulerJob.js`)
Para no sobrecargar los servidores del BCRD ni realizar consultas redundantes:
- **Horario Laboral Bancario RD**: Sondeo a las **08:30** y **16:30** de Lunes a Viernes (`America/Santo_Domingo`).
- **Ventana de Política Monetaria**: Chequeo especial programado para los días **28 al 31 de cada mes a las 20:00**, momento habitual en que el Comité de Operaciones de Mercado Abierto emite sus comunicados oficiales de TPM.
- **SWR en Memoria**: TTL de 60 minutos para peticiones de usuarios; 100 visitas simultáneas a `/finanza/mercado` **NO** generan 100 peticiones al BCRD gracias al Single-Flight Promise Lock.

---

## 8. Endpoints API REST

### `GET /api/markets/macro`
Devuelve el resumen completo consolidado de los 8 KPIs principales, indicadores complementarios, métricas derivadas y estado de salud de la fuente BCRD.
- Soporta `?force=true` para administradores.

### `GET /api/markets/macro/indicator/:indicatorId?range=1Y`
Devuelve el histórico y metadatos del indicador solicitado con rangos `1Y`, `3Y`, `5Y` o `ALL`.

### `POST /api/markets/macro/refresh`
Fuerza la sincronización inmediata con las fuentes oficiales y actualiza la base de datos.

### `GET /api/notifications`
Obtiene las notificaciones con el conteo `unreadCount`.

### `PATCH /api/notifications/:id/read`
Marca una notificación específica como leída.

### `POST /api/notifications/read-all`
Marca todas las notificaciones pendientes como leídas.

---

## 9. Cómo Agregar un Nuevo Indicador Macroeconómico
1. **Definir en Catálogo**: Agregar el objeto con metadatos en `MASTER_INDICATORS` en [macroService.js](file:///home/osvaldo/proyectos/sistema-m/Magnus-OS2/server/services/macro/macroService.js).
2. **Definir Extracción**: Añadir el extractor semántico en `fetchMacroIndicators()` de [bcrdMacroProvider.js](file:///home/osvaldo/proyectos/sistema-m/Magnus-OS2/server/services/macro/bcrdMacroProvider.js) asociando el `indicatorId`.
3. **Configurar Umbrales**: Agregar el umbral de alerta en [macro-events.json](file:///home/osvaldo/proyectos/sistema-m/Magnus-OS2/server/config/macro-events.json).
4. El sistema automáticamente sincronizará la definición en la base de datos, calculará deltas, detectará eventos y lo presentará en la UI.
