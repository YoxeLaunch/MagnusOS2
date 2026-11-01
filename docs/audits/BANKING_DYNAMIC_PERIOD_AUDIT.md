# AUDITORÍA TÉCNICA Y REMEDIACIÓN: GOBERNANZA TEMPORAL DINÁMICA DEL SISTEMA BANCARIO (SB RD)

**Proyecto:** MAGNUS OS 2 — Core Financial Engine  
**Módulo:** Análisis Bancario (`/finanza/banca`) & FX Banking Context  
**Fecha de Auditoría:** 1 de noviembre de 2026  
**Entorno de Trabajo:** Rama aislada `fix/banking-dynamic-period` (Worktree de auditoría independiente)  
**Clasificación de Seguridad:** REGLAS INNEGOCIABLES PROVIDENCE CUMPLIDAS (Sin despliegues, sin migraciones destructivas, sin mutación de PostgreSQL productivo)

---

## 1. RESUMEN EJECUTIVO Y CAUSA RAÍZ

### 1.1 Evidencia del Incidente Detectado
En la interfaz de **Análisis Bancario** (`/finanza/banca`), el bloque regulatorio superior declaraba de forma estática:
> **“Período estadístico oficial — Cierre Agosto 2026”**

Mientras tanto, las tarjetas de KPI inferiores y la tabla de top instituciones ya reflejaban valores reales de:
> **“Cierre Septiembre 2026”**

Esta inconsistencia visual y metodológica generaba desconfianza analítica al mezclar dos cortes de tiempo distintos en la misma vista.

### 1.2 Causa Raíz
1. **Literal Estático en Encabezado:** El componente `BankingSection.tsx` mantenía en su JSX la cadena fija `"Cierre Agosto 2026 (SB)"` sin consultar el corte oficial del backend ni recibir metadatos de sincronización.
2. **Ausencia de Contrato de Metadatos Canónico:** El endpoint `/api/markets/banking/summary` calculaba agregaciones reales desde `public.sb_banking_metrics`, pero no exponía una envoltura `meta` con `referencePeriod`, `freshness`, `syncedAt` ni `institutionCount`.
3. **Hardcodes y Fallbacks Silenciosos en Frontend:**
   - En `BankingContextCard.tsx`: Existían fallbacks silenciosos para DSI (`|| 29.7`), rendimiento pasivo USD (`|| 1.76`) y DOP (`|| 4.09`).
   - En `ResumenTab.tsx`: El KPI de instituciones tenía el número `40` escrito a mano en el JSX (`<div ...>40</div>`), y la gráfica de Market Share calculaba las demás entidades como `"Otras (35)"` (`40 - 5`). En agosto de 2026, el sistema contaba con 39 entidades, mostrando erróneamente 40.
   - En `GeografiaTab.tsx`: El estado local inicializaba con `useState<string>('2026-08')`, quedando desincronizado cuando el backend respondía desde caché sin el campo `periodo`.
   - En `sbBankingController.js`: En los hits de caché en memoria de `/yields` y `/provinces`, el objeto `cached` contenía sólo `data`, omitiendo `periodo` y metadatos.

---

## 2. INVENTARIO COMPLETO DE HALLAZGOS Y CLASIFICACIÓN

Conforme a la taxonomía de la auditoría:
- **A.** Valor literal de producción
- **B.** Fallback silencioso
- **C.** Fixture o prueba
- **D.** Etiqueta fija
- **E.** Cálculo real pero con período incorrecto u omitido en caché
- **F.** Caché legítima con período correctamente identificado

| ID | Archivo | Símbolo / Componente | Valor Detectado | Clasificación | Origen Real Esperado | Impacto | Corrección Aplicada |
|---|---|---|---|---|---|---|---|
| **H-01** | `BankingSection.tsx` | Header Banner (L93) | `"Cierre Agosto 2026 (SB)"` | **A** | `meta.referencePeriod` derivado dinámicamente de la BD | Desfase visual visible entre encabezado y métricas de septiembre | Consumo reactivo de `/summary` con formato oficial dinámico |
| **H-02** | `BankingContextCard.tsx` | Métrica DSI (L65) | `|| 29.7` | **B** | `dollarizationIndex.dsiPct` de la SB | Encubre ausencia de datos sustituyendo con un valor arbitrario | Sustitución eliminada; muestra "Dato no disponible" si es nulo |
| **H-03** | `BankingContextCard.tsx` | Tasa USD (L81) | `|| 1.76` | **B** | `weightedYieldPct` USD de la SB | Reemplaza tasa no observada con dato inventado | Eliminado fallback; muestra estado explícito "Dato no disponible" |
| **H-04** | `BankingContextCard.tsx` | Tasa DOP (L82) | `|| 4.09` | **B** | `weightedYieldPct` DOP de la SB | Reemplaza tasa no observada con dato inventado | Eliminado fallback; muestra estado explícito "Dato no disponible" |
| **H-05** | `ResumenTab.tsx` | KPI Instituciones (L224) | Literal `40` | **A** | `data.institutionCount` calculado vía `COUNT(DISTINCT entidad)` | Inexacto en cortes con número distinto de entidades (ej. 39 en agosto) | Expuesto `institutionCount` desde el backend y renderizado reactivo |
| **H-06** | `ResumenTab.tsx` | Cuota Mercado (L135) | `name: 'Otras (35)'` | **A** | `Math.max(0, institutionCount - topBanks.length)` | Asumía siempre 40 bancos menos 5 top | Cálculo dinámico basado en `institutionCount` real |
| **H-07** | `GeografiaTab.tsx` | Estado inicial (L50) | `useState('2026-08')` | **B** | `json.periodo` o `json.meta.referencePeriod` | Quedaba estancado en agosto si la caché omitía el período | Inicialización en `null`; lectura unificada desde payload o meta |
| **H-08** | `sbBankingController.js` | Caché en `/yields` y `/provinces` | `res.json({ success: true, cached: true, data: cached })` | **E** | Payload de caché con `periodo` y `meta` | En acierto de caché, el frontend recibía `periodo: undefined` | Estructuración completa de caché `{ data, meta, periodo }` |
| **H-09** | `sbBankingController.js` | `getBankingSummary` | Sin objeto `meta` ni `institutionCount` | **E** | Contrato canónico SB v2 | Frontend sin trazabilidad temporal, estado de frescura ni corte unificado | Implementación de `buildSbTemporalMeta` e `institutionCount` |
| **H-10** | `InstitucionesTab.tsx` | Subtítulo Gráfica (L312) | `"Evolución de Captaciones en 2026"` | **D** | Año derivado dinámicamente de `entityData.periodo` | Etiqueta estática rígida | Extracción dinámica del año del corte oficial reportado |
| **H-11** | `HistoricoTab.tsx` | Rango Botones (L146-154) | Type error TS2367 `rng !== 'MAX'` | **C/D** | Tipado limpio en unión de literales | Bloqueaba compilación estricta de TypeScript | Refactorización de condiciones sin comparaciones imposibles |
| **H-12** | `BankingSection.tsx` | Prop `onSelectInstitution` | TS2322 en `RendimientosTab` | **C/D** | Interfaz flexible con alias compatible | Error de compilación en build estricto | Adición de `onSelectInstitution` en `RendimientosTabProps` |

---

## 3. CONTRATO TEMPORAL CANÓNICO IMPLEMENTADO

Se implementó el contrato canónico sin alterar esquemas de base de datos existentes, aprovechando la tabla `public.sb_sync_runs` y las consultas agregadas sobre `public.sb_banking_metrics`.

### 3.1 Estructura del Contrato
```json
{
  "success": true,
  "cached": false,
  "meta": {
    "source": "SB v2 API",
    "referencePeriod": "2026-09",
    "publishedAt": "2026-10-19T20:56:40.698Z",
    "syncedAt": "2026-10-19T20:56:40.698Z",
    "freshness": "CURRENT",
    "snapshotId": 10
  },
  "data": {
    "meta": {
      "source": "SB v2 API",
      "referencePeriod": "2026-09",
      "publishedAt": "2026-10-19T20:56:40.698Z",
      "syncedAt": "2026-10-19T20:56:40.698Z",
      "freshness": "CURRENT",
      "snapshotId": 10
    },
    "periodo": "2026-09",
    "referencePeriod": "2026-09",
    "institutionCount": 40,
    "totalInstitutions": 40,
    "previousPeriodo": "2026-08",
    "totalSystemBalanceDop": 3517507877440.76,
    "totalInstruments": 11887624,
    "systemWeightedYieldPct": 4.7621,
    "momGrowthPct": 1.96,
    "dollarizationIndex": {
      "dsiPct": 29.62,
      "usdDepositsEquivDop": 1042000000000,
      "totalSystemDop": 3517507877440.76,
      "methodology": "SB_DOMINICAN_REPUBLIC_OFFICIAL_DOP_EQUIVALENT"
    },
    "hhi": {
      "value": 2024.84,
      "scale": "0-10000",
      "classification": "MODERATE_CONCENTRATION",
      "methodology": "SUM_OF_ENTITY_MARKET_SHARE_PERCENT_SQUARED",
      "disclaimer": "Criterio analítico de concentración; no es una evaluación de solvencia."
    },
    "currencies": { ... },
    "topBanks": [ ... ],
    "holderDistribution": [ ... ]
  }
}
```

### 3.2 Separación Semántica de Conceptos Temporales
- **Período oficial de referencia (`referencePeriod`):** Determinado a partir del corte contable del dataset disponible en `public.sb_banking_metrics` (ej. `2026-09`).
- **Fecha de sincronización (`syncedAt`):** Registro de ejecución exitosa en `public.sb_sync_runs` para el período dado.
- **Fecha de publicación (`publishedAt`):** Timestamp reportado por la SB o capturado en metadatos de sincronización.
- **Estado de frescura (`freshness`):**
  - `CURRENT`: Corte dentro de la ventana de rezago regulatorio oficial habitual (<= 75 días desde el fin del mes de referencia).
  - `STALE`: Corte rezagado (> 75 días sin actualización).
  - `PARTIAL`: Cobertura incompleta de entidades supervisadas (< 30 entidades) o fecha inconsistente.
  - `UNAVAILABLE`: Ausencia total de datos en base de datos.

---

## 4. CENTRALIZACIÓN DE FORMATEO (ESPAÑOL DOMINICANO)

Se incorporaron a `src/apps/finanza/utils/bankingFormatters.ts`:
- `formatPeriodOfficial(periodo, prefix = 'Cierre')`:
  - `2026-09` -> `Cierre septiembre 2026`
  - `2026-08` -> `Cierre agosto 2026`
  - `null` -> `Cierre no disponible`
- `formatLatestOfficialCut(periodo)`:
  - `2026-09` -> `Último corte oficial disponible: septiembre 2026`
- `formatPercentNullable(value, decimals = 2, fallback = 'Dato no disponible')`:
  - `0` -> `0.00%`
  - `null` / `undefined` / `NaN` -> `Dato no disponible`
- `formatMoneyCompactNullable(value, currency = 'RD$', fallback = 'Dato no disponible')`:
  - `null` / `undefined` / `NaN` -> `Dato no disponible`

---

## 5. ESTADO DE PRUEBAS Y VERIFICACIÓN

Se ejecutó la suite completa de pruebas de backend y frontend:

1. **Pruebas Unitarias de Gobernanza Temporal y Métricas (`tests/sbMetrics.test.js` & `tests/sbDynamicPeriod.test.js`):**
   - 11 pruebas específicas del módulo bancario pasaron al 100%.
   - Verificación de corte Agosto 2026 (39 entidades, "Cierre agosto 2026", "Otras (34)").
   - Verificación de avance automático a Septiembre 2026 (40 entidades, "Cierre septiembre 2026", "Otras (35)").
   - Verificación de ausencia de fallbacks silenciosos (rechazo de 29.7, 1.76, 4.09).
   - Auditoría estática de código sobre fuentes TypeScript/TSX comprobando erradicación de literales.

2. **Suite Global de Pruebas (`npm test`):**
   - 91 pruebas ejecutadas y 91 pruebas aprobadas (0 fallas, 0 canceladas, 0 saltadas).

3. **Compilación Estricta de TypeScript (`npx tsc --noEmit`):**
   - 0 errores (remediados 4 errores previos de comparación y firmas de props).

4. **Compilación de Producción (`npx vite build`):**
   - Build completado exitosamente en 47.65 segundos sin errores de empaquetado.

---

## 6. ELEMENTOS CORREGIDOS Y PENDIENTES

### Corregidos:
- [x] Eliminado literal "Cierre Agosto 2026 (SB)" en `BankingSection.tsx`.
- [x] Eliminados fallbacks silenciosos (29.7, 1.76, 4.09) en `BankingContextCard.tsx`.
- [x] Conteo dinámico de instituciones en `ResumenTab.tsx` (`institutionCount`).
- [x] Cálculo dinámico de "Otras" en el gráfico de Market Share según el universo real del corte.
- [x] Estado inicial neutro en `GeografiaTab.tsx` para evitar anclaje a meses pasados.
- [x] Serialización completa en caché del backend (`sbBankingController.js`) garantizando presencia de `meta` y `periodo` en cache hits.
- [x] Contrato temporal canónico `meta` implementado y documentado.
- [x] Remediados errores TypeScript TS2367 y TS2322.

### Pendientes / Recomendaciones de Monitoreo:
- Monitoreo del scheduler nocturno de sincronización SB (`sbSchedulerJob.js`) para verificar que cuando la SB publique el corte de Octubre 2026, el sistema ingeste los datos sin intervención manual y la interfaz avance de forma completamente autónoma.
- Ninguna acción pendiente para producción requerida antes de revisión de PR.
