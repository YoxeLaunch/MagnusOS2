# GUÍA TÉCNICA: Marco Financiero - Proyección 2026

## Introducción
Este documento detalla los algoritmos, fórmulas y terminología financiera implementada en el módulo de **Proyección 2026** del sistema Magnus. Sirve como referencia teórica para entender cómo el sistema calcula, predice y analiza el comportamiento financiero del usuario.

---

## 1. Ciclos Financieros (Financial Cycles)

El sistema **NO** utiliza meses calendario estándar (1-30). Utiliza ciclos financieros optimizados para la gestión de nómina y flujo de efectivo personal.

- **Definición de Ciclo**: Comienza el día **26 del mes anterior** y termina el día **25 del mes actual**.
- **Ejemplo**: El ciclo "Febrero" va del 26 de Enero al 25 de Febrero.
- **Excepción Anual**: El ciclo "Enero" cubre desde Diciembre hasta el 25 de Enero para alinearse con el fin de año fiscal.

---

## 2. Métricas Clave (KPIs)

A continuación se describen las 5 métricas principales que evalúan la salud financiera.

### A. Tasa de Ahorro (Savings Rate)
*Anteriormente conocida como "Eficiencia"*

- **Concepto**: Mide qué porcentaje de tus ingresos no se gasta y se retiene como capital.
- **Fórmula**:
  $$ \text{Tasa de Ahorro} = \left( \frac{\text{Ingresos} - \text{Gastos}}{\text{Ingresos}} \right) \times 100 $$
- **Interpretación**:
  - **< 0%**: Déficit (gastas más de lo que ganas).
  - **0-10%**: Ahorro mínimo, riesgo alto.
  - **10-20%**: Saludable.
  - **> 20%**: Excelente capacidad de capitalización.

### B. Disciplina Financiera (Financial Discipline)
*Anteriormente conocida como "Lealtad"*

- **Concepto**: Evalúa la consistencia del usuario en el registro de datos. Un sistema financiero solo es útil si los datos son completos.
- **Ventana de Análisis**: Últimos 90 días.
- **Fórmula**:
  $$ \text{Disciplina} = \left( \frac{\text{Días únicos con registros}}{\text{Días totales (90)}} \right) \times 100 $$
- **Interpretación**:
  - Mide el hábito, no el dinero. Un score alto indica que el sistema tiene "visibilidad total" de tu realidad financiera.

### C. Adherencia al Plan (Plan Adherence)
*Anteriormente conocida como "Compromiso"*

- **Concepto**: Mide la efectividad en el cumplimiento de objetivos de ahorro a lo largo del tiempo.
- **Fórmula**:
  $$ \text{Adherencia} = \left( \frac{\text{Meses proyectados con Ahorro Positivo}}{\text{Total de meses proyectados}} \right) \times 100 $$
- **Interpretación**:
  - Indica la sostenibilidad de tu estilo de vida a largo plazo.

### D. Pista de Efectivo (Cash Runway)
*Nueva métrica de supervivencia*

- **Concepto**: Tiempo estimado (en meses) que podrías mantener tu nivel de vida actual si tus ingresos cayeran a cero hoy mismo.
- **Fórmula**:
  $$ \text{Runway} = \frac{\text{Ahorros Totales Estimados}}{\text{Gasto Mensual Promedio Promediado}} $$
- **Interpretación**:
  - **3 meses**: Fondo de emergencia mínimo.
  - **6 meses**: Seguridad financiera sólida.
  - **12+ meses**: Libertad financiera.

### E. Estabilidad de Gastos (Expense Stability)
*Métrica de volatilidad*

- **Concepto**: Mide qué tan predecibles son tus gastos. Penaliza los picos de gasto erráticos.
- **Base Matemática**: Desviación Estándar ($\sigma$).
- **Fórmula**:
  $$ \text{Estabilidad} = 100 - \left( \frac{\text{Desviación Estándar}}{\text{Promedio de Gastos}} \times 100 \right) $$
- **Interpretación**:
  - Mayor score significa gastos controlados y predecibles.
  - Menor score indica caos financiero o gastos imprevistos frecuentes.

---

## 3. Algoritmos de Predicción

El sistema utiliza un motor de proyección híbrido para estimar el futuro hasta el final de 2026.

### Fase 1: Recolección de Datos (Cold Start)
- **Condición**: Menos de 3 ciclos de datos históricos.
- **Método**: **Promedio Simple**.
- **Lógica**: Asume que el futuro será idéntico al promedio del pasado reciente.
- **Confianza**: Baja.

### Fase 2: Análisis de Tendencias (Linear Regression)
- **Condición**: 3 o más ciclos históricos.
- **Método**: **Regresión Lineal por Mínimos Cuadrados**.
- **Ecuación**: $y = mx + b$
  - $y$: Valor proyectado (Ingreso/Gasto).
  - $x$: Tiempo (meses futuros).
  - $m$: Pendiente (tasa de crecimiento o reducción).
  - $b$: Intercepto (punto base).
- **Lógica**: Detecta si tus finanzas están mejorando o empeorando progresivamente y proyecta esa trayectoria.
- **Ejemplo**: Si tus gastos suben $50 cada mes, el sistema asumirá que seguirán subiendo y te alertará en las proyecciones futuras.

---

## 4. Tiempos de Maduración de Datos

Para obtener resultados confiables, el sistema requiere:

1.  **Nivel Básico (1 Mes)**:
    - Se activan métricas de Tasa de Ahorro y Disciplina.
    - Proyecciones estáticas.

2.  **Nivel Confiable (3 Meses)**:
    - **Punto Crítico**: Se activa la Regresión Lineal.
    - Las métricas de Estabilidad y Adherencia cobran sentido estadístico.

3.  **Nivel Óptimo (6+ Meses)**:
    - Máxima precisión en Cash Runway.
    - Detección de patrones estacionales.

---

*Documento generado automáticamente por el sistema Magnus - Módulo Financiero 2026.*
