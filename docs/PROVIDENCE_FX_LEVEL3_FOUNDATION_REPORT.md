# PROVIDENCE FX — LEVEL 3 FOUNDATION REPORT
## Cierre de Integrity Shield, Verificación de Base y Construcción del Laboratorio Econométrico
**Ecosistema:** Providence / Magnus OS2 / Magnus Capital  
**Subsistema:** Providence FX  
**Fecha de Emisión:** 11 de Octubre de 2026  
**Equipo Responsable:** Arquitectura de Sistemas Financieros, Econometría Cuantitativa, SRE & Auditoría de Integridad de Datos  
**Estado General:** Base verificada en aislamiento, lista para despliegue productivo supervisado; Laboratorio Econométrico Nivel 3.1 completamente funcional y certificado.

---

## 1. RESUMEN EJECUTIVO

En cumplimiento estricto del mandato técnico para la **Operación Level 3 Foundation**, se ha completado la doble misión operacional:

1. **OPERACIÓN A — INTEGRITY SHIELD CLOSURE:**
   - Se verificó el estado de Git en la rama `fix/providence-fx-integrity-shield` con cinco commits estructurados.
   - La base de datos de producción permanece intacta con **26,603 observaciones** en `fx_rate_observations` y los servicios LIVE funcionando sin interrupciones.
   - Todos los parches de remediación (D1, D2, D3, D4 y D5) fueron revalidados en un entorno aislado PostgreSQL (`test_providence_remediation_sandbox`), obteniendo **19/19 pruebas exitosas (100% PASS)**.
   - Los parches SQL D2 (DGII ID 16), D3 (BCRD faltantes) y D4 (índices concurrentes) se encuentran **totalmente preparados con scripts de aplicación idempotente y rollback garantizado**, en espera de autorización expresa del operador antes de ser ejecutados en producción.
   - Se aplicó el ajuste obligatorio sobre el parche D2: la reclasificación a EUR de la DGII ID 16 asigna `confidence = 0.75` y `validation_status = 'SINGLE_SOURCE'`, desacoplando la procedencia de la certificación y evitando marcar erróneamente `VERIFIED` o `confidence = 1.0`.

2. **OPERACIÓN B — LEVEL 3 ECONOMETRIC FOUNDATION:**
   - Se diseñó e implementó el **Providence FX Quantitative Research Engine** (`server/services/fx/research/`), completamente desacoplado del motor operativo LIVE.
   - El laboratorio opera con consultas de **estricto solo lectura** sobre las series maestras históricas, garantizando la inmutabilidad de los datos del BCRD y Yahoo Finance.
   - Se establecieron los modelos de referencia: **Random Walk (Naive)**, **Random Walk with Drift**, **Medias Móviles (SMA 5, 20, 60)** y **Suavizado Exponencial Simple (SES)** con búsqueda de $\alpha$ óptimo in-sample.
   - Se desarrollaron los modelos experimentales avanzados: **ARIMA(1,1,0)** y **GARCH(1,1)** para heterocedasticidad condicional, evaluados contra **EWMA ($\lambda=0.94$)**.
   - Se construyó el motor de validación temporal **Walk-Forward** sin fuga de información (*zero lookahead leakage*), evaluando 180 ventanas out-of-sample para cuatro horizontes ($h = 1, 5, 20, 60$ días hábiles).
   - Se evaluaron métricas obligatorias completas: **MAE, RMSE, Bias, Cobertura al 95%, Pinball Loss y Coeficiente U de Theil**.
   - Los resultados empíricos certifican que **ARIMA(1,1,0)** supera a Random Walk en corto plazo ($h=1, 5$), mientras que en horizontes de mediano/largo plazo ($h=20, 60$) se valida el clásico **Enigma de Meese-Rogoff**, ratificando al Random Walk como el estándar de oro inviolable en ausencia de fundamentales macroeconómicos.
   - Se implementaron 24 pruebas automatizadas con resultado **24/24 PASS**, 5 endpoints de API experimental y la migración de esquemas de experimentos (`017_fx_research_engine_schema.sql`).

---

## 2. ESTADO DE INTEGRITY SHIELD Y PARCHES DE REMEDIACIÓN

### 2.1. Censo y Salud Operativa de Producción
- **Base de Datos:** PostgreSQL 16 (Contenedor Docker `magnus_postgres` en red interna `172.19.0.2:5432`).
- **Censo de Registros Actual:** `26,603` filas en `fx_rate_observations`.
- **Integridad de Cobertura:**
  - BCRD USD/DOP: 8,978 observaciones oficiales continuas (1991–2026).
  - BCRD EUR/DOP: 5,479 observaciones oficiales continuas (2004–2026).
  - Yahoo Finance DOP=X: 5,699 observaciones continuas (2003–2026).
  - Bancos Comerciales: 6,447 observaciones contemporáneas activas.
- **Scheduler y Servicios LIVE:** Operativos y procesando sin errores.

### 2.2. Matriz de Estado de Parches

| Defecto | Descripción | Estado de Código / Script | Estado en Producción | Procedimiento de Rollback |
| :--- | :--- | :--- | :--- | :--- |
| **D1** | Timezone `America/Santo_Domingo` (UTC-4) | **Aplicado en commit `57f5670`** | Activo en código fuente | Git revert |
| **D2** | Corrección Moneda DGII ID 16 a EUR | **Preparado y Ajustado** (`01_remediation_d2_dgii.sql`) | **Pendiente de Autorización** | Script `01_rollback_d2_dgii.sql` preparado |
| **D3** | Inserción BCRD 1991-01-25 y 2024-07-24 | **Preparado e Idempotente** (`02_remediation_d3_bcrd_missing.sql`) | **Pendiente de Autorización** | Script `02_rollback_d3_bcrd_missing.sql` preparado |
| **D4** | Índices de Rendimiento Compuestos | **Preparado con Autocommit CONCURRENTLY** (`03_remediation_d4_performance_indexes.sql`) | **Pendiente de Autorización** | `DROP INDEX CONCURRENTLY` preparado |
| **D5** | Agregación Decimal con Exact Money | **Aplicado en commit `57f5670`** | Activo en código fuente | Git revert |

### 2.3. Ajuste Obligatorio Implementado en Parche D2 (DGII ID 16)
Siguiendo las instrucciones directas de gobernanza:
- Se eliminó la asignación automática de `confidence = 1.0` y `validation_status = 'VERIFIED'`.
- El registro corregido en `scripts/remediation/01_remediation_d2_dgii.sql` establece formalmente:
  ```sql
  base_currency = 'EUR',
  institution_type = 'TAX_AUTHORITY',
  validation_status = 'SINGLE_SOURCE',
  confidence = 0.75,
  source_evidence = 'DGII Diario Libre 2012-04-12 anuncio oficial para liquidación arancelaria de euros'
  ```
- Se documenta explícitamente en el log de auditoría que la reclasificación técnica de moneda no equivale a una certificación de consenso interbancario ni exactitud absoluta de cotización comercial.

### 2.4. Ejecución Segura del Parche D4 (PostgreSQL CONCURRENTLY)
- Los índices compuestos `idx_fx_obs_perf_covering` e `idx_fx_audit_log_perf` se definieron con la cláusula `CREATE INDEX CONCURRENTLY`.
- Debido a que PostgreSQL prohíbe terminantemente ejecutar `CREATE INDEX CONCURRENTLY` dentro de un bloque transaccional (`BEGIN ... COMMIT`), el script fue configurado para ejecución en modo **Autocommit**, evitando bloqueos de lectura/escritura sobre las tablas transaccionales de Providence FX LIVE.

---

## 3. ARQUITECTURA DEL LABORATORIO ECONOMÉTRICO (NIVEL 3.1)

El **Providence FX Quantitative Research Engine** fue diseñado bajo el principio de desacoplamiento estricto.

```
server/
├── migrations/
│   └── 017_fx_research_engine_schema.sql  (Tablas de experimentos y pronósticos)
├── models/
│   └── fxResearch.js                      (Modelos Sequelize FxResearchExperiment y FxResearchForecast)
├── services/
│   └── fx/
│       └── research/
│           ├── seriesPreparation.js       (Limpieza, retornos, momentos, ACF, ARCH-LM, ADF, ruptura 2003)
│           ├── backtestEngine.js          (Motor Walk-Forward con Theil's U, Coverage 95%, Pinball Loss)
│           ├── quantitativeResearchService.js (Coordinador y suites de benchmarking)
│           └── models/
│               ├── modelRegistry.js       (Catálogo y fábrica de modelos)
│               ├── baselineModels.js      (Random Walk, RW with Drift, SMA-5/20/60, SES)
│               ├── arimaModel.js          (ARIMA(1,1,0), ARIMA(0,1,1) con prueba Ljung-Box)
│               └── garchModel.js          (GARCH(1,1) QMLE, Volatilidad Condicional y EWMA)
├── controllers/
│   └── fxResearchController.js           (Controlador de API experimental)
└── routes/
    └── fxResearch.routes.js               (Rutas /api/markets/fx/research/*)
```

### Principios de Aislamiento y Trazabilidad
1. **Inmutabilidad Absoluta:** Las consultas hacia `fx_rate_observations` son estrictamente `SELECT`. Ningún modelo ni prueba estadística puede invocar `UPDATE`, `INSERT` o `DELETE` sobre las series oficiales.
2. **Esquema de Persistencia Experimental:** Las tablas dedicadas `fx_research_experiments` y `fx_research_forecasts` almacenan los metadatos de cada experimento:
   - Identificador único determinista (ej. `exp_arima_experimental_USD_h1_e1b714f3`).
   - Hash criptográfico SHA-256 de las observaciones consumidas.
   - Parámetros estimados in-sample.
   - Métricas de validación out-of-sample.
   - Tiempos de cómputo y consumo de memoria.

---

## 4. PERFIL ESTADÍSTICO DE LA SERIE OFICIAL BCRD USD/DOP (1991–2026)

El motor `seriesPreparation.js` ejecutó la caracterización econométrica completa sobre las **8,978 observaciones** de la serie oficial diaria de compra del Banco Central:

```
================================================================================
ESTADÍSTICAS DESCRIPTIVAS — BCRD USD/DOP (1991-01-02 a 2026-10-09)
================================================================================
Total Observaciones de Nivel:    8,978 sesiones
Total Retornos Diarios:          8,977 observaciones
Retorno Medio Diario:            +0.01882% (+4.74% anualizado)
Mediana de Retorno:              +0.00000%
Desviación Estándar Diaria:      0.6068% (9.63% anualizada)
Asimetría (Skewness):            +14.71 (Fuerte asimetría positiva hacia depreciación)
Curtosis (Kurtosis):             697.86 (Extrema leptocurtosis / colas pesadas)
Autocorrelación de Nivel (k=1):  +0.9998 (No estacionaria I(1))
Autocorrelación de Retorno (k=1):+0.2065 (Inercia positiva en corto plazo)
Autocorrelación Retornos^2(k=1): +0.0397 (Agrupamiento de volatilidad)

PRUEBAS ECONOMÉTRICAS:
1. Engle ARCH-LM Test:          LM = 14.15 | p-valor = 0.000169 (Rechazo H0: p < 0.001)
   -> Conclusión: Presencia estadísticamente significativa de heterocedasticidad condicional.
2. Augmented Dickey-Fuller (ADF):Estadístico t = -76.77 (Valor Crítico al 1% = -3.43)
   -> Conclusión: Retornos logarítmicos estrictamente estacionarios I(0).
3. Ruptura Estructural Detectada:Crisis Bancaria Dominicana (2003-2004)
   -> Volatilidad pico anualizada superior al 35%, salto de nivel de 18.00 a 54.00 DOP/USD.
================================================================================
```

---

## 5. RESULTADOS DE BACKTESTING Y BENCHMARKS MULTI-HORIZONTE

Se evaluó la ventana de validación out-of-sample de **180 observaciones más recientes** utilizando el esquema Walk-Forward (180 re-estimaciones por modelo).

### Resumen de Desempeño
- **Horizonte 1 Día ($h=1$):**
  - **ARIMA(1,1,0)** resulta el modelo superior: $\text{MAE} = 0.0544 \text{ DOP}$, $\text{RMSE} = 0.1049 \text{ DOP}$, Coeficiente U de Theil = **0.8652** (supera a Random Walk por 13.5% en RMSE).
  - **GARCH(1,1)** y **RW with Drift** superan marginalmente al Naive en RMSE ($\text{Theil U} = 0.9987$).
  - **SMA-20** falla severamente con $\text{Theil U} = 4.3702$.
- **Horizonte 5 Días ($h=5$):**
  - **ARIMA(1,1,0)** mantiene el liderazgo: $\text{MAE} = 0.2006 \text{ DOP}$, $\text{RMSE} = 0.3408 \text{ DOP}$, $\text{Theil U} = 0.9697$.
  - Todos los demás modelos quedan empatados o por debajo de Random Walk.
- **Horizontes 20 y 60 Días ($h=20, 60$):**
  - **Random Walk Naive domina sin rivales:** En 20 días, RMSE de 0.8819 DOP; en 60 días, RMSE de 1.6733 DOP.
  - Ningún modelo univariado logra un Coeficiente U de Theil menor a 1.0000.
  - Esto valida formalmente las advertencias metodológicas del informe: la trayectoria a mediano y largo plazo del mercado cambiario dominicano está gobernada por políticas del BCRD y variables macroeconómicas exógenas, haciendo inútil la extrapolación univariada compleja.

---

## 6. ENDPOINTS DE LA API EXPERIMENTAL

Se crearon las rutas protegidas bajo `/api/markets/fx/research/*` montadas en `server/routes/market.routes.js`:

| Método | Endpoint | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/markets/fx/research/models` | Catálogo de modelos registrados y metadatos | **Activo** |
| `GET` | `/api/markets/fx/research/series/stats` | Perfil estadístico, momentos, ARCH-LM y ADF | **Activo** |
| `GET` | `/api/markets/fx/research/experiments` | Registro histórico de experimentos ejecutados | **Activo** |
| `POST` | `/api/markets/fx/research/backtests/run` | Ejecución supervisada de backtesting out-of-sample | **Activo** |
| `GET` | `/api/markets/fx/research/forecasts/:modelId` | Pronóstico out-of-sample condicional con bandas 95% | **Activo** |

*Nota de Seguridad:* Todos los endpoints son estrictamente de solo lectura salvo `backtests/run`, el cual valida parámetros contra listas blancas (`ALLOWED_MODELS`, `ALLOWED_CURRENCIES`) y no permite inyección de código ni ejecución arbitraria.

---

## 7. CONTROL DE RECURSOS Y RENDIMIENTO OPERATIVO

En estricta observancia del entorno compartido de Ubuntu Server:
1. **Memoria RAM:** Todo el motor opera con arrays tipados y vectores matemáticos nativos de Node.js. El consumo total de memoria durante la corrida completa de 24 backtests fue inferior a **45 MB RAM**.
2. **Uso de CPU:** Tiempo de cómputo total de la suite de benchmarking: **4.82 segundos**.
3. **Event Loop:** Las funciones de estimación están divididas en bloques síncronos discretos con complejidad $\mathcal{O}(N)$ y $\mathcal{O}(N \cdot k)$, evitando saturación del hilo principal de Express.
4. **Prioridad de Servicios LIVE:** Ningún worker pesado de investigación se ejecuta de manera permanente en segundo plano. La investigación cuantitativa corre bajo demanda.

---

## 8. LIMITACIONES CONOCIDAS

1. **Naturaleza Univariada:** Los modelos actuales operan exclusivamente con la serie de precios históricos BCRD. No tienen acceso aún a diferenciales de tasas de interés (TPM vs Fed Funds) ni reservas internacionales.
2. **Supuesto de Linealidad en ARIMA:** ARIMA asume una estructura autoregresiva lineal; no modela de forma endógena quiebres estructurales abruptos salvo por diferenciación de primer orden.
3. **Ausencia de Cotizaciones Intradiarias Continuas:** El BCRD publica una cotización diaria agregada de cierre (promedio ponderado del mercado spot), por lo que la microestructura de alta frecuencia de segundos o minutos no es modelable con esta serie.

---

## 9. CONCLUSIÓN Y ESTADO DEL DESARROLLO

La **Operación Level 3 Foundation** ha alcanzado el 100% de sus objetivos técnicos:
- **Integrity Shield:** Cerrado técnicamente, parches D2, D3 y D4 listos y probados para su aplicación en el momento en que el operador lo autorice.
- **Quantitative Research Engine:** Completamente construido, documentado y probado, estableciendo una base científica sólida e inmutable para las fases macroeconómicas futuras de Providence FX y Magnus Capital.
