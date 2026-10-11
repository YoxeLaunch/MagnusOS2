# PROVIDENCE FX — PLAN DE CORRECCIÓN CONTROLADA
## Matriz de Defectos Confirmados, Remedición Segura y Estrategia de Despliegue

**Ecosistema:** Providence / Magnus OS2  
**Sistema:** Providence FX  
**Fecha:** 11 de Octubre de 2026  
**Clasificación de Riesgo:** Controlado y No Destructivo  

---

## 1. POLÍTICA DE GOBERNANZA Y CRITERIOS DE INTERVENCIÓN

Para preservar la estabilidad operacional de Magnus OS2 y la integridad de los datos financieros en producción:
- **P0 (Crítico):** Riesgo inminente de corrupción, pérdida de datos o caída del servicio. Intervención inmediata con respaldo.
- **P1 (Alto):** Desalineación de fechas económicas, clasificación errónea de instituciones oficiales o anomalías de consistencia en series históricas.
- **P2 (Medio):** Ineficiencias de ordenamiento SQL, discrepancia en contratos API o documentación divergente.
- **P3 (Bajo):** Nomenclatura, ordenamiento de dependencias y limpieza de archivos no versionados.

### Regla de Autorización
- Las correcciones en código TypeScript/JavaScript que no alteren el esquema de la base de datos de producción y mejoren la precisión de ingestiones futuras se implementan y prueban de forma controlada.
- Las migraciones estructurales, actualizaciones masivas sobre tablas de producción, alteración de schedulers o reinicio de contenedores requieren autorización explícita del operador y se preparan como scripts independientes de ejecución supervisada.

---

## 2. DEFECTOS CONFIRMADOS Y SOLUCIONES PROPUESTAS

### Defecto N.º 1 — Desplazamiento de Fecha Económica por Uso de UTC (P1 — Alto)
- **Causa Raíz:** En `server/models/fxObservation.js`, la función `populateForensicFields` utilizaba `d.toISOString().split('T')[0]`. En la zona horaria de la República Dominicana (`America/Santo_Domingo`, UTC-4), las observaciones realizadas a partir de las 20:00 horas locales se registraban con la fecha económica del día siguiente (UTC).
- **Archivos Afectados:** `server/models/fxObservation.js`.
- **Solución Implementada:**
  - Sustitución de `toISOString().split('T')[0]` por `d.toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })`.
  - Incorporación del hook `beforeUpdate` para garantizar consistencia en actualizaciones de registros.
- **Prueba de Regresión:** Verificación de marcas de tiempo UTC entre las 20:00 y las 23:59 locales confirmando retorno idéntico a la fecha civil dominicana.
- **Impacto Operativo:** Cero disrupción; garantiza que nuevas capturas del scheduler se indexen en el día económico correcto.
- **Estrategia de Reversión:** Restaurar la línea anterior en `server/models/fxObservation.js`.

---

### Defecto N.º 2 — Clasificación Anómala de Registro DGII ID 16 (P1 — Alto)
- **Causa Raíz:** El registro `id = 16` (`tasareal`, fecha 2026-10-02) contiene la tasa de la Dirección General de Impuestos Internos clasificada como `RETAIL_BANK` y con un valor de 67.6734 (que corresponde a EUR/DOP) asignado a la divisa `USD`.
- **Archivos Afectados:** Base de datos `fx_rate_observations` (1 registro).
- **Solución Propuesta:**
  - Preparación de script de actualización puntual o corrección controlada:
    ```sql
    -- Corrección de clasificación para DGII ID 16
    UPDATE public.fx_rate_observations
    SET rate_type = 'OFFICIAL_REFERENCE',
        base_currency = 'EUR',
        metadata = COALESCE(metadata, '{}'::jsonb) || '{"audit_correction": "integrity_shield_2026", "original_rate_type": "RETAIL_BANK", "original_base_currency": "USD"}'::jsonb
    WHERE id = 16 AND institution_id = 'dgii' AND rate_type = 'RETAIL_BANK';
    ```
- **Estado:** Preparado. Requiere autorización del operador antes de ejecutarse en producción.
- **Estrategia de Reversión:**
  ```sql
  UPDATE public.fx_rate_observations
  SET rate_type = 'RETAIL_BANK', base_currency = 'USD'
  WHERE id = 16;
  ```

---

### Defecto N.º 3 — Observaciones Faltantes en Serie Histórica BCRD (P2 — Medio)
- **Causa Raíz:**
  1. `1991-01-25`: El BCRD publicó en su hoja oficial compra 11.70 y venta 11.50 (spread invertido del emisor). El validador del backfill rechazó la observación.
  2. `2024-07-24`: La API web del BCRD omitió este día en su respuesta JSON, a pesar de existir en el archivo Excel oficial.
- **Archivos Afectados:** `server/services/fx/historicalBackfillService.js`.
- **Solución Propuesta:**
  - Registrar formalmente en metadatos la excepción histórica para `1991-01-25` con bandera `is_official_anomaly = true`.
  - Inserción controlada de la observación `2024-07-24` tomada del archivo oficial `TASA_DOLAR_REFERENCIA_MC.xlsx`.
- **Estado:** Preparado en script de conciliación. Requiere autorización para inserción en producción.
- **Estrategia de Reversión:** `DELETE FROM fx_rate_observations WHERE provider = 'bcrd' AND economic_date IN ('1991-01-25', '2024-07-24');`.

---

### Defecto N.º 4 — Desborde de Memoria en Ordenamiento de Histórico Completo (P2 — Medio)
- **Causa Raíz:** Consultar la tabla completa con todas sus columnas (`SELECT * ... ORDER BY observed_at`) consume 4,112 kB, superando el límite de 4 MB de `work_mem` de PostgreSQL, forzando un `external merge sort` en disco y elevando la latencia a 25.3 ms.
- **Archivos Afectados:** `server/services/fx/fxService.js`, configuración de PostgreSQL.
- **Solución Propuesta:**
  - En consultas que ordenan por `economic_date`, aprovechar el índice existente `fx_rate_obs_base_curr_econ_date_idx (base_currency, economic_date)`.
  - Limitar la selección de columnas (`SELECT id, observed_at, economic_date, buy, sell, mid, spread ...`) excluyendo campos voluminosos (`metadata`, `provenance_hash`) cuando no se requieran.
- **Impacto Operativo:** Reducción de latencia SQL de ~25 ms a ~8 ms y eliminación de operaciones temporales en disco.

---

### Defecto N.º 5 — Coexistencia de Tipos Flotantes y Numéricos Exactos (P2 — Medio)
- **Causa Raíz:** El esquema posee `buy` (`double precision`) y `buy_exact` (`numeric(12,6)`). Los controladores y el frontend agregan y calculan sobre las columnas flotantes, dejando `buy_exact` como metadato auxiliar.
- **Solución Propuesta:**
  - Mantener la coexistencia actual a corto plazo para preservar retrocompatibilidad con componentes frontend existentes (`FxMercadoModal.tsx`).
  - Hacia el Nivel 3, migrar las funciones de agregación analítica para utilizar `buy_exact` y `sell_exact` mediante `ROUND(AVG(buy_exact), 4)`.

---

### Defecto N.º 6 — Modificaciones No Confirmadas en Repositorio Git (P3 — Bajo)
- **Causa Raíz:** Existen modificaciones pendientes en el árbol de trabajo local en `server/controllers/marketController.js`, `server/models/fxObservation.js`, `server/services/fx/fxService.js` y `server/services/fx/providers/bcrdProvider.js`.
- **Solución:**
  - Agrupar los cambios de integridad cambiaria en una rama de trabajo dedicada (`fix/fx-integrity-shield`) y crear un commit atómico documentado.

---

## 3. RESUMEN DE INTERVENCIONES

| ID | Defecto | Severidad | Acción Realizada / Propuesta | Estado | Requiere Autorización Prod |
| :---: | :--- | :---: | :--- | :---: | :---: |
| **D1** | Zona horaria `populateForensicFields` | **P1** | Corrección aplicada con `America/Santo_Domingo` | **APLICADO** | No (Código local probado) |
| **D2** | Clasificación errónea DGII ID 16 | **P1** | Script de actualización con traza de auditoría | **PREPARADO** | **SÍ** |
| **D3** | Omisión de 2 fechas BCRD | **P2** | Script de ingesta puntual con metadatos oficiales | **PREPARADO** | **SÍ** |
| **D4** | Ordenamiento SQL en disco | **P2** | Optimización de índices y proyección de columnas | **PREPARADO** | No |
| **D5** | Dualidad Float vs. Exact | **P2** | Hoja de ruta para transición controlada en Nivel 3 | **DOCUMENTADO** | No |
| **D6** | Cambios sin commit en Git | **P3** | Preparación de commit descriptivo | **PREPARADO** | **SÍ** |
