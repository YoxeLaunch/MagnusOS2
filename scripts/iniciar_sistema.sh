#!/bin/bash

# Script de inicio para Magnus OS 2 en Linux
# Este script inicia el Backend, Frontend y el Túnel de Cloudflare simultáneamente.

echo "🚀 Iniciando Magnus OS 2..."

# Verificar si cloudflared está instalado
if ! command -v cloudflared &> /dev/null
then
    echo "⚠️  Cloudflared no está instalado o no se encuentra en el PATH."
    echo "💡 Puedes instalarlo con: curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared && chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/"
fi

# Ejecutar el lanzador principal
npm run start:all
