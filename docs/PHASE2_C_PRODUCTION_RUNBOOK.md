# Phase II-C — Runbook de producción

Este procedimiento es deliberadamente manual. El arranque de MagnusOS2 **no ejecuta migraciones** en producción: solo verifica checksums y que no existan migraciones pendientes.

## Estado esperado antes del despliegue

- `001`–`006` aplicadas y con checksum válido.
- `000_base_schema.sql` pendiente porque producción nació antes del runner.
- `007_exact_money_integrity.sql` pendiente.
- Reconciliación con cero anomalías para dinero legacy/exacto.

## Procedimiento autorizado

1. Detener escritores de la aplicación y confirmar una ventana de mantenimiento.
2. Crear y verificar un backup restaurable de PostgreSQL.
3. Ejecutar `npm run db:status`. Este comando es de solo lectura.
4. Ejecutar `npm run db:drift` y las consultas de reconciliación de `CODEX_REVIEW_PHASE2_C_REMEDIATION.md`. Schema drift debe terminar en cero y todo conteo de anomalías debe ser cero.
5. Registrar el baseline, sin ejecutar su DDL:

   ```bash
   npm run db:baseline
   ```

   El comando solo acepta `000_base_schema.sql`, requiere `--confirm-baseline` y verifica primero tablas críticas y checksums históricos.

6. Ejecutar explícitamente:

   ```bash
   npm run db:migrate
   ```

7. Ejecutar `npm run db:status`, `npm run db:drift` y la reconciliación posterior. Confirmar que 000–007 están aplicadas, todos los checksums son válidos, los constraints están validados y las discrepancias son cero.
8. Iniciar la aplicación y observar errores de constraints/latencia.

## Abort conditions

No continuar si aparece cualquiera de estos casos:

- checksum mismatch o archivo histórico ausente;
- `NaN`, `Infinity`, `-Infinity`, `NULL`, overflow o divergencia legacy/exacta;
- `transaction_lines.transaction_id IS NULL`;
- imposibilidad de obtener el lock dentro de la ventana;
- backup no restaurable.

No se usa `down` destructivo. Ante un fallo antes de commit, la migración revierte. Ante un problema posterior, detener escritores y restaurar el backup siguiendo el procedimiento operativo aprobado.
