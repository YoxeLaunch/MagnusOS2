#!/bin/bash
# Script para instalar Magnus-OS2 como servicio del sistema (Systemd)

echo "🚀 Instalando Magnus-OS2 como servicio..."

# 1. Asegurar build de frontend actualizado
echo "📦 Construyendo frontend..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
npm run build

# 2. Copiar archivo de servicio
echo "SERVICE: Copiando archivo magnus.service..."
sudo cp scripts/magnus.service /etc/systemd/system/magnus.service

# 3. Recargar daemon
echo "DAEMON: Recargando systemd..."
sudo systemctl daemon-reload

# 4. Habilitar y arrancar
echo "ENABLE: Habilitando inicio automático..."
sudo systemctl enable magnus.service

echo "START: Iniciando servicio..."
sudo systemctl restart magnus.service

echo "✅ Servicio instalado y corriendo!"
echo "Estado actual:"
systemctl status magnus.service --no-pager
