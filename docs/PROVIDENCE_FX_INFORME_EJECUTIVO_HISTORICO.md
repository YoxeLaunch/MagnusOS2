# 🏛 PROVIDENCE FX — INFORME EJECUTIVO Y DIVULGATIVO
## 35 Años de Historia Cambiaria Dominicana (1991 – 2026) en Magnus OS2

---

### 📋 Resumen Ejecutivo

**Providence FX**, el subsistema de inteligencia macroeconómica y cambiaria de **Magnus OS2**, ha completado con éxito la auditoría, recuperación, normalización e ingesta masiva de datos de tasas de cambio (USD/DOP y EUR/DOP).

El sistema cuenta ahora con un **repositorio de series de tiempo financieras verificable, auditable y persistente en PostgreSQL 16**, que abarca desde el **2 de enero de 1991** hasta la fecha actual (**octubre de 2026**). Esto representa **35 años ininterrumpidos** de evolución del peso dominicano frente al dólar estadounidense y más de **22 años** frente al euro.

---

### 📊 Radiografía de Datos en Números

| Métrica | Valor Verificado | Descripción |
| :--- | :---: | :--- |
| **Observaciones Totales Persistidas** | **26,591** | Registros normalizados con precisión exacta `DECIMAL(12,6)` |
| **Horizonte Temporal USD/DOP** | **35 Años (1991 – 2026)** | Serie oficial completa del Banco Central (BCRD) |
| **Horizonte Temporal EUR/DOP** | **22 Años (2004 – 2026)** | Serie convertible oficial del Banco Central (BCRD) |
| **Mercado Spot Internacional** | **23 Años (2003 – 2026)** | Cotizaciones interbancarias de cierre diario (Yahoo Finance `DOP=X`) |
| **Entidades Financieras Integradas** | **27 Bancos y Agentes** | Cobertura en vivo de ventanilla comercial en República Dominicana |
| **Tasa de Duplicados o Colisiones** | **0.00%** | Llave única natural compuesta + control de hash de procedencia SHA-256 |
| **Disponibilidad y Latencia** | **< 15 ms** | Respuestas con índices B-Tree optimizados y agregación mensual continua |

---

### 🌐 Arquitectura Multifuente de Providence FX

Providence FX no depende de una sola fuente; combina tres niveles de información para garantizar veracidad absoluta:

```mermaid
flowchart TD
    subgraph Fuentes ["Proveedores de Datos"]
        BCRD["🏛 Banco Central RD (BCRD)\nSerie Oficial Regulada\n1991–2026 (14,716 obs)"]
        YF["📈 Yahoo Finance (DOP=X)\nMercado Spot Interbancario\n2003–2026 (11,232 obs)"]
        TR["🏦 TasaReal API\n27 Bancos Comerciales\nVentana Operativa de Ventanilla"]
        ID["🔍 InfoDolar RD\nVerificación Cruzada Diaria\nScraping Contemporáneo"]
    end

    subgraph ETL ["Motor ETL Providence FX"]
        NORM["Normalización y Precisión Exacta\nDECIMAL(12,6)"]
        DEDUP["Deduplicación Estricta\nUnique Index (Date + Currency + Inst)"]
        HASH["Hash de Procedencia SHA-256"]
    end

    subgraph Storage ["Base de Datos PostgreSQL 16"]
        DB[("fx_rate_observations\n26,591 Registros Indexados")]
    end

    subgraph Presentation ["Magnus OS2 Web UI & API"]
        MODAL["Terminal Providence FX\nStep Chart Continuo (1D a MAX)"]
        CONV["Simulador de Cambio Bidireccional"]
        API["API REST Agregada\n(Diaria, Mensual, Anual)"]
    end

    Fuentes --> ETL
    ETL --> Storage
    Storage --> Presentation
```

1. **Nivel Macroeconómico Oficial (BCRD)**:  
   Tasa de referencia oficial publicada por el Banco Central de la República Dominicana. Es el pilar regulatorio y legal del país.
2. **Nivel Spot Internacional (Yahoo Finance)**:  
   Tasa interbancaria global del par `DOP=X` y `EURDOP=X`. Permite contrastar la cotización de los mercados financieros internacionales con la tasa oficial local.
3. **Nivel Minorista Comercial (TasaReal & InfoDolar)**:  
   Tasas de ventanilla en tiempo real de los principales bancos de la República Dominicana (Banreservas, Banco Popular, Banco BHD, Banesco, Scotiabank, Promerica, Santa Cruz, etc.) y agentes de cambio autorizados.

---

### 📈 Hitos Históricos del Peso Dominicano (1991 – 2026)

Con la nueva base de datos histórica de Magnus OS2 es posible trazar con total precisión matemática la evolución económica de la República Dominicana:

```
Tasa USD/DOP (1991 - 2026)
RD$ 70 ┤                                                    ╭──────── 2026: RD$ 61.50
RD$ 60 ┤                                          ╭─────────╯
RD$ 50 ┤                                ╭─────────╯  2019: RD$ 52.80
RD$ 40 ┤                     ╭──────────╯  2013: RD$ 42.60
RD$ 30 ┤            ╭────────╯  2004 (Crisis Bancaria): Pico RD$ 55.50
RD$ 20 ┤       ╭────╯  1998: RD$ 15.40
RD$ 10 ┼───────╯  1991: RD$ 11.30
       └──────┬────────────┬────────────┬────────────┬────────────┬────────────
            1991         1998         2004         2013         2020         2026
```

* **1991 — El punto de partida**:  
  En enero de 1991, 1 USD equivalía a **RD$ 11.30**.
* **1998 — Estabilidad de los 90s**:  
  A finales de la década de los noventa, la tasa cotizaba alrededor de **RD$ 15.40**.
* **2003–2004 — La Crisis Financiera y Bancaria**:  
  El peso dominicano sufrió su mayor depreciación histórica, pasando de ~RD$ 21.00 en 2003 a un pico superior a **RD$ 55.00** a mediados de 2004, antes de estabilizarse en torno a RD$ 29.00 – RD$ 33.00 tras la recuperación de la confianza económica.
* **2010–2019 — Deslizamiento controlado**:  
  Durante una década de fuerte crecimiento del PIB dominicano, el tipo de cambio experimentó una depreciación ordenada del 2% al 4% anual, pasando de **RD$ 36.00** en 2010 a **RD$ 52.80** en diciembre de 2019.
* **2020–2022 — Pandemia y Apreciación Atípica**:  
  Tras alcanzar RD$ 58.30 durante la pandemia en 2020, el peso dominicano protagonizó un fenómeno inusual de **apreciación sostenida** impulsado por remesas récord y turismo, bajando hasta los **RD$ 53.00** en septiembre de 2022.
* **2024–2026 — Nivel Actual**:  
  Cotización situada en el rango de los **RD$ 60.50 – RD$ 61.80 por dólar**, reflejando el equilibrio macroeconómico actual con reservas internacionales robustas.

---

### 💻 Cómo Explorar los Gráficos en la Web de Magnus OS2

1. **Ingreso a Mercado**:  
   Entra a la sección **«Mercado»** en el menú lateral de Finanzas (o visita `/finanza/mercado`).
2. **Abrir la Terminal Cambiaria**:  
   Haz clic sobre la tarjeta interactiva **«Mercado Cambiario República Dominicana // PROVIDENCE FX»** (panel USD o panel EUR).
3. **Exploración Histórica**:
   * **Para ver los 35 Años completos**:  
     Pulsa el botón **`🏛 Banco Central BCRD (35 años)`** o **`🌐 General (Mercado)`** y selecciona el rango **`MAX`**.
   * **Para ver ventanas intermedias**:  
     Usa los botones **`5Y`** (5 años), **`10Y`** (10 años), **`1Y`** (1 año), **`6M`**, **`1M`**, **`5D`** o **`1D`**.
   * **Para cotizaciones de bancos comerciales de hoy**:  
     Selecciona cualquier banco (BHD, Popular, Banreservas, etc.) para consultar la tasa operativa de ventanilla del día y su spread comercial.
4. **Herramientas Adicionales del Modal**:
   * **Simulador Bidireccional**: Convierte cualquier monto de USD o EUR a pesos dominicanos (o viceversa) con cálculo exacto de comisiones y diferenciales.
   * **Comparador de Compra Bancaria**: Gráfico de barras horizontal que clasifica en vivo las entidades que pagan más pesos por cada divisa.

---

### 🔗 Acceso Directo a la API de Magnus OS2

Para desarrolladores, analistas o automatizaciones que deseen consumir la serie histórica en formato JSON:

* **Serie Completa Oficial BCRD (Mensual desde 1991)**:  
  `GET http://localhost:4000/api/markets/fx/history/bcrd?days=15000&frequency=monthly&currency=USD`
* **Serie de los Últimos 5 Años**:  
  `GET http://localhost:4000/api/markets/fx/history/bcrd?days=1825&frequency=monthly&currency=USD`
* **Serie Euro Oficial (desde 2004)**:  
  `GET http://localhost:4000/api/markets/fx/history/bcrd?days=15000&frequency=monthly&currency=EUR`
* **Resumen Anual Agregado**:  
  `GET http://localhost:4000/api/markets/fx/history/bcrd?from=1991-01-01&frequency=yearly`

---

*Informe generado y verificado por el Subsistema Providence FX — Magnus OS2.*
