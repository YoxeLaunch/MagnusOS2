# 🎮 Guía de Comandos - Sistema Magnus

Esta guía detalla los comandos disponibles para administrar, mantener y optimizar el sistema.

## 🚦 Control Básico

### Iniciar el Sistema
Para encender el sistema (Backend + Frontend), simplemente ejecuta el archivo:
`INICIAR_SISTEMA.bat`

### Apagar el Sistema
En la ventana de la terminal donde corre el sistema:
1. Presiona `Ctrl + C`
2. El sistema preguntará "¿Desea terminar el trabajo por lotes? (S/N)"
3. Escribe `S` y presiona Enter.

### Reiniciar
Actualmente, la forma más segura es **Apagar** (ver arriba) y volver a ejecutar `INICIAR_SISTEMA.bat`.

---

## 🛠️ Herramientas de Mantenimiento

Puedes ejecutar estos comandos abriendo una terminal en la carpeta del proyecto (`c:\Magnus\SistemaM`).

### 🔍 Analizar y Detectar Errores
Si sientes que algo falla o quieres verificar la "salud" del código:
```bash
npm run analyze
```
> **¿Qué hace?**: Verifica que no haya errores de compilación y busca problemas de código (Linting) usando Biome.

### 🧹 Formatear Código (Limpieza)
Para ordenar el código automáticamente:
```bash
npm run format
```
> **¿Qué hace?**: Re-organiza el código para que sea legible, siguiendo estándares profesionales.

### 🔄 Comprobar Actualizaciones
Para ver si hay nuevas versiones de las librerías del sistema:
```bash
npm outdated
```
Para actualizar todo (¡Usar con precaución!):
```bash
npm update
```

---

## ⚡ Comandos Avanzados (Developers)

| Comando | Descripción |
| :--- | :--- |
| `npm run server:bun` | Corre solo el Backend (Cerebro) con Bun. |
| `npm run dev` | Corre solo el Frontend (Interfaz) con Vite. |
| `npm run build` | Compila el sistema para producción. |
