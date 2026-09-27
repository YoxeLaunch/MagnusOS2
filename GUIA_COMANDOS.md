# 📖 Guía de Comandos de Magnus OS 2

Esta guía contiene los comandos y scripts más importantes para operar, mantener y administrar **Magnus OS 2** en tu servidor.

---

## 🌐 1. Acceso Remoto y Red (Cloudflare Tunnel)

### 🚀 Iniciar Túnel Cloudflare para Docker
Abre un túnel público seguro (HTTPS) hacia el puerto `4000` (Docker):
```bash
# Método rápido con script
./tunel_docker.sh

# O mediante comando directo
cloudflared tunnel --url http://localhost:4000
```

### ⚙️ Iniciar Túnel en Segundo Plano (con archivo de registro)
```bash
# Inicia el túnel y guarda la salida en cloudflared.log
nohup cloudflared tunnel --logfile cloudflared.log --url http://localhost:4000 > /dev/null 2>&1 &
```

### 🔍 Obtener el Link Activo de Cloudflare
Para ver la URL `.trycloudflare.com` generada:
```bash
grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' cloudflared.log | tail -n 1
```

### 🛑 Detener el Túnel de Cloudflare
```bash
pkill -f cloudflared
```

### 🏠 Acceso en Red Local
- **Panel Web Local:** `http://localhost:4000`
- **Por Red LAN:** `http://<IP_DEL_SERVIDOR>:4000`
- **Por mDNS:** `http://Manus.local:4000`

---

## 🐳 2. Gestión con Docker Compose (Producción)

### Iniciar todos los contenedores
```bash
docker compose up -d
```

### Ver estado y salud de los contenedores
```bash
docker compose ps
# O usa el panel gráfico de terminal de Magnus:
node scripts/server-info.js
```

### Ver registros (Logs) en tiempo real
```bash
# Todos los contenedores
docker compose logs -f

# Solo la aplicación principal
docker compose logs -f magnus

# Solo la base de datos PostgreSQL
docker compose logs -f postgres

# Solo el Sandbox de IA
docker compose logs -f sandbox
```

### Reiniciar o Detener servicios
```bash
# Reiniciar la aplicación principal
docker compose restart magnus

# Detener todos los contenedores
docker compose down
```

### Reconstruir tras hacer cambios en el código
```bash
docker compose up -d --build magnus
```

---

## 💻 3. Ejecución y Desarrollo Local (Node.js)

### 🚀 Lanzador Integral (Frontend + Backend + Cloudflare)
Inicia los servicios de desarrollo simultáneamente:
```bash
./iniciar_sistema.sh
# O mediante npm:
npm run start:all
```

### Ejecución individual por componentes
```bash
# Iniciar solo el Servidor Backend (Puerto 4001)
npm run server

# Iniciar solo el Frontend de desarrollo Vite (Puerto 4000)
npm run dev

# Iniciar el Servidor de Protocolo de Contexto de Modelo (MCP)
npm run mcp
```

### Diagnóstico e Información del Servidor
Muestra el estado de la red, puertos y contenedores de forma visual:
```bash
node scripts/server-info.js
```

---

## 🗄️ 4. Base de Datos (PostgreSQL) y Respaldos

### 💾 Crear Respaldo de la Base de Datos
Genera un archivo `.sql.gz` comprimido en `/home/osvaldo/backups/magnus-os2`:
```bash
./scripts/backup.sh
```

### 🔄 Restaurar una Copia de Seguridad
Muestra un menú interactivo con los respaldos existentes para restaurar:
```bash
./scripts/restore.sh
```

### 🖥️ Consola SQL Interactiva (psql)
Conéctate directamente a la base de datos dentro del contenedor:
```bash
docker exec -it magnus_postgres psql -U magnus -d magnus
```

### 📊 Validar Consistencia de Balances
Ejecuta la validación de saldos y registros contables:
```bash
node scripts/validate-balances.js
```

---

## 🤖 5. Inteligencia Artificial (Ollama, Gemini y Sandbox)

### 🧪 Probar Conexión con Google Gemini
```bash
node scripts/test-gemini.js
```

### 📋 Listar Modelos de Gemini Disponibles
```bash
node scripts/list-models.js
```

### 🦙 Administrar Modelos Locales en Ollama
```bash
# Ver modelos descargados en el contenedor
docker exec -it magnus_ollama ollama list

# Descargar un modelo nuevo (ej: llama3)
docker exec -it magnus_ollama ollama pull llama3:latest

# Ejecutar un modelo interactivo por terminal
docker exec -it magnus_ollama ollama run llama3:latest
```

### 🐍 Monitorear el Sandbox de Ejecución Python
```bash
docker logs -f magnus_sandbox
```

---

## 🧹 6. Calidad de Código, Pruebas y Mantenimiento

```bash
# Verificación estática de TypeScript
npm run type-check

# Análisis y formateo con Biome
npm run lint
npm run format

# Ejecución de pruebas unitarias
npm test
```
