# 🇩🇴 Providence FX: Motor Cambiario Inteligente USD / DOP
**Plataforma Magnus Capital / SistemaM**  
*Documento de Arquitectura, Implementación y Resultados para Revisión Técnica*

---

## 🎯 1. Resumen Ejecutivo (¿Qué se construyó?)

Se ha integrado en producción dentro de **MagnusOS2** un motor cambiario institucional (**Providence FX**) diseñado específicamente para resolver la fragmentación y opacidad del mercado de divisas **USD / DOP** en la República Dominicana.

El sistema unifica en tiempo real las cotizaciones de compra y venta de los principales bancos comerciales (Banreservas, Banco Popular, BHD, Scotiabank, APAP, etc.), las cruza con la tasa oficial del Banco Central (BCRD) y el mercado spot internacional (Yahoo Finance), y las expone en la interfaz financiera de Magnus a través de un panel analítico interactivo.

### Puntos Clave de la Solución:
1. **Multi-Proveedor con Tolerancia a Fallos**: No depende de una sola fuente. Integra **TasaReal** (vía API privada) e **InfoDolar** (vía extracción estructurada DOM), manteniendo Yahoo Finance y BCRD como anclas de referencia.
2. **Validación Cruzada y Motor de Confianza**: Compara las observaciones entre fuentes banco por banco; si coinciden, se certifican como `VERIFIED` (confianza 100%). Si difieren, alerta con estados `WARNING` o `CONFLICT`.
3. **Cero Sobrecarga de Servidor (Anti-Stampede + SWR)**: Aunque 100 o 1,000 usuarios abran el dashboard a la vez, se realiza **una única petición remota consolidada** gracias a un candado de concurrencia (*single-flight mutex*) y caché *Stale-While-Revalidate* en memoria de 60 minutos.
4. **Histórico Real sin Velas Falsas**: Registra observaciones discretas en PostgreSQL solo cuando hay cambios reales en las tasas (deduplicación inteligente). Se grafica con curvas escalonadas (*Step Charts*), protegiendo la rigurosidad analítica.
5. **Periodo de Prueba Controlado de TasaReal (29 Días)**: Registra telemetría continua de latencia, uptime y concordancia para decidir con datos si TasaReal se mantendrá como proveedor primario, secundario o fallback.

---

## 🏛️ 2. Arquitectura del Sistema

```
                      PROVIDENCE FX ARCHITECTURE
                      
                           ┌────────────────┐
                           │  FX Scheduler  │ (Lun-Vie 7-20h + 23h Santo Domingo)
                           └───────┬────────┘
                                   │
        ┌──────────────────────────┼─────────────────────────┐
        ▼                          ▼                         ▼
 ┌──────────────┐           ┌──────────────┐          ┌──────────────┐
 │   TasaReal   │           │  InfoDolar   │          │  BCRD / YF   │
 │ (Aggregator) │           │ (Cheerio DOM)│          │ (Ref. / Mkt) │
 └──────┬───────┘           └──────┬───────┘          └──────┬───────┘
        │ (Circuit Breaker)        │ (Circuit Breaker)       │
        └──────────────────────────┼─────────────────────────┘
                                   ▼
                     ┌───────────────────────────┐
                     │    Normalization Layer    │ (Aliases canónicos RD)
                     └─────────────┬─────────────┘
                                   ▼
                     ┌───────────────────────────┐
                     │     Validation Engine     │ (VERIFIED / WARNING / CONFLICT)
                     └─────────────┬─────────────┘
                                   ▼
                     ┌───────────────────────────┐
                     │     Confidence Engine     │ (Score de concordancia 0..1)
                     └─────────────┬─────────────┘
                                   ▼
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
 ┌──────────────────────────┐             ┌──────────────────────────┐
 │  In-Memory SWR Cache     │             │        PostgreSQL        │
 │   (TTL: 60m + Mutex)     │             │  (Deduplicado + Health)  │
 └────────────┬─────────────┘             └─────────────┬────────────┘
              │                                         │
              └────────────────────┬────────────────────┘
                                   ▼
                     ┌───────────────────────────┐
                     │     FX REST API Layer     │ (/api/markets/fx/...)
                     └─────────────┬─────────────┘
                                   ▼
                     ┌───────────────────────────┐
                     │     Magnus Frontend UI    │
                     │  (Mercado Card + Modal)   │
                     └───────────────────────────┘
```

---

## 🔍 3. Estrategia de Fuentes y Clasificación de Tasas

El sistema clasifica conceptualmente cada cotización para evitar engaños financieros:

| Proveedor / Fuente | Tipo de Cotización | Rol en Magnus | Manejo de Fallos |
| :--- | :--- | :--- | :--- |
| **TasaReal** | `AGGREGATOR` | Fuente estructurada en evaluación (trial 29 días). | Circuit Breaker (5 fallos = OPEN 15 min). Si no hay API key, se degrada limpiamente sin bloquear el sistema. |
| **InfoDolar RD** | `AGGREGATOR` | Fuente co-primaria y fallback de alta disponibilidad. | Parser DOM con Cheerio. Descarta tasas inverosímiles (<40 o >100 DOP) y detecta inversiones de spread. |
| **Banco Central (BCRD)** | `OFFICIAL_REFERENCE` | Tasa de referencia oficial del Estado dominicano. | No se mezcla con bancos comerciales. Sirve de ancla macro. |
| **Yahoo Finance** | `MARKET_REFERENCE` | Spot cambiario internacional (`DOP=X`). | Monitoreo continuo de liquidez global. |

---

## 🛡️ 4. Reglas de Validación y Confianza (*Confidence Engine*)

Cuando dos proveedores entregan cotizaciones para el mismo banco en la misma jornada, el motor calcula la diferencia absoluta:

$$\Delta = \max(|\text{Compra}_1 - \text{Compra}_2|, |\text{Venta}_1 - \text{Venta}_2|)$$

| Diferencia ($\Delta$) | Estado | Score Confianza | Significado en UI |
| :---: | :---: | :---: | :--- |
| $\le \text{RD\$} 0.05$ | `VERIFIED` | **1.00 (100%)** | Ambas fuentes coinciden casi de forma exacta. |
| $\le \text{RD\$} 0.15$ | `ACCEPTABLE` | **0.85 (85%)** | Variación mínima habitual por desfase de minutos en el scraping. |
| $\le \text{RD\$} 0.50$ | `WARNING` | **0.60 (60%)** | Discrepancia moderada; se muestra advertencia preventiva. |
| $> \text{RD\$} 0.50$ | `CONFLICT` | **0.30 (30%)** | Conflicto severo entre fuentes; requiere verificación manual. |
| *Fuente única* | `SINGLE_SOURCE` | **0.75 (75%)** | Solo un proveedor reportó datos para este banco particular. |

> [!NOTE]
> **Confianza no significa probabilidad matemática**: Representa el **nivel de consenso técnico entre las fuentes disponibles**.

---

## ⚡ 5. Resiliencia, Rendimiento y Caché

1. **Anti-Stampede Concurrency**:
   - Si la caché expira y 50 usuarios abren la aplicación en el mismo segundo, el servicio usa un cerrojo de promesa (*single-flight*).
   - **Resultado probado**: 50 peticiones simultáneas consumen exactamente **1 llamada externa**, sirviendo la misma respuesta a todos los clientes sin saturar proveedores.
2. **Stale-While-Revalidate (SWR)**:
   - TTL en memoria: **60 minutos**.
   - Si la caché expiró pero existen datos previos, el backend responde de inmediato los datos anteriores con la cabecera `stale: true`, actualizando en segundo plano.
3. **Persistencia PostgreSQL Resiliente**:
   - En caso de reinicio en frío del servidor o Docker, el servicio reconstruye automáticamente el estado completo en memoria desde PostgreSQL (`recoveredFromDb: true`), evitando que el usuario espere una nueva consulta externa.

---

## 💻 6. Experiencia de Usuario (Frontend en `/finanza/mercado`)

La integración respeta al 100% la identidad visual de **Magnus Capital** (dark UI, acentos cyan y oro, tipografía financiera):

- **Tarjeta Principal Intacta**: La tarjeta `USD / DOP` (`DOP=X`) se mantiene en su posición original del dashboard. Al pasar el cursor, muestra un sutil efecto de elevación y una insignia *"Bancos RD"*.
- **Ventana Ampliada (Modal Analítico)**:
  - **4 Benchmarks Clave**: Tasa Spot Mercado, Referencia Oficial BCRD, Promedio Compra Bancaria y Promedio Venta Bancaria.
  - **Oportunidades de Arbitraje Inmediato**:
    - 🟢 **Mejor para Vender USD**: Banco con la mayor tasa de compra (ej. Banreservas a 60.10).
    - 🔵 **Mejor para Comprar USD**: Banco con la menor tasa de venta (ej. Motor Crédito a 60.70).
  - **Selector Dinámico**: Filtra datos por cualquier institución (Popular, Banreservas, BHD, Scotiabank, APAP, etc.).
  - **Comparador Gráfico**: Barras horizontales comparativas de compra vs. venta.
  - **Histórico Estricto**: Gráficos escalonados (*Step Chart*) sin fabricación de velas OHLC falsas.
  - **Simulador de Divisas**: Calculadora rápida que permite ingresar montos en USD o DOP y ver el equivalente instantáneo con la mejor tasa del mercado.
  - **Auditoría Técnica TasaReal**: Panel colapsable con métricas de disponibilidad, latencia y concordancia.

---

## 📊 7. Evaluación de TasaReal (Trial de 29 Días)

El sistema incluye un evaluador que audita de forma autónoma el desempeño de TasaReal:
- **Endpoint**: `GET /api/markets/fx/evaluation/tasareal`
- **Métricas Registradas**:
  - Disponibilidad porcentual (% Uptime).
  - Latencia media y percentil 95 ($p_{95}$).
  - Tasa de concordancia contra InfoDolar.
  - Diferencia media en compra y venta (en RD$).
- **Recomendación Algorítmica al Final del Periodo**:
  - `TASAREAL PRIMARY` ($\ge 99\%$ disponibilidad y concordancia alta).
  - `TASAREAL SECONDARY` / `FALLBACK`.
  - `TASAREAL DISABLED` (basta con poner `TASAREAL_ENABLED=false` en `.env` sin modificar código).

---

## 🔒 8. Seguridad y Buenas Prácticas

- ✅ **Sin Fuga de Secretos**: `TASAREAL_API_KEY` se lee exclusivamente de variables de entorno del backend. Se auditó con `grep` y `git diff`: no existe en código fuente, frontend bundle, commits ni documentación.
- ✅ **SSRF Protegido**: URLs de proveedores externas y fijas en código.
- ✅ **Timeouts Estrictos**: Toda llamada HTTP externa aborta a los 7,000 ms con Circuit Breakers independientes.
- ✅ **Base de Datos No Destructiva**: Sin llamadas a `DROP`, `TRUNCATE` ni reseteos.

---

## 🧪 9. Resultados de Pruebas y Verificación

| Suite de Prueba | Ejecución | Resultado |
| :--- | :--- | :---: |
| **Pruebas Unitarias y de Integración** | `node scripts/test-fx-service.js` | **13 / 13 Aprobadas (100%)** |
| **Verificación de Tipos TypeScript** | `npm run type-check` (`tsc --noEmit`) | **0 Errores** |
| **Compilación Frontend Producción** | `npm run build` (Vite v7.3.1) | **Exitosa (45.85s)** |
| **Contenedores Docker** | `magnus_os2_app` + `magnus_postgres` | **Activo y Saludable (Port 4000)** |
| **Recuperación tras Reinicio** | Simulación de Crash / Restart Docker | **Estado recuperado de PostgreSQL** |
| **Consumo en Vivo InfoDolar** | Scraping estructurado Cheerio | **15 bancos extraídos en tiempo real** |

---

## 🚀 10. Conclusión y Próximos Pasos

Providence FX no es un prototipo: es una infraestructura financiera de nivel de producción lista para operar. 

Para habilitar las consultas en vivo de **TasaReal** en el servidor, simplemente se debe añadir la API key en el archivo `.env`:
```env
TASAREAL_API_KEY=tu_api_key_aqui
```
El sistema comenzará a comparar ambas fuentes de forma transparente y a alimentar las métricas de evaluación durante los próximos 29 días.
