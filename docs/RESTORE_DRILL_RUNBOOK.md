# Restore drill aislado

Este procedimiento prueba una restauración sin tocar `magnus_postgres`, el volumen productivo ni datos financieros activos.

## Precondiciones

- Un backup PostgreSQL SQL o SQL comprimido con gzip.
- El perfil Docker `test` levantado localmente; el único destino aceptado es `127.0.0.1:5433` por defecto.
- No usar el puerto `5432`, el host `postgres`, ni credenciales productivas.

## Ejecución

```bash
docker compose --profile test up -d postgres_test
BACKUP_PATH=/ruta/al/magnus_YYYY-MM-DD_HH-MM-SS.sql.gz npm run db:restore:drill
docker compose --profile test stop postgres_test
docker compose --profile test rm -f postgres_test
```

El script crea y elimina exclusivamente `magnus_restore_drill` dentro del PostgreSQL de pruebas. Calcula SHA-256 del archivo, restaura, aplica las migraciones, revisa drift y reconciliación financiera, y luego borra la base temporal.

No usar `docker compose down`: ese comando detiene también servicios del mismo proyecto que no pertenecen al perfil de prueba.

## Evidencia requerida

Conservar la salida JSON del comando, incluyendo SHA-256, RTO, estado `SUCCESS`, checksums de migraciones, drift y reconciliación. Una verificación gzip no sustituye este procedimiento.

## Prohibiciones

- No ejecutar `scripts/restore.sh` contra producción como prueba.
- No reutilizar el nombre del contenedor o puerto productivo.
- No marcar un backup como recuperable sin resultado `SUCCESS` de este drill.
