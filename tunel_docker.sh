#!/bin/bash
# Script para abrir un túnel de Cloudflare hacia el sistema que corre en Docker (puerto 4000)

echo "📡 Abriendo túnel de Cloudflare hacia Magnus OS 2 (Docker)..."

# Verificar si el contenedor de Magnus está corriendo
if ! docker ps | grep -q "magnus_os2_app"; then
    echo "⚠️  El contenedor 'magnus_os2_app' no parece estar corriendo."
    echo "💡 Puedes iniciarlo con: docker-compose up -d"
fi

# Iniciar el túnel
cloudflared tunnel --url http://localhost:4000
