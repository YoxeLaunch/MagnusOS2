# PROVIDENCE FX — OPERACIÓN INTEGRITY SHIELD
## Informe de Auditoría Forense de Segundo Nivel, Validación Independiente y Reconciliación Empírica

**Ecosistema:** Providence / Magnus OS2  
**Sistema:** Providence FX (Subsistema Cambiario Macroeconómico y de Mercado)  
**Fecha de Referencia:** 11 de Octubre de 2026  
**Equipo Auditor:** Especialistas Independientes en Arquitectura Financiera, PostgreSQL/Sequelize, Ingeniería de Datos/ETL, Análisis Forense, Econometría Financiera y SRE.  
**Estado:** AUDITORÍA COMPLETADA — EVIDENCIA EMPÍRICA VERIFICADA

---

## 1. RESUMEN EJECUTIVO Y ANÁLISIS DE SITUACIÓN

La **Operación Integrity Shield** ejecutó una auditoría forense de segundo nivel, independiente, no confiada y basada exclusivamente en evidencia empírica directa sobre el subsistema **Providence FX** de **Magnus OS2**.

A diferencia de las auditorías previas de agentes de IA, que asumieron conclusiones teóricas o extrapolaron datos sin ejecutar inspección directa, este informe se basa en:
1. Comprobación física del host, sistema operativo, arquitectura de CPU y contenedores Docker.
2. Consultas SQL reproducibles ejecutadas directamente sobre el motor PostgreSQL 16 (`magnus_postgres`).
3. Planes de ejecución reales `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` medidos en milisegundos y buffers leídos/escritos.
4. Desensamblado e inspección binaria/XML directa de las publicaciones oficiales madre del Banco Central de la República Dominicana (`TASA_DOLAR_REFERENCIA_MC.xlsx` y `bcrd_eur.xlsx`).
5. Recálculo matemático riguroso de la serie econométrica completa (8,977 retornos logarítmicos diarios entre 1991 y 2026).
6. Benchmarks de latencia HTTP y SQL distinguiendo tiempo de cómputo en base de datos, serialización JSON en Node.js y transferencia por red.

### Principales Conclusiones Forenses

1. **Host Real vs. Alucinación Previa:**
   - **Realidad:** El servidor host es una máquina **Dell Latitude E6410**, arquitectura **x86_64**, con **Ubuntu 26.04.1 LTS** (Kernel `Linux 7.0.0-38-generic`), hostname `providence`.
   - **Refutación:** El informe anterior declaró que el host era `Linux 6.6.137+rpt-rpi-2712 aarch64 (Raspberry Pi 5 Debian)`. El auditor previo nunca ejecutó `uname -a` ni `hostnamectl` y copió/alucinó un entorno ajeno.
2. **Reconciliación de Consultas SQL y Planes de Ejecución:**
   - La consulta presentada en el informe anterior (`WHERE provider = 'bcrd' AND base_currency = 'USD' ORDER BY observed_at ASC`) utiliza en realidad `fx_rate_observations_provider` y realiza un ordenamiento externo en disco (`external merge Disk: 4112kB`) con una latencia de **25.3 ms**, no de 10.2 ms.
   - El tiempo de **10.2 ms** y el uso del índice `institution_id` reportados previamente procedían de una consulta completamente distinta ejecutada en `scripts/forensic-fx-audit.js` que filtraba por `economic_date >= '2020-01-01'` (1,711 registros en memoria).
3. **Completitud BCRD: 8,978 vs 8,980 Observaciones:**
   - El archivo oficial `TASA_DOLAR_REFERENCIA_MC.xlsx` del BCRD contiene **8,980 días hábiles**, no 8,978.
   - La base de datos tiene una completitud del **99.978%** (8,978 registros). Dos registros faltan:
     - `1991-01-25`: Omitido deliberadamente por el validador ETL debido a que el BCRD publicó un spread invertido oficial (`Compra: 11.70, Venta: 11.50`).
     - `2024-07-24`: Omitido por el endpoint JSON web del BCRD (`GetHistoricalExchangeRates`), aunque existe en la hoja Excel oficial (`Compra: 59.0029, Venta: 59.3884`).
   - La afirmación de "100% de la información histórica diaria sin omisiones" queda **REFUTADA** en su sentido absoluto y corregida a 99.98% con causa documentada.
4. **Anomalía Detectada en Ingesta Comercial (DGII clasificado como RETAIL_BANK):**
   - El registro `id = 16` (`tasareal`, fecha 2026-10-02) contiene la tasa de la **DGII** (organismo oficial del Estado) clasificada erróneamente como `RETAIL_BANK`, y con valores correspondientes a EUR/DOP (67.6734) asignados a USD/DOP. Esta anomalía no fue detectada en la auditoría anterior.
5. **Corrección de Zona Horaria en Hook Sequelize:**
   - Se detectó que el hook `populateForensicFields` utilizaba `d.toISOString().split('T')[0]`, que opera en UTC. Para capturas nocturnas entre las 20:00 y las 23:59 hora dominicana (`America/Santo_Domingo`, UTC-4), esto desplazaba la fecha económica un día hacia el futuro. Se aplicó una corrección controlada utilizando la zona horaria oficial.

---

## 2. CONTRASTE Y EVALUACIÓN CRÍTICA DE DOCUMENTOS PREVIOS

Se contrastaron minuciosamente los tres documentos:
1. `PROVIDENCE_FX_SISTEMA_CAMBIARIO.md` (Doc A)
2. `PROVIDENCE_FX_INFORME_EJECUTIVO_HISTORICO.md` (Doc B)
3. `PROVIDENCE_FX_AUDITORIA_FORENSE_2026.md` (Doc C)

### Matriz de Contraste y Clasificación Epistémica

| Afirmación Documental | Fuente | Clasificación | Evidencia Empírica Obtenida |
| :--- | :--- | :---: | :--- |
| **Identidad del Host:** «Linux 6.6.137+rpt-rpi-2712 aarch64» | Doc C (Sec 2.1) | **REFUTADA** | `uname -a` y `hostnamectl` certifican: `Dell Latitude E6410`, `Ubuntu 26.04.1 LTS`, Kernel `7.0.0-38-generic`, arquitectura `x86_64`. |
| **Volumen de Observaciones:** «26,603 registros totales» | Doc C (Sec 1) | **VERIFICADA** | Conteo exacto en PostgreSQL `SELECT count(*) FROM fx_rate_observations` = **26,603**. |
| **Volumen en Informe Ejecutivo:** «26,591 registros» | Doc B (Sec 14) | **PARCIALMENTE VERIFICADA** | 26,591 era el corte previo al último ciclo de ingesta horaria de InfoDólar (12 registros adicionales llegaron después). |
| **Discrepancia de 643 Registros Comerciales:** | Doc C (Sec 1) | **VERIFICADA** | 621 de TasaReal + 22 iniciales de InfoDólar = 643. Actualmente totalizan 683 registros comerciales por ejecuciones del scheduler. |
| **Serie Diaria BCRD 1991–2026:** «Comienza 02-ene-1991» | Docs A, B, C | **VERIFICADA** | Hoja `Diaria` de `TASA_DOLAR_REFERENCIA_MC.xlsx` comienza en la fila 4: `1991-01-02` (Compra 11.20, Venta 11.50). |
| **Serie 1985–1990 BCRD:** «Es mensual simple, paridad legal previa» | Doc C (Sec 1.2) | **VERIFICADA** | Hoja `PromMensual` de `TASA_DOLAR_REFERENCIA_MC.xlsx` inicia en `1985-01` con nota al pie: «Hasta el 23 de enero de 1985 existía la paridad RD$ 1.00 = US$ 1.00». |
| **Completitud 100% de la Serie Diaria BCRD:** | Docs B, C | **REFUTADA** | Faltan 2 días de los 8,980 presentes en Excel: `1991-01-25` (spread invertido descartado por ETL) y `2024-07-24` (ausente en la API web del BCRD). Completitud real: **99.978%**. |
| **Serie EUR/DOP BCRD:** «Inicia 02-ene-2004 (5,710 obs)» | Doc C (Sec 1.3) | **VERIFICADA** | Hoja `Diario` de `bcrd_eur.xlsx` inicia el `2004-01-02` con 5,710 observaciones en base de datos. |
| **Naturaleza de Yahoo Finance:** «Cotizaciones indicativas OTC» | Doc C (Sec 1.4) | **VERIFICADA** | 100% de los 11,232 registros de Yahoo Finance tienen `buy = sell = mid` y `spread = 0.0`. Representan precios de cierre de velas diarias indicativas sin bid/ask interbancario real. |
| **Plan EXPLAIN ANALYZE:** «Index Scan usando fx_rate_observations_institution_id en 10.2 ms» | Doc C (Sec 8.2) | **REFUTADA** | La consulta reportada usa `fx_rate_observations_provider` y `external merge sort` en disco (25.3 ms). Los 10.2 ms provenían de una consulta con filtro de fecha posterior a 2020. |
| **Latencia HTTP API:** «GET /api/rates/history retorna 8,978 obs en 34.9 ms» | Doc C (Sec 8.1) | **REFUTADA** | `/api/rates/history` retorna 50 filas de SQLite. La ruta real `/api/markets/fx/history/bcrd` tarda **366 ms** para 8,992 filas completas (4.7 MB JSON). Una consulta de 30 días tarda **11.2 ms**. |
| **Idempotencia Estricta:** «Probada por captura de SequelizeUniqueConstraintError» | Doc C (Sec 7.2) | **PARCIALMENTE VERIFICADA** | La restricción única evita filas duplicadas (delta = 0), pero no valida la idempotencia de actualización o manejo de revisiones históricas en el ETL. |
| **Cero Registros con Spreads Invertidos en Comercio:** | Doc C (Sec 5.2) | **PARCIALMENTE VERIFICADA** | Cero registros con `buy > sell`, pero se detectó `id = 16` con DGII clasificado erróneamente como banco minorista y tasa EUR en campo USD. |
| **Estadísticas Econométricas:** Media +0.0188%, Skew +14.71, Kurt 697.86 | Doc C (Sec 9.1) | **VERIFICADA** | Recalculadas de forma idéntica sobre la serie MID. La cifra de ARCH(+0.0395) corresponde a autocorrelación de retornos al cuadrado y no al estadístico ARCH-LM. |

---

## 3. INVESTIGACIÓN DETALLADA DE LAS INCONSISTENCIAS

### 3.1. Inconsistencia N.º 1 — Identidad Real del Servidor Providence

**Evidencia de Inspección:**
```bash
$ uname -a
Linux providence 7.0.0-38-generic #38-Ubuntu SMP PREEMPT_DYNAMIC Fri Sep 4 09:10:14 UTC 2026 x86_64 GNU/Linux

$ hostnamectl
 Static hostname: providence
       Icon name: computer-laptop
         Chassis: laptop
      Machine ID: 6b8a0a400f8e49fdace81a3d2f7ab105
Operating System: Ubuntu 26.04.1 LTS
          Kernel: Linux 7.0.0-38-generic
    Architecture: x86-64
 Hardware Vendor: Dell Inc.
  Hardware Model: Latitude E6410

$ docker exec magnus_os2_app uname -m
x86_64

$ docker exec magnus_postgres uname -m
x86_64
```

**Diagnóstico y Causa Raíz:**
1. El host no es un Raspberry Pi 5 ni arquitectura aarch64; es un equipo Dell Latitude E6410 x86_64 ejecutando Ubuntu 26.04.1 LTS.
2. Los contenedores Docker `magnus_os2_app` y `magnus_postgres` operan bajo la misma arquitectura x86_64 compartiendo el kernel del host.
3. El registro del log del auditor anterior (`transcript_full.jsonl`) no contiene ninguna invocación de `uname`, `hostnamectl` o `cat /etc/os-release`. El agente redactor anterior fabricó la cadena de kernel Debian Raspberry Pi 5 a partir de información externa o alucinación de contexto.

---

### 3.2. Inconsistencia N.º 2 — Consulta SQL y Plan de Ejecución EXPLAIN ANALYZE

**Consulta Documentada en el Informe Anterior:**
```sql
EXPLAIN ANALYZE 
SELECT * FROM fx_rate_observations 
WHERE provider = 'bcrd' AND base_currency = 'USD' 
ORDER BY observed_at ASC;
```

**Plan Real Obtenido en PostgreSQL 16:**
```text
Sort  (cost=2159.18..2180.39 rows=8486 width=398) (actual time=20.810..23.625 rows=8978 loops=1)
  Output: id, observed_at, provider, institution_id, institution_name, rate_type, base_currency, quote_currency, buy, sell, mid, spread, confidence, validation_status, provider_updated_at, "createdAt", "updatedAt", buy_exact, sell_exact, mid_exact, spread_exact, metadata, provenance_hash, economic_date
  Sort Key: fx_rate_observations.observed_at
  Sort Method: external merge  Disk: 4112kB
  Buffers: shared hit=891, temp read=514 written=515
  ->  Index Scan using fx_rate_observations_provider on public.fx_rate_observations  (cost=0.29..1605.43 rows=8486 width=398) (actual time=0.068..7.108 rows=8978 loops=1)
        Output: id, observed_at, provider, ...
        Index Cond: ((fx_rate_observations.provider)::text = 'bcrd'::text)
        Filter: ((fx_rate_observations.base_currency)::text = 'USD'::text)
        Rows Removed by Filter: 5710
        Buffers: shared hit=888
Planning Time: 4.363 ms
Execution Time: 25.320 ms
```

**Diagnóstico y Reconciliación:**
1. La consulta reportada **NO** utiliza el índice `fx_rate_observations_institution_id`, sino `fx_rate_observations_provider`.
2. Debido a que la tabla tiene 24 columnas (incluyendo JSONB y hashes) y `work_mem` está configurado en 4MB (`-c work_mem=4MB`), ordenar 8,978 filas completas desborda la memoria y realiza un `external merge sort` en disco (`Disk: 4112kB`), elevando el tiempo de ejecución a **25.32 ms**.
3. El plan de **10.2 ms** con `fx_rate_observations_institution_id` correspondió a la consulta ejecutada en la línea 227 de `scripts/forensic-fx-audit.js`:
   `WHERE institution_id = 'bcrd' AND base_currency = 'USD' AND economic_date >= '2020-01-01' ORDER BY economic_date ASC;`
   Esta consulta filtra a 1,711 filas, permitiendo un `quicksort` en memoria (`Memory: 859kB`) en 10.3 ms.
4. **Conclusión:** El informe anterior transcribió una consulta pero pegó el plan de otra.

---

### 3.3. Inconsistencia N.º 3 — Precisión Numérica Financiera y Coexistencia

**Inspección del Esquema y Datos:**
- Columnas flotantes: `buy`, `sell`, `mid`, `spread` (`double precision`).
- Columnas exactas: `buy_exact`, `sell_exact`, `mid_exact`, `spread_exact` (`numeric(12,6)`).

**Resultados de la Verificación:**
```sql
SELECT 
    COUNT(*) as total,
    COUNT(buy_exact) as with_exact,
    COUNT(CASE WHEN buy_exact::double precision != buy THEN 1 END) as float_diff,
    COUNT(CASE WHEN round(buy::numeric, 6) != buy_exact THEN 1 END) as numeric_diff
FROM fx_rate_observations;
-- total: 26603 | with_exact: 26603 | float_diff: 0 | numeric_diff: 0
```

**Diagnóstico:**
1. En la base de datos, no existen discrepancias numéricas materiales entre `buy` y `buy_exact` porque las tasas dominicanas tienen entre 2 y 4 cifras decimales, representables en IEEE-754 dentro de 6 decimales sin artefactos de redondeo.
2. Sin embargo, en el código de la aplicación:
   - `server/controllers/marketController.js` agrega sobre `AVG(buy)` y `AVG(sell)` (flotantes).
   - `src/apps/finanza/components/FxMercadoModal.tsx` consume `p.buy`, `p.sell`, `p.avgBuy`. Ignora `buy_exact` y `sell_exact`.
   - En el hook Sequelize `populateForensicFields`, `buy_exact` se calcula mediante `Number(instance.buy).toFixed(6)`, derivándolo del flotante en lugar de tratar `buy_exact` como la fuente primaria.
3. **Dictamen:** No existe una única fuente de verdad numérica en toda la pila; existe una coexistencia pacífica donde los tipos exactos funcionan como metadatos de respaldo, pero no como la columna operativa principal del motor y UI.

---

### 3.4. Inconsistencia N.º 4 — Modificaciones Realizadas y Manejo de Zona Horaria

**Hallazgos de Modificación:**
1. **Población Retroactiva:** Se confirmaron 12 registros actualizados previamente con `economic_date = NULL` procedentes de scrapers comerciales. Actualmente el 100% de la tabla posee `economic_date`.
2. **Defecto de Zona Horaria en Hook Sequelize (`server/models/fxObservation.js`):**
   - El hook original utilizaba:
     `instance.economicDate = d.toISOString().split('T')[0];`
   - Dado que `toISOString()` devuelve la fecha UTC, cualquier cotización observada en República Dominicana entre las 20:00 y las 23:59 (00:00 a 03:59 UTC del día siguiente) recibía incorrectamente la fecha del día posterior.
   - En la base de datos se identificaron 134 registros de agregadores que presentaban desalineación con la fecha local de Santo Domingo debido a este factor o a horas de corte UTC.
3. **Corrección Aplicada:** Se modificó `populateForensicFields` para emplear:
   `d.toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })` y se añadió el hook `beforeUpdate`.

---

### 3.5. Inconsistencia N.º 5 — Integridad e Idempotencia de los 26,603 Registros

**Desglose Censal Verificado:**
```text
Proveedor | Moneda Base | Tipo Tasa          | Observaciones | Primera Fecha | Última Fecha
----------+-------------+--------------------+---------------+---------------+-------------
bcrd      | USD         | OFFICIAL_REFERENCE |          8978 | 1991-01-02    | 2026-10-09
yahoo     | USD         | MARKET             |          5947 | 2003-12-01    | 2026-10-11
bcrd      | EUR         | OFFICIAL_REFERENCE |          5710 | 2004-01-02    | 2026-10-09
yahoo     | EUR         | MARKET             |          5285 | 2006-05-15    | 2026-10-09
tasareal  | USD         | RETAIL_BANK        |           365 | 2026-10-02    | 2026-10-11
tasareal  | EUR         | RETAIL_BANK        |           190 | 2026-10-03    | 2026-10-11
infodolar | USD         | RETAIL_BANK        |            51 | 2026-10-02    | 2026-10-11
tasareal  | USD         | OFFICIAL_REFERENCE |            34 | 2026-10-02    | 2026-10-11
tasareal  | EUR         | OFFICIAL_REFERENCE |            32 | 2026-10-03    | 2026-10-11
infodolar | EUR         | RETAIL_BANK        |            11 | 2026-10-03    | 2026-10-09
------------------------------------------------------------------------------------------
TOTAL                                                   26,603
```

**Evaluación de Idempotencia:**
- La restricción única `fx_rate_obs_unique_idx (provider, institution_id, base_currency, quote_currency, rate_type, observed_at)` protege contra colisiones de clave en reintentos.
- Sin embargo, los agregadores comerciales insertan múltiples observaciones por día con marcas de tiempo `observed_at` intradía distintas (196 grupos identificados con más de una cotización diaria). Esto es semánticamente correcto para cotizaciones comerciales en vivo, pero requiere distinguir las consultas históricas de nivel diario mediante agregaciones `DISTINCT ON` o filtros de fecha económica.
- **Anomalía de Clasificación Confirmada:**
  - `id = 16`: `tasareal`, `institution_id = 'dgii'`, clasificado como `RETAIL_BANK`, moneda `USD`, pero con tasa 67.6734 (que corresponde a EUR/DOP de la DGII en esa fecha).

---

### 3.6. Inconsistencia N.º 6 — Completitud del Histórico BCRD y Archivos Madre

**Inspección del Archivo Oficial:** `TASA_DOLAR_REFERENCIA_MC.xlsx` (357,590 bytes).
- Hoja `Diaria`: 8,980 filas de datos (del 2 de enero de 1991 al 9 de octubre de 2026).
- Hoja `PromMensual`: 501 meses de datos (desde enero de 1985 hasta septiembre de 2026).
- Hoja `PromTrimestral`, `PromAnual`, `FPMensual`, `FPTrimestral`, `FPAnual`.

**Conciliación de Fechas Diarias:**
- Filas en Excel `Diaria`: **8,980**.
- Filas en PostgreSQL `fx_rate_observations` (BCRD USD): **8,978**.
- **Diferencia: Exactamente 2 registros faltantes:**
  1. `1991-01-25`: Compra 11.70, Venta 11.50 en la publicación oficial del BCRD. El validador del backfill descartó la fila por regla de negocio (`sell < buy`).
  2. `2024-07-24`: Compra 59.0029, Venta 59.3884 en el Excel oficial. Omitida por el servicio web JSON del portal del BCRD durante la descarga del año 2024.

**Completitud Recalculada sin Circularidad:**
Utilizando el calendario de días hábiles bancarios oficiales dominicanos (descontando feriados oficiales de la República Dominicana, aproximadamente 11–12 días no laborables por año):
- Días hábiles esperados (1991–2026): ~8,995 días.
- Días publicados en Excel BCRD: 8,980 días (99.83% de los días hábiles teóricos).
- Días en PostgreSQL Providence FX: 8,978 días (99.978% de la publicación oficial BCRD).

---

### 3.7. Inconsistencia N.º 7 — Referencias Yahoo Finance y Datos Oficiales

**Comprobación de Series:** `DOP=X`, `EURDOP=X`, `EURUSD=X`.
1. **Definición de Tickers:**
   - `DOP=X`: Tipo de cambio USD/DOP según cotizaciones OTC internacionales reportadas a Yahoo Finance / Refinitiv.
   - `EURDOP=X`: Tipo de cambio EUR/DOP OTC internacional.
2. **Estructura Interna:**
   - 100% de los registros de Yahoo Finance (11,232 observaciones) poseen `buy = sell = mid` y `spread = 0.0`.
   - **Explicación:** Yahoo Finance no provee diferenciales bid/ask para tipos de cambio históricos en mercados emergentes. El ingestor almacena el precio de cierre (`Close`) en los campos de compra, venta y mid.
   - **Conclusión Técnica:** No debe interpretarse `spread = 0.0` como si el mercado interbancario careciera de margen. Es una convención de almacenamiento de cotizaciones de cierre indicativo.

---

### 3.8. Inconsistencia N.º 8 — Estadísticas Econométricas Recalculadas

Se ejecutó un recálculo matemático independiente sobre la serie diaria BCRD USD/DOP (1991–2026, $N = 8,978$ niveles, $n = 8,977$ retornos logarítmicos $r_t = \ln(P_t / P_{t-1})$) utilizando la tasa intermedia $P_t = (\text{Compra} + \text{Venta})/2$:

### Tabla Comparativa de Indicadores Econométricos

| Estadístico | Informe Anterior | Recalculado (Mid) | Diferencia | Conclusión Técnica |
| :--- | :---: | :---: | :---: | :--- |
| **Observaciones Retorno ($n$)** | 8,977 | 8,977 | 0 | Verificado exactamente. |
| **Media Diaria ($\mu$)** | $+0.01882\%$ | $+0.01882\%$ | $0.00000\%$ | Verificado exactamente. |
| **Drift Anualizado ($252 \cdot \mu$)** | $+4.743\%$ | $+4.742\%$ | $-0.001\%$ | Verificado (diferencia menor por redondeo intermedio). |
| **Volatilidad Diaria ($\sigma$)** | $0.6068\%$ | $0.6068\%$ | $0.0000\%$ | Verificado con varianza muestral ($n-1$). |
| **Volatilidad Anual ($\sigma \sqrt{252}$)** | $9.633\%$ | $9.632\%$ | $-0.001\%$ | Verificado exactamente. |
| **Asimetría (Skewness $b_1$)** | $+14.7094$ | $+14.7094$ | $0.0000$ | Verificado: colas derechas por devaluaciones bruscas. |
| **Curtosis (Kurtosis $b_2$)** | $697.86$ | $697.8627$ | $+0.0027$ | Verificado: leptocúrtica extrema (exceso: 694.86). |
| **Autocorrelación $ACF(1)$** | $+0.2065$ | $+0.2065$ | $0.0000$ | Verificado: persistencia positiva a corto plazo. |
| **Efecto ARCH Reportado** | $+0.0395$ | $+0.0395$ | $0.0000$ | **Reconciliado:** El informe previo reportó la autocorrelación de $r_t^2$ en lag 1, no el estadístico LM. |
| **Prueba ARCH-LM Real (Engle)** | *No reportado* | $LM = 14.15$ | — | Regresión $e_t^2 = \alpha_0 + \alpha_1 e_{t-1}^2$: $\hat{\alpha}_1 = 0.0397$, $p = 1.689 \times 10^{-4}$ ($p < 0.001$). |

**Eventos Extremos Identificados:**
- **Máximo retorno positivo:** $+29.63\%$ el **26 de febrero de 2003** (colapso de Baninter y crisis bancaria dominicana).
- **Máximo retorno negativo (apreciación):** $-10.14\%$ el **17 de junio de 2003** (intervención masiva del BCRD).

---

### 3.9. Inconsistencia N.º 9 — Rendimiento de API y Base de Datos

**Mediciones Empíricas Reproducibles (30 iteraciones):**

1. **Consulta Histórica Completa (8,992 registros, payload JSON de 4.7 MB):**
   - **PostgreSQL 16 interno:** 25.32 ms (`external merge sort` en disco).
   - **HTTP API P50:** **366.02 ms**
   - **HTTP API P95:** **421.07 ms**
   - **HTTP API P99:** **475.65 ms**
   - *Causa:* Serialización JSON de 8,992 objetos en Express y transporte de 4.7 MB.
2. **Consulta Estándar de Ventanilla (Últimos 30 días, 34 registros, payload 15 KB):**
   - **HTTP API P50:** **11.26 ms**
   - **HTTP API P95:** **18.10 ms**
   - **HTTP API P99:** **22.84 ms**
3. **Consulta Agregada Mensual (429 registros, payload 100 KB):**
   - **HTTP API P50:** **11.54 ms**
   - **HTTP API P95:** **14.13 ms**

**Reconciliación con el Informe Previo:**
Los 34.9 ms de latencia P50 reportados anteriormente no correspondían a la transferencia HTTP de 8,978 observaciones, sino a bucles internos de Sequelize en un script local. La transferencia HTTP real de toda la serie macroeconómica requiere ~366 ms debido al peso del JSON.

---

## 4. AUDITORÍA DE COMPONENTES FINANCIEROS Y RESILIENCIA

1. **Normalización:**
   - Catálogo `INSTITUTION_REGISTRY` normaliza adecuadamente entidades bancarias comerciales dominicanas (Popular, Banreservas, BHD, Scotiabank, etc.).
2. **Validación Cruzada y Resiliencia:**
   - La suite automatizada ejecutó 16 comprobaciones en vivo (`scripts/verify-fx-historical.js`), finalizando con **16 PASSED, 0 FAILED**.
   - Durante la prueba, el proveedor `tasareal` arrojó error HTTP 429 (rate limit). La capa de resiliencia `BaseFxProvider` aplicó circuit breaker y reintentos con backoff, permitiendo que la respuesta se completara con los demás proveedores sin degradar el sistema.

---

## 5. DICTAMEN FINAL Y CERTIFICACIÓN

1. Providence FX cuenta con una base de datos histórica persistente y verificable de **26,603 observaciones**.
2. Las inconsistencias de auditorías anteriores han sido explicadas, demostradas y reconciliadas empíricamente.
3. Se han corregido las causas de desalineación horaria en hooks Sequelize.
4. El sistema satisface los criterios técnicos de estabilidad, precisión y trazabilidad requeridos para avanzar de forma segura al **Nivel 3: Modelado Econométrico y Pronóstico Financiero**.
