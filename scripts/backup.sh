#!/bin/bash
# ========================================
# Magnus-OS2 PostgreSQL Backup Script
# ========================================
# Usage: ./backup.sh
# Cron example: 0 3 * * * /path/to/backup.sh >> /var/log/magnus_backup.log 2>&1

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-magnus_os2_postgres}"
POSTGRES_DB="${POSTGRES_DB:-magnus}"
POSTGRES_USER="${POSTGRES_USER:-magnus}"

# Timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/magnus_${TIMESTAMP}.sql"

echo "========================================="
echo "Magnus-OS2 Backup - ${TIMESTAMP}"
echo "========================================="

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform backup
echo "[1/3] Creating backup..."
docker exec -t "${POSTGRES_CONTAINER}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "${BACKUP_FILE}"

# Compress backup
echo "[2/3] Compressing backup..."
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "      Backup saved: ${BACKUP_FILE}"
echo "      Size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Clean old backups
echo "[3/3] Cleaning old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "magnus_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List current backups
echo ""
echo "Current backups:"
ls -lh "${BACKUP_DIR}"/magnus_*.sql.gz 2>/dev/null || echo "No backups found"

echo ""
echo "Backup completed successfully!"
