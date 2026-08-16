#!/bin/bash
# ========================================
# Magnus-OS2 PostgreSQL Restore Script
# ========================================
# Usage: ./restore.sh [/path/to/backup.sql.gz]
# If no file is passed, lists available backups for selection.

set -e

BACKUP_DIR="${BACKUP_DIR:-/home/osvaldo/backups/magnus-os2}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-magnus_postgres}"
POSTGRES_DB="${POSTGRES_DB:-magnus}"
POSTGRES_USER="${POSTGRES_USER:-magnus}"

echo "========================================="
echo "Magnus-OS2 Backup Restoration"
echo "========================================="

FILE_TO_RESTORE="$1"

if [ -z "${FILE_TO_RESTORE}" ]; then
    echo "Buscando respaldos disponibles en ${BACKUP_DIR}..."
    echo ""
    
    if [ ! -d "${BACKUP_DIR}" ]; then
        echo "Error: El directorio ${BACKUP_DIR} no existe."
        exit 1
    fi

    BACKUPS=($(ls -t "${BACKUP_DIR}"/magnus_*.sql.gz 2>/dev/null || true))

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo "No se encontraron archivos de respaldo (.sql.gz) en ${BACKUP_DIR}."
        exit 1
    fi

    echo "Selecciona el respaldo que deseas restaurar:"
    select FILE_TO_RESTORE in "${BACKUPS[@]}"; do
        if [ -n "${FILE_TO_RESTORE}" ]; then
            break
        else
            echo "Opción inválida. Elige un número de la lista."
        fi
    done
fi

if [ ! -f "${FILE_TO_RESTORE}" ]; then
    echo "Error: El archivo '${FILE_TO_RESTORE}' no existe."
    exit 1
fi

echo ""
echo "--------------------------------------------------------"
echo "ADVERTENCIA: Vas a restaurar la base de datos:"
echo "  - Archivo: ${FILE_TO_RESTORE}"
echo "  - Contenedor objetivo: ${POSTGRES_CONTAINER}"
echo "  - Base de Datos objetivo: ${POSTGRES_DB}"
echo "--------------------------------------------------------"
echo "¡ESTA OPERACIÓN SOBREESCRIBIRÁ LOS DATOS ACTUALES DE LA BASE DE DATOS!"
echo ""
read -p "¿Estás seguro de continuar? (escribe 'RESTABLECER' para confirmar): " CONFIRMATION

if [ "${CONFIRMATION}" != "RESTABLECER" ]; then
    echo "Restauración cancelada."
    exit 0
fi

echo ""
echo "[1/2] Verificando contenedor PostgreSQL..."
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo "Error: El contenedor '${POSTGRES_CONTAINER}' no está en ejecución."
    exit 1
fi

echo "[2/2] Aplicando respaldo en ${POSTGRES_DB}..."
gunzip -c "${FILE_TO_RESTORE}" | docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

echo ""
echo "¡Restauración completada con éxito!"
