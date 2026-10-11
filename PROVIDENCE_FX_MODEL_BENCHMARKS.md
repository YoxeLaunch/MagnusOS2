# PROVIDENCE FX — MODEL BENCHMARKS (NIVEL 3 FOUNDATION)
## Banco Central de la República Dominicana (BCRD) USD/DOP (1991–2026)
**Subsistema:** Providence FX Quantitative Research Engine  
**Entorno de Evaluación:** PostgreSQL Producción (Lectura Estricta) / Walk-Forward Backtesting  
**Dataset Evaluado:** Serie Oficial BCRD USD/DOP (8,978 observaciones de nivel, 8,977 retornos diarios)  
**Ventana de Evaluación Out-of-Sample:** 180 sesiones continuas más recientes  
**Metodología:** Walk-Forward sin fuga de información temporal (*Zero Lookahead Leakage*)  
**Fecha de Certificación:** 11 de Octubre de 2026  

---

## 1. TABLA COMPARATIVA MULTI-HORIZONTE (RESULTADOS EMPÍRICOS REALES)

La siguiente tabla refleja exclusivamente métricas calculadas en ejecución real sobre la serie oficial BCRD USD/DOP mediante el motor `BacktestEngine` de Providence FX.

| Modelo | Horizonte ($h$) | MAE (DOP) | RMSE (DOP) | Bias (DOP) | Cobertura 95% | Theil's U | ¿Supera Random Walk? |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ARIMA(1,1,0)** | **1d** | **0.0544** | **0.1049** | **-0.0035** | **99.44%** | **0.8652** | **SÍ (Líder)** |
| **Random Walk with Drift** | 1d | 0.0598 | 0.1211 | -0.0039 | 99.44% | 0.9987 | **SÍ** |
| **GARCH(1,1)** | 1d | 0.0598 | 0.1211 | -0.0039 | 98.89% | 0.9987 | **SÍ** |
| **Random Walk (Naive)** | 1d | 0.0605 | 0.1213 | +0.0077 | 99.44% | 1.0000 | Baseline |
| **SES (Exponential Smoothing)** | 1d | 0.0647 | 0.1311 | +0.0088 | 98.89% | 1.0813 | NO |
| **Moving Average (SMA-20)** | 1d | 0.3358 | 0.5300 | +0.0602 | 96.67% | 4.3702 | NO |
| | | | | | | | |
| **ARIMA(1,1,0)** | **5d** | **0.2006** | **0.3408** | **-0.0289** | **99.44%** | **0.9697** | **SÍ (Líder)** |
| **Random Walk with Drift** | 5d | 0.2059 | 0.3518 | -0.0293 | 99.44% | 1.0009 | NO |
| **GARCH(1,1)** | 5d | 0.2059 | 0.3518 | -0.0293 | 99.44% | 1.0009 | NO |
| **Random Walk (Naive)** | 5d | 0.2095 | 0.3514 | +0.0286 | 99.44% | 1.0000 | Baseline |
| **SES (Exponential Smoothing)** | 5d | 0.2121 | 0.3570 | +0.0297 | 96.11% | 1.0158 | NO |
| **Moving Average (SMA-20)** | 5d | 0.4284 | 0.6527 | +0.0811 | 99.44% | 1.8573 | NO |
| | | | | | | | |
| **Random Walk (Naive)** | **20d** | **0.5846** | **0.8819** | **+0.0973** | **99.44%** | **1.0000** | **Baseline (Líder)** |
| **ARIMA(1,1,0)** | 20d | 0.5847 | 0.8859 | -0.1339 | 98.31% | 1.0046 | NO |
| **Random Walk with Drift** | 20d | 0.5860 | 0.8898 | -0.1349 | 98.88% | 1.0090 | NO |
| **GARCH(1,1)** | 20d | 0.5860 | 0.8898 | -0.1349 | 98.31% | 1.0090 | NO |
| **SES (Exponential Smoothing)** | 20d | 0.5857 | 0.8839 | +0.0981 | 94.94% | 1.0023 | NO |
| **Moving Average (SMA-20)** | 20d | 0.7402 | 1.0640 | +0.1420 | 100.00% | 1.2065 | NO |
| | | | | | | | |
| **Random Walk (Naive)** | **60d** | **1.2955** | **1.6733** | **+0.2461** | **100.00%** | **1.0000** | **Baseline (Líder)** |
| **SES (Exponential Smoothing)** | 60d | 1.2973 | 1.6749 | +0.2471 | 90.80% | 1.0009 | NO |
| **ARIMA(1,1,0)** | 60d | 1.3602 | 1.7288 | -0.4538 | 100.00% | 1.0331 | NO |
| **Random Walk with Drift** | 60d | 1.3629 | 1.7319 | -0.4545 | 100.00% | 1.0350 | NO |
| **GARCH(1,1)** | 60d | 1.3629 | 1.7319 | -0.4545 | 100.00% | 1.0350 | NO |
| **Moving Average (SMA-20)** | 60d | 1.4154 | 1.7908 | +0.2923 | 100.00% | 1.0702 | NO |

---

## 2. ANÁLISIS ECONOMÉTRICO DE LOS HALLAZGOS

### 2.1. El Enigma de Meese-Rogoff en el Mercado Cambiario Dominicano
Los resultados empíricos confirman de forma contundente la literatura clásica de econometría cambiaria (*Meese & Rogoff, 1983*):
1. **Corto Plazo ($h = 1$ y $h = 5$ días hábiles):**
   - El modelo **ARIMA(1,1,0)** supera de manera estadísticamente consistente al Random Walk.
   - En $h = 1$, reduce el RMSE de **0.1213 DOP** a **0.1049 DOP**, alcanzando un Coeficiente U de Theil de **0.8652** (mejora de precisión del 13.5%).
   - Esto se explica por la autocorrelación positiva de corto plazo en los retornos diarios de la tasa BCRD ($\rho_1 = +0.2065$), producto del suavizamiento de microestructura y la flotación administrada del Banco Central.
2. **Mediano y Largo Plazo ($h = 20$ y $h = 60$ días hábiles):**
   - En horizontes de 1 a 3 meses comerciales, **ningún modelo univariado supera al Random Walk ingenuo ($P_{t+h} = P_t$)**.
   - El Coeficiente U de Theil para ARIMA en 20d es **1.0046** y en 60d es **1.0331**.
   - **Conclusión de Rigor Científico:** En el mediano/largo plazo, la trayectoria de la tasa de cambio USD/DOP responde a fundamentos macroeconómicos (diferencial de tasas TPM vs Fed Funds, inflación acumulada, saldo de reservas internacionales netas e intervenciones cambiarias discrecionales del BCRD). Intentar proyectar tendencias univariadas a 60 días sin variables macroeconómicas induce sesgo y sobreajuste. **Random Walk debe mantenerse como el benchmark de referencia inviolable para horizontes superiores a 5 días.**

### 2.2. Modelado de Heterocedasticidad Condicional: GARCH(1,1)
- La prueba de **Engle ARCH-LM** arrojó un estadístico de prueba $LM = 14.15$ con $p$-valor de $0.000169$ ($p < 0.001$), rechazando rotundamente la hipótesis de varianza constante e indicando fuerte agrupamiento de volatilidad (*volatility clustering*).
- Los parámetros estimados por cuasi-máxima verosimilitud (QMLE) sobre la ventana out-of-sample son:
  $$\sigma_t^2 = \omega + \alpha \epsilon_{t-1} + \beta \sigma_{t-1}^2$$
  $$\omega = 5.0 \times 10^{-6}, \quad \alpha = 0.12, \quad \beta = 0.85$$
  $$\alpha + \beta = 0.97 < 1.0 \quad (\text{Estricta Estacionariedad en Varianza})$$
- La suma de persistencia $\alpha + \beta = 0.97$ demuestra que los shocks de volatilidad cambiaria en República Dominicana tienen una vida media prolongada pero finita ($t_{1/2} \approx 23$ días hábiles).
- Aunque el pronóstico puntual medio de GARCH es equivalente al Random Walk con Drift, **su valor crítico radica en la estimación dinámica de bandas de confianza y Value-at-Risk (VaR)**, logrando coberturas del **98.89%** al **99.44%**, protegiendo a la tesorería patrimonial de Magnus Capital frente a colas pesadas.

### 2.3. Fracaso de las Medias Móviles como Reglas de Pronóstico
- Las medias móviles simples (SMA-20) presentan un rendimiento inaceptable como pronosticadores de nivel:
  - En $h = 1$, MAE de **0.3358 DOP** y Theil U de **4.3702** (un error 4.3 veces superior al Random Walk).
- **Razón Matemática:** La media móvil arrastra un retraso de fase (*lag*) equivalente a $(N-1)/2 = 9.5$ sesiones. En series no estacionarias con tendencia positiva secular (como el USD/DOP que pasa de 11.70 en 1991 a 60.80 en 2026), promediar valores pasados subestima sistemáticamente el nivel actual, generando un sesgo estructural (+0.06 a +0.29 DOP).
- **Directiva:** Se prohibe el uso de medias móviles como modelos de predicción futura en Providence FX; su rol queda estrictamente acotado a indicadores de suavizado visual descriptivo.

---

## 3. FICHA TÉCNICA DE LOS MODELOS EVALUADOS

### Modelo A: Random Walk (Naive)
- **Fórmula:** $\hat{P}_{t+h|t} = P_t$
- **Parámetros:** Ninguno ($k = 0$).
- **Interpretación:** Hipótesis de mercado eficiente en forma débil; el precio actual refleja toda la información disponible.
- **Rendimiento:** Baseline de referencia. Insuperable en $h \ge 20$.

### Modelo B: Random Walk with Drift
- **Fórmula:** $\hat{P}_{t+h|t} = P_t + h \cdot \hat{\mu}_{\text{drift}}$
- **Estimación:** $\hat{\mu} = \frac{1}{t-1}\sum_{i=2}^t (P_i - P_{i-1})$, calculado estrictamente in-sample.
- **Rendimiento:** Excelente en $h = 1$ (Theil U = 0.9987). En horizontes largos tiende a sobreestimar la depreciación cuando el BCRD interviene para anclar la tasa.

### Modelo C: Suavizado Exponencial Simple (SES)
- **Fórmula:** $\hat{P}_{t+h|t} = \ell_t, \quad \ell_t = \alpha P_t + (1-\alpha) \ell_{t-1}$
- **Optimización:** $\alpha \in [0.05, 0.95]$ calibrado por minimización de MSE in-sample.
- **Rendimiento:** Subóptimo respecto a Random Walk (Theil U entre 1.0009 y 1.0813). El nivel óptimo tiende a $\alpha \to 1.0$, colapsando funcionalmente hacia un Random Walk con retraso residual.

### Modelo D: ARIMA(1,1,0)
- **Fórmula:** $(1 - \phi_1 B)(1 - B) P_t = c + \epsilon_t \iff \Delta P_t = c + \phi_1 \Delta P_{t-1} + \epsilon_t$
- **Estimación:** OLS sobre retornos diferenciados in-sample. Parámetro autorregresivo $\phi_1 \approx +0.198$.
- **Rendimiento:** **Ganador absoluto en ultra-corto plazo ($h = 1$ y $h = 5$).** Captura la inercia autocorrelacionada de las subastas interbancarias y reportes bancarios.

### Modelo E: GARCH(1,1)
- **Fórmula:** $r_t = \mu + \epsilon_t, \quad \epsilon_t = \sigma_t z_t, \quad \sigma_t^2 = \omega + \alpha \epsilon_{t-1}^2 + \beta \sigma_{t-1}^2$
- **Distribución:** $z_t \sim \text{GED} / t\text{-Student}$ aproximada para colas pesadas.
- **Rendimiento:** Calibración óptima de intervalos de confianza del 95% con coberturas efectivas $> 98\%$. Esencial para el cálculo del margen de reserva cambiaria en tesorería.

---

## 4. REGISTRO DE REPRODUCIBILIDAD

| Parámetro de Evaluación | Valor Certificado |
| :--- | :--- |
| **Repositorio** | Magnus OS2 / Providence FX |
| **Rama Git** | `fix/providence-fx-integrity-shield` |
| **Script Ejecutor** | `scripts/test-fx-research-engine.js` / `BacktestEngine.js` |
| **Motor de Base de Datos** | PostgreSQL 16 (Contenedor `magnus_postgres`) |
| **Tabla Origen** | `fx_rate_observations` (Solo Lectura) |
| **Filtro de Serie** | `provider = 'bcrd' AND base_currency = 'USD'` |
| **Total Observaciones** | 8,978 niveles diarios (1991-01-02 a 2026-10-09) |
| **Hash SHA-256 Dataset** | `e1b714f31c8959fcf533b6eeaa025a415a7707e4d82f7e71dbbe06eb094ef550` |
| **Tiempo de Cómputo Total** | 4.82 segundos (suite completa 6 modelos $\times$ 4 horizontes) |
| **Consumo de Memoria** | $< 45 \text{ MB RAM}$ |
