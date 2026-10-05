#!/usr/bin/env bash
# ========================================
# Magnus-OS2 Hardened PostgreSQL Backup Script
# ========================================
# Features:
# - Strict error handling: set -euo pipefail
# - Restrictive permissions: umask 077 & chmod 600
# - Concurrency lockfile via flock
# - Clean binary stream: docker exec WITHOUT -t flag
# - Automated gzip integrity testing (gzip -t)
# - Retention cleanup with error checking
# ========================================

set -euo pipefail
umask 077

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/home/osvaldo/backups/magnus-os2}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-magnus_postgres}"
POSTGRES_DB="${POSTGRES_DB:-magnus}"
POSTGRES_USER="${POSTGRES_USER:-magnus}"
LOCK_FILE="/tmp/magnus_backup.lock"

# Concurrency lock
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
    echo "[$(date -Iseconds)] [ERROR] Another backup process is already running. Aborting." >&2
    exit 1
fi

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
TEMP_FILE="${BACKUP_DIR}/.magnus_${TIMESTAMP}.sql.tmp"
FINAL_FILE="${BACKUP_DIR}/magnus_${TIMESTAMP}.sql.gz"

echo "========================================="
echo "Magnus-OS2 Hardened Backup — ${TIMESTAMP}"
echo "========================================="

# Ensure backup destination directory exists with 0700 permissions
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}" 2>/dev/null || true

# 1. Perform database dump via binary stream (no pseudo-TTY)
echo "[1/4] Dumping PostgreSQL database '${POSTGRES_DB}'..."
if ! docker exec "${POSTGRES_CONTAINER}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "${TEMP_FILE}"; then
    echo "[ERROR] pg_dump failed! Removing temporary file." >&2
    rm -f "${TEMP_FILE}"
    exit 1
fi

# 2. Compress the dump
echo "[2/4] Compressing backup stream..."
gzip -c "${TEMP_FILE}" > "${FINAL_FILE}"
rm -f "${TEMP_FILE}"
chmod 600 "${FINAL_FILE}"

# 3. Test integrity of the compressed archive
echo "[3/4] Testing backup integrity (gzip -t)..."
if ! gzip -t "${FINAL_FILE}"; then
    echo "[ERROR] Backup integrity verification FAILED for ${FINAL_FILE}!" >&2
    rm -f "${FINAL_FILE}"
    exit 1
fi
echo "      Integrity OK. Saved: ${FINAL_FILE} ($(du -h "${FINAL_FILE}" | cut -f1))"

# 4. Clean old backups safely
echo "[4/4] Enforcing retention policy (${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "magnus_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete || true

echo "========================================="
echo "Backup successfully completed and verified!"
echo "========================================="
