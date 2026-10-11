# PROVIDENCE FX INTELLIGENCE — LISTA DE VERIFICACIÓN Y PROCEDIMIENTO DE DESPLIEGUE
## Operación Stability Shield — Guía de Despliegue Controlado en Producción
**Sistema:** Providence FX Intelligence (Nivel 3.1)  
**Ecosistema:** Magnus OS2 / Infraestructura Ubuntu Server  
**Rama Dedicada:** `fix/providence-fx-intelligence-stability`  
**Rama Base:** `fix/providence-fx-integrity-shield`  
**Fecha:** 2026-10-11  

---

## 1. ESTADO DE GIT Y VERSIÓN BASE

- **Versión Base / Commit de Partida:** `fix/providence-fx-integrity-shield` (Certificación Nivel 3.1)
- **Rama Actual:** `fix/providence-fx-intelligence-stability`
- **Estado de Trabajo:** Limpio, con todos los parches desarrollados, compilados y verificados.
- **Archivos Modificados:**
  1. `server/controllers/fxResearchController.js`
  2. `server/routes/fxResearch.routes.js`
  3. `server/services/fx/research/quantitativeResearchService.js`
  4. `src/apps/finanza/components/FxMercadoModal.tsx`
  5. `src/apps/finanza/components/providence-fx-intelligence/ProvidenceFxIntelligence.tsx`
  6. `src/apps/finanza/components/providence-fx-intelligence/components/FxResearchLab.tsx`
  7. `src/apps/finanza/components/providence-fx-intelligence/components/FxRiskPanel.tsx`
  8. `src/apps/finanza/components/providence-fx-intelligence/hooks/useFxIntelligence.ts`
  9. `src/apps/finanza/components/providence-fx-intelligence/index.ts`
  10. `src/apps/finanza/components/providence-fx-intelligence/types.ts`
- **Nuevos Archivos:**
  1. `src/apps/finanza/components/providence-fx-intelligence/components/ProvidenceErrorBoundary.tsx`
  2. `tests/providenceFxStabilityShield.test.js`
  3. `PROVIDENCE_FX_STABILITY_SHIELD_REPORT.md`
  4. `PROVIDENCE_FX_STABILITY_TEST_MATRIX.md`
  5. `PROVIDENCE_FX_DEPLOYMENT_CHECKLIST.md`

---

## 2. CAMBIOS EN CONFIGURACIÓN Y REQUISITOS PREVIOS

- **Variables de Entorno (`.env`):** No se requieren variables nuevas ni cambios en secrets.
- **Base de Datos PostgreSQL:** No se requieren migraciones DDL ni alteraciones de esquema. Las tablas `fx_rate_observations` y `fx_research_experiments` mantienen su estructura sin cambios.
- **Dependencias de Paquetes (`package.json`):** No se agregaron dependencias externas nuevas.
- **Estado de Contenedores Previos:**
  - `magnus_postgres` (puerto 5432): Saludable (Up).
  - `magnus_os2_app` (puerto 4000): Saludable (Up).
  - `magnus_sandbox` (puerto 5000): Saludable (Up).

---

## 3. PROCEDIMIENTO DE DESPLIEGUE CONTROLADO (PASO A PASO)

> [!IMPORTANT]
> Ejecute los siguientes comandos en la raíz del proyecto (`/home/osvaldo/proyectos/sistema-m/Magnus-OS2`).

### Paso 1: Confirmar Integridad del Código y Pruebas
Verifique que tanto la suite general como el verificador de integración en vivo pasen al 100%:
```bash
npm test
node scripts/test-providence-fx-intelligence-api.js
```
*Criterio de éxito: 74/74 tests en `npm test` y 28/28 checks en el script de API.*

### Paso 2: Generar el Bundle de Producción del Frontend
Construya los artefactos estáticos optimizados de React/Vite:
```bash
npm run build
```
*Criterio de éxito: Carpeta `dist/` actualizada en ~45 segundos sin errores de compilación.*

### Paso 3: Confirmar los Cambios en la Rama Git
```bash
git add server/ src/ tests/ PROVIDENCE_FX_*.md
git commit -m "fix(providence-fx): estabilidad integral shield - incidentes A, B, C, D resueltos"
```

### Paso 4: Actualizar el Contenedor de Aplicación en Ejecución
Reinicie el contenedor de Magnus OS2 para que cargue los controladores y servicios backend actualizados:
```bash
docker compose restart magnus_os2_app
```
*O si se requiere reconstrucción completa de la imagen:*
```bash
docker compose build magnus_os2_app
docker compose up -d magnus_os2_app
```

---

## 4. VERIFICACIÓN POST-DESPLIEGUE (SMOKE TESTING)

Ejecute la verificación de salud del servicio en el host:
```bash
# 1. Comprobar que el servicio responde
curl -s http://localhost:4000/api/health | jq .

# 2. Comprobar el estado del motor de benchmark
curl -s http://localhost:4000/api/markets/fx/research/backtests/status | jq .
# Esperado: { "success": true, "status": { "status": "IDLE", "isRunning": false } }

# 3. Comprobar que el endpoint de experimentos responde inmediatamente
curl -s "http://localhost:4000/api/markets/fx/research/experiments?currency=USD" | jq .count
# Esperado: 12

# 4. Comprobar el endpoint de riesgo y volatilidad
curl -s "http://localhost:4000/api/markets/fx/research/risk/volatility?currency=USD" | jq .success
# Esperado: true
```

---

## 5. PROCEDIMIENTO DE ROLLBACK DE EMERGENCIA

Si se detectara alguna anomalía no anticipada tras el despliegue:

```bash
# 1. Revertir el código a la versión anterior certificada
git checkout fix/providence-fx-integrity-shield

# 2. Reconstruir el bundle anterior
npm run build

# 3. Reiniciar el contenedor de aplicación
docker compose restart magnus_os2_app

# 4. Validar recuperación
curl -s http://localhost:4000/api/health
```
*Nota: Dado que no se aplicaron migraciones destructivas a la base de datos, el rollback no requiere operaciones sobre PostgreSQL.*
