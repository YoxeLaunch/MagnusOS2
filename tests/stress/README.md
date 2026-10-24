# ⚡ MagnusOS2 — Suite de Pruebas de Carga y Estrés (Stress Testing)

Esta carpeta contiene la batería de scripts utilizada para medir el rendimiento, concurrencia de usuarios, saturación de CPU, capacidad del pool de base de datos y comportamiento de WebSockets en **MagnusOS2**.

El informe ejecutivo con los resultados de las pruebas iniciales se encuentra documentado en [INFORME_STRESS_TEST_2026-10-24.md](../../INFORME_STRESS_TEST_2026-10-24.md).

---

## 📁 Archivos de la Suite

| Archivo | Tipo | Propósito |
|---|---|---|
| `load.mjs` | Node.js (ESM) | Generador de carga multifunción: navegación (`browse`), ráfaga continua (`burst`), y saturación de logins (`login`). |
| `load2.mjs` | Node.js (ESM) | Prueba en estado estable: fase de pre-login gradual (warmup) seguida de navegación medida con recolección de percentiles (p50, p90, p95, p99). |
| `socket-test.mjs` | Node.js (ESM) | Prueba de concurrencia y persistencia de WebSockets autenticados vía Socket.io. |
| `prod_ratelimit_probe.mjs` | Node.js (ESM) | Verificador no intrusivo para auditar el rate limiter global (300 req / 15 min por IP). |
| `ramp.sh` | Bash | Ejecución escalonada de usuarios virtuales (`load.mjs`) capturando uso de CPU, memoria RSS y loadavg. |
| `ramp2.sh` | Bash | Rampa adaptativa (`load2.mjs`) con aborto preventivo si se supera el umbral de degradación de SLA (errores > 2% o p95 > 2500ms). |

---

## ⚙️ Configuración y Variables de Entorno

Los scripts aceptan variables de entorno opcionales para evitar credenciales o puertos estáticos:

```bash
export STRESS_URL="http://127.0.0.1:4100"      # URL base del backend objetivo (por defecto: puerto 4100 para réplicas de test)
export STRESS_USER="stress_bot"               # Usuario de prueba registrado
export STRESS_PASS="Stress!Bot2026"           # Contraseña del usuario de prueba
```

---

## 🚀 Guía de Uso

> [!IMPORTANT]
> **Recomendación de Seguridad:** Se recomienda ejecutar estas pruebas contra una instancia de réplica aislada (e.g. `NODE_ENV=test` con base de datos en `DATABASE_URL_TEST`) o en entornos de staging para evitar saturar el pool de conexiones del entorno de producción.

### 1. Prueba de navegación simulada (Usuarios concurrentes reales)
Simula usuarios navegando por los endpoints principales del dashboard (`accounts`, `net-worth`, `transactions`, `cashflow`) con pausas de lectura aleatorias (~1.5–4.5s):

```bash
# Uso: node load.mjs browse <concurrencia> <duracion_segundos> [puerto_opcional]
node tests/stress/load.mjs browse 100 60
```

### 2. Prueba de estado estable con calentamiento (Warmup)
Inicia sesión de manera escalonada para no ahogar la CPU con `bcrypt`, y luego mide la navegación sostenida:

```bash
# Uso: node load2.mjs <usuarios> <duracion_segundos>
node tests/stress/load2.mjs 200 60
```

### 3. Prueba de saturación de logins
Mide la capacidad máxima de procesamiento de contraseñas por segundo:

```bash
# Uso: node load.mjs login <concurrencia> <duracion_segundos>
node tests/stress/load.mjs login 10 30
```

### 4. Prueba de conexiones WebSockets simultáneas
Evalúa la estabilidad de conexiones Socket.io y la memoria del servidor bajo retención:

```bash
# Uso: node socket-test.mjs <n_conexiones> <segundos_mantenimiento>
node tests/stress/socket-test.mjs 300 30
```

### 5. Verificación de Rate Limiting
Comprueba si el middleware de seguridad bloquea ráfagas tras exceder el límite configurado:

```bash
# Uso: node prod_ratelimit_probe.mjs [total_peticiones] [concurrencia]
node tests/stress/prod_ratelimit_probe.mjs 310 10
```

### 6. Ejecución de rampas completas
```bash
chmod +x tests/stress/ramp.sh tests/stress/ramp2.sh
./tests/stress/ramp2.sh
```

---

## 📊 Formato de Salida

Cada ejecución imprime un objeto JSON estructurado listo para ser parseado por pipelines o herramientas de métricas:

```json
{
  "usuarios": 200,
  "medida_s": 60,
  "rps": 64.2,
  "errores": 0,
  "error_pct": 0,
  "latencia_ms": {
    "p50": 28,
    "p90": 85,
    "p95": 142,
    "p99": 310,
    "max": 845
  }
}
```
