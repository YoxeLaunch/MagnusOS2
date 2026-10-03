# Módulo de Energía RD // Combustibles y Mercado Energético Dominicano
**MagnusOS2 • Providence Market Intelligence Ecosystem**  
**Fecha:** Octubre 2026  
**Autor:** Magnus System & Providence Architecture Team

---

## 1. Resumen Ejecutivo

El módulo **Energía RD** incorpora dentro de la terminal de Mercado de MagnusOS2 (`/finanza/mercado`) el monitoreo institucional, estructurado y en tiempo real de los precios oficiales de venta al público de los hidrocarburos en la República Dominicana, la estructura de costos regulada por la **Ley 112-00** y **Ley 495-06**, los subsidios extraordinarios aplicados por el Estado Dominicano y su relación analítica con los precios internacionales del crudo (**WTI**, **Brent**) y el tipo de cambio oficial (**USD/DOP**).

---

## 2. Jerarquía Visual y Arquitectura en MagnusOS2

Dentro de la arquitectura de mercado, **Energía RD** se ubica como el puente natural entre la macroeconomía local y las materias primas globales:

```
MERCADO (/finanza/mercado)
│
├── KPI DE MERCADO EN VIVO
│   ├── USD/DOP Spot & BCRD (Providence FX)
│   ├── EUR/DOP Spot & BCRD
│   ├── Petróleo WTI (CL=F)
│   └── Petróleo Brent (BZ=F)
│
├── CONTEXTO MACRO RD
│   └── Indicadores Fundamentales BCRD (TPM, IPC YoY, Tasas, IMAE, Reservas)
│
├── ENERGÍA RD (NUEVO)
│   ├── Precios Oficiales Semanales (Gasolinas, Gasoils, GLP, Gas Natural)
│   ├── Estructura de Costos Regulada (Paridad, Impuestos, Márgenes, Subsidios)
│   ├── Subsidio Semanal Extraordinario del Gobierno Dominicano
│   ├── Indicador Analítico: Presión Energética (Magnus Derived)
│   ├── Gráfico Escalonado (Step Chart) Histórico Semanal
│   └── Gráfico de Contexto Normalizado Base 100 (Combustible vs WTI vs USD/DOP)
│
└── MERCADOS GLOBALES
    ├── Índices Bursátiles (S&P 500, Nasdaq, VIX)
    └── Commodities & Forex
```

---

## 3. Fuentes Oficiales Auditadas e Ingestadas

Para garantizar absoluta fidelidad institucional, el módulo consume exclusivamente fuentes oficiales de primer orden:

1. **Avisos Oficiales Semanales de Precios de Combustibles (MICM):**
   - **URL:** `https://micm.gob.do/direcciones/combustibles/avisos-semanales-de-precios/avisos-semanales-de-precios-de-combustibles/`
   - **Formato:** Documentos PDF vectoriales nativos publicados semanalmente bajo el Artículo 8 de la Ley de Hidrocarburos No. 112-00 y Ley No. 37-17 / 10-21.
   - **Extracción:** Parseo directo de texto estructurado mediante `pdf-parse` (sin OCR, cero alucinación). Extrae paridad de importación, impuestos ad-valorem, márgenes de distribución y detalle, flete de transporte, ajuste de la Res. 201-14 (subsidio) y precio final al público.
2. **Avisos Semanales Oficiales de Gas Natural (MICM):**
   - **URL:** `https://micm.gob.do/direcciones/combustibles/avisos-semanales-de-precios/avisos-semanales-de-precios-de-gas-natural/`
   - **Formato:** PDF oficial con precio en **RD$/m³** y RD$/MMBtu para Gas Natural Vehicular (GNV).
3. **Catálogo Histórico de Datos Abiertos (MICM Transparencia / datos.gob.do):**
   - **URL:** `https://micm.gob.do/transparencias/datos-abiertos/precios-de-combustibles/precios-de-combustibles-2010-2026.csv`
   - **Portal:** CKAN `datos.gob.do` (Resource ID: `7ab31cf4-aa74-48e4-9153-251224fdc5b0`).
   - **Cobertura:** 872 semanas completas desde el año 2010 hasta el 2026.
4. **Boletines de Prensa y Presidencia RD (Subsidios Semanales Globales):**
   - Registro de transferencias fiscales extraordinarias en millones de pesos (ej. RD$ 1,490.9 MM para la semana 03 al 09 de octubre de 2026).

---

## 4. Combustibles Implementados y Unidades

El sistema gestiona 10 hidrocarburos estructurados en dos categorías:

| ID Canónico | Nombre | Categoría | Unidad Explícita | Descripción de Uso |
| :--- | :--- | :--- | :--- | :--- |
| `gasoline_premium` | Gasolina Premium | `PRIMARY` | `RD$/gal` | 95 octanos. Vehículos de alta compresión. |
| `gasoline_regular` | Gasolina Regular | `PRIMARY` | `RD$/gal` | 89 octanos. Parque vehicular liviano particular. |
| `diesel_regular` | Gasoil Regular | `PRIMARY` | `RD$/gal` | Diésel fósil. Transporte de carga y maquinaria. |
| `diesel_optimo` | Gasoil Óptimo | `PRIMARY` | `RD$/gal` | Diésel ULSD bajo azufre. Vehículos modernos. |
| `glp` | Gas Licuado de Petróleo | `PRIMARY` | `RD$/gal` | Propano/Butano. Hogares, comercios y transporte. |
| `natural_gas` | Gas Natural Vehicular | `PRIMARY` | **`RD$/m³`** | Metano comprimido. Flotillas y transporte masivo. |
| `avtur` | Avtur (Jet Fuel) | `SECONDARY` | `RD$/gal` | Turbinas de aviación comercial y militar. |
| `kerosene` | Kerosene | `SECONDARY` | `RD$/gal` | Iluminación y calderas industriales. |
| `fuel_oil_6` | Fuel Oil #6 | `SECONDARY` | `RD$/gal` | Generación termoeléctrica y hornos pesados. |
| `fuel_oil_1s` | Fuel Oil 1% Azufre | `SECONDARY` | `RD$/gal` | Fuel oil bajo azufre para calderas industriales. |

> [!IMPORTANT]
> **Manejo de Unidades:** El sistema no asume galón para todos los productos. El Gas Natural se almacena, valida y representa obligatoriamente en **RD$/m³** tanto en base de datos como en los gráficos de UI.

---

## 5. Modelo de Datos (PostgreSQL & Sequelize)

### Tabla `fuel_catalogs`
Maestro de hidrocarburos reconocidos y su orden de prioridad en UI.
- `id` (PK, `VARCHAR(50)`)
- `name` (`VARCHAR(100)`)
- `short_name` (`VARCHAR(50)`)
- `category` (`PRIMARY` | `SECONDARY`)
- `unit` (`VARCHAR(20)`)
- `priority_order` (`INTEGER`)

### Tabla `fuel_price_observations`
Serie temporal de observaciones oficiales semanales:
- `id` (PK, `SERIAL`)
- `fuel_id` (FK `fuel_catalogs.id`)
- `price_dop` (`DOUBLE PRECISION`): Precio oficial de venta al público en bomba.
- `unit` (`VARCHAR(20)`)
- `previous_price_dop` (`DOUBLE PRECISION`)
- `change_dop` (`DOUBLE PRECISION`)
- `change_percent` (`DOUBLE PRECISION`)
- `valid_from` (`DATE` NOT NULL)
- `valid_to` (`DATE` NOT NULL)
- `published_at` (`TIMESTAMP WITH TIME ZONE`)
- `subsidy_per_unit` (`DOUBLE PRECISION`): Monto absorbido por galón vía Res. 201-14.
- `import_parity_price` (`DOUBLE PRECISION`)
- `tax_ley_112_00` (`DOUBLE PRECISION`)
- `tax_ley_495_06` (`DOUBLE PRECISION`)
- `distribution_margin`, `retail_margin`, `transport_fee` (`DOUBLE PRECISION`)
- `exchange_rate_reference` (`DOUBLE PRECISION`): Tasa bancaria promedio fijada por el MICM.
- **Restricción de unicidad:** `UNIQUE (fuel_id, valid_from)` que garantiza cero observaciones duplicadas.

### Tabla `fuel_policy_weeks`
Resumen de medidas de política económica semanal:
- `id` (PK, `VARCHAR(60)`, ej: `WEEK-2026-10-03-2026-10-09`)
- `valid_from`, `valid_to` (`DATE`)
- `total_subsidy_dop` (`DOUBLE PRECISION`): Monto total semanal reportado por el Gobierno.
- `wti_reference`, `brent_reference`, `usd_dop_reference` (`DOUBLE PRECISION`)
- `government_notes` (`TEXT`)
- `source` (`VARCHAR(60)`)

---

## 6. Métrica Derivada: Presión Energética (Magnus Derived)

El módulo no asume que el precio local deba subir automáticamente cuando sube el WTI debido a los subsidios y la política de congelamiento. Para dar visibilidad analítica sin dogmas, se implementó el indicador:

$$\text{Energy Pressure Score} = 0.65 \times \Delta\% \text{WTI (30d)} + 0.35 \times \Delta\% \text{USD/DOP (30d)}$$

- **Etiquetado:** Siempre visible como `MAGNUS DERIVED`.
- **Interpretación prudente:**
  - Si el score es alcista pero los precios en bomba permanecen fijos: *"La estabilidad local coincide con mayor absorción estatal vía subsidios extraordinarios."*
  - Si el score es bajista: *"La moderación en cotizaciones internacionales reduce la necesidad de transferencias fiscales extraordinarias."*

---

## 7. Scheduler Inteligente y Ventana de Resolución

Dado que los combustibles en República Dominicana se actualizan de forma estrictamente semanal, el planificador opera con cron adaptativo (`node-cron`, zona horaria `America/Santo_Domingo`):

- **Viernes (Ventana Crítica):** Chequeo cada 30 minutos entre 11:00 AM y 5:00 PM (`*/30 11-17 * * 5`).
- **Sábado (Inicio de Vigencia):** Verificación a las 08:00 AM (`0 8 * * 6`).
- **Lunes y Jueves (Cortesía de Baja Frecuencia):** Verificación a las 12:00 PM (`0 12 * * 1,4`).
- **Domingo:** 0 consultas.

---

## 8. Integración con Magnus Event Engine y Notification Center

1. **Agrupación Anti-Spam:**  
   Al procesar una nueva semana con 10 combustibles, el sistema no satura con 10 notificaciones. Genera **1 único evento consolidado**:
   - *Título:* "Combustibles RD: Semana 03–09 Oct"
   - *Mensaje:* "MICM actualizó combustibles: 2 subieron, 1 bajaron y 7 sin cambios mediante subsidio de RD$ 1,490.9 MM."
2. **Deduplicación Estricta:**  
   Clave de idempotencia única: `ENERGY_RD:WEEK:${validFrom}:${count}:FUEL_PRICE_PUBLISHED`.
3. **Centro de Notificaciones:**  
   Aparece de forma nativa en la campana de cabecera de MagnusOS2 con enlace directo a `/finanza/mercado`.

---

## 9. Visualización Gráfica en UI

- **Step Chart (Gráfico Escalonado):**  
  Implementado en Recharts con `type="stepAfter"`. A diferencia de un gráfico lineal continuo, el step chart refleja fielmente la realidad económica: el precio se mantiene fijo durante los 7 días de vigencia y salta instantáneamente el sábado a las 00:00 al comenzar la nueva resolución.
- **Gráfico de Contexto Normalizado Base 100:**  
  Permite comparar en una misma escala la trayectoria porcentual del combustible local frente a los futuros de Petróleo WTI y el tipo de cambio USD/DOP partiendo de 100 al inicio del horizonte seleccionado (`1M`, `3M`, `6M`, `1Y`, `3Y`, `ALL`).

---

## 10. API Endpoints

- `GET /api/markets/energy-rd`: Payload consolidado completo para la terminal.
- `GET /api/markets/energy-rd/fuels`: Listado de combustibles y precios vigentes.
- `GET /api/markets/energy-rd/fuels/:fuelId`: Ficha técnica de un combustible.
- `GET /api/markets/energy-rd/fuels/:fuelId/history?range=1Y`: Serie histórica escalonada y Base 100.
- `GET /api/markets/energy-rd/policy`: Histórico de semanas de política y subsidios.
- `POST /api/markets/energy-rd/sync`: Sincronización forzada bajo demanda.

---

## 11. Cómo Agregar un Nuevo Combustible

1. Añadir la definición en `MASTER_FUELS` en [`server/services/energy/micmFuelProvider.js`](file:///home/osvaldo/proyectos/sistema-m/Magnus-OS2/server/services/energy/micmFuelProvider.js).
2. Especificar `id`, `name`, `shortName`, `category` (`PRIMARY` o `SECONDARY`), `unit` y `priorityOrder`.
3. Mapear el nombre de columna o etiqueta en el parser de PDF o CSV.
4. El sistema sembrará automáticamente el nuevo registro en `fuel_catalogs` en el siguiente ciclo de sincronización sin requerir migraciones manuales.
