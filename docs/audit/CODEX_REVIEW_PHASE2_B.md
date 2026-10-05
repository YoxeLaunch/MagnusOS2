# MAGNUSOS2 — CODEX REVIEW PHASE II-B

**Fecha:** 2026-10-04

**Rama candidata:** `phase2/ii-b-final`

**Base limpia:** `8c25cce`, anterior al commit no autorizado de Phase II-C

**Método:** revisión adversarial; resultados declarados por Antigravity no aceptados como evidencia

**Producción:** migración correctiva `006` aplicada con autorización explícita y verificación posterior

## Resultado ejecutivo

La segunda auditoría confirmó que el reporte de Antigravity era incorrecto: sus 40 pruebas no cubrían pasivos con signo contable, duplicación de metas de ahorro, aportes sin ledger, transferencias mayores que `Number.MAX_SAFE_INTEGER`, inferencia de tipo por signos ni la mezcla Wealth/Dashboard con modelos legacy.

Esos defectos fueron corregidos y reproducidos mediante pruebas PostgreSQL nuevas. La implementación actual preserva estas invariantes:

```text
saldo_derivado = opening_balance_minor + SUM(transaction_lines.amount_minor)

pasivo canónico = saldo negativo
patrimonio = activos positivos - ABS(pasivos negativos)

transferencia interna A → B:
SUM(líneas propias por moneda) = 0
income = expense = profit = loss = 0

aporte de ahorro = transferencia ledger única hacia la cuenta vinculada
progreso = saldo de la cuenta vinculada (no saldo + contribución)
```

La remediación financiera fue separada en una rama limpia anterior a Phase II-C y `006_financial_invariants.sql` quedó aplicada en producción. La autorización de `006` no constituye permiso para continuar Phase II-C; ese trabajo permanece aislado en `phase2/ledger-unification`.

## Hallazgos revalidados

| Severidad | Estado | Resultado comprobado |
|---|---|---|
| BLOCKER | PASS EN CÓDIGO | Escrituras, deletes y transferencias hacen aritmética exacta con `BigInt`; no concatenan strings de Sequelize. |
| BLOCKER | PASS EN CÓDIGO | Una transferencia entre cuentas propias se reconoce por sus líneas, no por la etiqueta `type`; cash flow consolidado queda en cero. |
| BLOCKER | PASS EN CÓDIGO | Pago `checking → credit_card` reduce activo y deuda por el mismo importe; el patrimonio no cambia. |
| BLOCKER | PASS EN CÓDIGO | Wealth y KPIs principales de Dashboard dejaron de sumar resultados ledger y legacy. |
| HIGH | PASS EN CÓDIGO | Refunds netean gastos; inversión entre cuentas propias es reasignación neutral. |
| HIGH | PASS EN CÓDIGO | Los filtros de fecha llegan al read model; se cubren límites y meses vacíos. |
| HIGH | PASS EN CÓDIGO | Savings rechaza aportes sin ledger, valida transferencia propia y evita reutilizarla. |
| HIGH | PASS EN CÓDIGO | Una cuenta sólo puede respaldar una meta activa; el progreso se deriva de esa cuenta. |
| HIGH | PASS EN CÓDIGO | `90071992547409.93` se persiste como `9007199254740993` minor units, sin `Number`. |
| HIGH | PASS EN CÓDIGO | CSV, transferencias, cuentas y metas usan decimal string → `BigInt`; los gráficos detectan overflow. |
| HIGH | PASS EN CÓDIGO | Pasivos nuevos son créditos negativos; Accounts distingue deuda de saldo a favor. |
| MEDIUM | PASS EN CÓDIGO | Categorías/payees se aíslan; categorías `system` autorizadas siguen utilizables. |
| MEDIUM | PASS EN CÓDIGO | `transactionCount` cuenta asientos, no días agregados. |
| LOW | PASS EN CÓDIGO | `asOf` deriva saldo histórico; una meta nueva calcula progreso real. |
| BLOCKER | PASS EN PRODUCCIÓN | `006` instaló los índices únicos de Savings y la normalización defensiva de pasivos. |
| PASS | AISLADO | El commit II-C `241ea31` no forma parte de la rama candidata II-B. |

## Transferencias internas y patrimonio

Caso adversarial ejecutado en PostgreSQL real:

```text
Antes:   Banco +500.00, Tarjeta -200.00, Patrimonio +300.00
Mover:   Banco → Tarjeta 100.00
Después: Banco +400.00, Tarjeta -100.00, Patrimonio +300.00
Income = Expense = Net cash flow = 0.00
```

La prueba falla con la fórmula antigua que trataba cualquier saldo de pasivo como deuda absoluta y pasa con la convención canónica corregida.

## Wealth

`LedgerReadService.getBalances()` calcula exactamente una vez `openingBalanceMinor + ledger sum`. `currentBalanceMinor` es cache de reconciliación, no un tercer sumando. `getNetWorth()` usa el saldo derivado y devuelve el desglose de cuentas. Wealth consume ese resultado y ya no agrega `dailyInvestment`, inversiones legacy ni activos físicos no respaldados. Dashboard obtiene patrimonio y flujo del mismo read model. Los activos no registrados en ledger quedan explícitamente excluidos.

## Savings

- El aporte manual sin asiento fue eliminado.
- Crear una meta desde la UI requiere una cuenta vinculada.
- El backend exige una transferencia ledger del mismo usuario hacia esa cuenta.
- Una transferencia sólo puede respaldar un aporte.
- Una cuenta sólo puede respaldar una meta activa.
- `currentAmount` y `progress` se derivan del saldo; la contribución es trazabilidad y no vuelve a sumar dinero.
- Savings rate usa cash flow ledger; `totalGoalContributions` es diagnóstico separado.

## Cash Flow

| Caso | Resultado |
|---|---|
| income / expense | PASS |
| refund parcial | PASS — gasto 100, refund 40 = gasto neto 60 |
| asset → asset | PASS — neutral |
| asset → liability | PASS — neutral en flujo y patrimonio |
| cash → investment propia | PASS — reasignación neutral |
| inversión externa | PASS — salida de inversión |
| empty month | PASS |
| cross-month / límite de mes | PASS |
| entrada externa rotulada `transfer` | PASS — se clasifica por estructura |
| gasto sin `type` | PASS — inferido por signo de categoría |

## BIGINT

Ruta petición → Node → Sequelize → PostgreSQL → JSON verificada:

```text
entrada decimal: 90071992547409.93
minor units:     9007199254740993
origen final:    0
destino final:   9007199254740993
```

Los campos `*Minor` viajan como strings. Cash Flow formatea strings sin `Number`. Recharts sólo recibe valores si los minor units caben en `Number.MAX_SAFE_INTEGER`; fuera del rango Dashboard advierte y oculta la visualización en vez de redondear silenciosamente.

## Multiusuario

- Las lecturas requieren identidad efectiva del JWT.
- Las cuentas de cada línea se validan en API y trigger PostgreSQL.
- Categorías/payees pertenecen al usuario o son `system`.
- Una meta no puede enlazar una cuenta ajena, ni por flujo administrativo.
- Una contribución sólo acepta una transacción del propietario.
- Las pruebas confirman que A no altera métricas de B.

## Evidencia ejecutada

- `npm test`: **51/51 PASS**.
- `npm run test:postgres`: **43/43 PASS** en PostgreSQL 16 real; las 6 pruebas exclusivas de II-C quedaron fuera de esta rama.
- Suite adversarial Codex: **15/15 PASS**.
- `npm run build`: **PASS**, 3,808 módulos.
- `npx tsc --noEmit`: **PASS**.
- Producción antes de aplicar `006`: **0** asientos desbalanceados, **0** duplicados de cuenta/meta, **0** contribuciones duplicadas y **0** pasivos positivos con historia.
- Producción después de `006`: runner idempotente y sin migraciones pendientes, **0** cuentas sin reconciliar y ambos índices parciales únicos presentes.
- Respaldos `0600` fuera del repositorio:
  - `/home/osvaldo/backups/magnus-os2/magnus_pre_phase2c_backup.sql`
  - `/home/osvaldo/backups/magnus-os2/magnus_post_phase2c_2026-10-04.dump`
  - `/home/osvaldo/backups/magnus-os2/magnus_pre_006_2026-10-04.dump`

## Condiciones posteriores a la aprobación

1. Desplegar la remediación II-B mediante el flujo normal de revisión y ejecutar smoke tests de sólo lectura.
2. No iniciar ni continuar Phase II-C hasta nueva autorización; su baseline completa sigue siendo trabajo futuro no autorizado.

**APPROVED**
