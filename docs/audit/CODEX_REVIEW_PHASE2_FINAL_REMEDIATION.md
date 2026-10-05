# MAGNUSOS2 — CODEX FINAL RE-AUDIT: FINAL REMEDIATION

**Date:** 2026-10-04  
**Audited branch/commit:** `phase2/final-remediation` / `170ed511998b30d5729751f97ecd5b8656be0680`  
**Scope:** independent re-audit of the final remediation claims. Production was inspected read-only; no production migration, cutover, or application restart was performed.

## Result

**PHASE II REQUIRES REMEDIATION**

Do **not** recreate/deploy the production Docker application image and do **not** declare Phase II approved yet. The production database remains intact: migrations `001` through `006`, 28 ledger transactions, 56 lines with global line sum zero, and 433 legacy daily rows.

## BLOCKER

### B-01 — Active DailyTransaction update breaks Ledger single source of truth

The frontend still reads and writes `/api/daily-transactions` through `DataContext.tsx`. `updateDailyTransaction` updates only `DailyTransactions`; it neither updates nor replaces the mapped Ledger transaction and does not adjust the cached account balance.

Independent PostgreSQL reproduction on the isolated test database:

| Object | Before | After `PUT /api/daily-transactions/:id` |
|---|---:|---:|
| Legacy daily row | expense, 100.00 / `10000` | income, 999.00 / `99900` |
| Mapped Ledger header | expense | expense |
| Ledger lines | `-10000`, `10000` | unchanged: `-10000`, `10000` |

This directly contradicts the source-of-truth report's statements that DailyTransactions is read-only, frontend mutation has stopped, and mutation endpoints are blocked/adapted. It allows financial reporting, savings fallback, Tracking, and ledger reporting to disagree for the same user action.

Required remediation: either block POST/PUT/DELETE legacy endpoints and migrate the frontend to Ledger APIs, or implement full atomic ledger adaptation for **create, update, and delete**, including mapping integrity, account balance reconciliation, strict authorization, and integration tests for all operations.

## HIGH

### H-01 — Migration runbook is unsafe/inaccurate for the real production state

Production has `001`–`006` recorded and lacks `000_base_schema.sql`. The runner sorts pending migration files, so `npm run db:migrate` will attempt `000_base_schema.sql` before `007`–`010`; the runbook incorrectly says it applies only 007–010 and omits the required explicit baseline command.

Required remediation: provide and test a production-specific, read-only preflight and explicit `db:baseline 000_base_schema.sql --confirm-baseline` procedure, then prove the exact 007–010 upgrade against a restored production-equivalent snapshot. Never let the release command unexpectedly execute the baseline schema dump.

### H-02 — Cutover is not safe enough to run as documented

The production runbook orders `npm run db:cutover:daily`, while the script rejects the normal production `postgres:5432` target. Its host/port guardrail is also bypassable through another hostname/IP. Additionally, `--dry-run` executes `CREATE TABLE IF NOT EXISTS`, so it is not strictly read-only on a schema without mappings.

The cutover selects an arbitrary active account per user/currency (or creates `Efectivo`) rather than proving which account held each historic amount. It also falls back to `Math.round(Number(amount) * 100)`, which reintroduces unsafe floating-point conversion when `amount_minor` is missing or zero.

Required remediation: separate operator authorization from target validation, make dry-run write-free, require an explicit reviewed account mapping, parse only exact decimal strings, and test the real production snapshot in an isolated restored database before any live cutover.

### H-03 — Ledger analytics still has currency aggregation defects

`LedgerAnalyticsService.getNormalizedTimeline({ currency })` does not filter lines/transactions by its `currency` argument. `getEconometricsDataset({ currency: 'DOP' })` can therefore aggregate USD/EUR numeric amounts as DOP in `monthlyData` and category expenses. `getCommandCenterDataset` calls balances without currency and receives a raw sum of currencies, which is not a monetary value.

Required remediation: require a currency filter or an explicit FX conversion basis/date for every aggregate, never sum raw minor units across currencies, and add DOP+USD+EUR regression tests.

### H-04 — Dependency report is factually false and unresolved vulnerabilities remain

Fresh `npm audit --omit=dev --json` reports **39 vulnerabilities: 2 critical, 22 high, 13 moderate, 2 low**. Contrary to the remediation report, direct vulnerable production dependencies include `body-parser`, `dockerode`, `express`, `express-rate-limit`, `figlet`, `multer`, `react-router-dom`, `sequelize`, and `sqlite3`.

JWT authentication does not eliminate parser/protocol denial-of-service vulnerabilities after a WebSocket handshake, and it does not make direct dependencies “zero vulnerable.” Required remediation: correct the report, upgrade or remove directly vulnerable runtime packages where feasible, and document residual risks with exposure and compensating controls.

## MEDIUM

- The mapping table permits a null `ledger_transaction_id` but declares it `UUID REFERENCES`; the cutover script separately creates a schema variant without the FK. Schema must be migration-owned only.
- Cutover references are inconsistent: initial historical anchoring expects `migrated:<hash>`, while adapted creates and new cutover entries use `migrated:daily:<id>`. Mapping is relied on to avoid duplicates, but mapping insertion errors are silently discarded in the API.
- The application production startup calls `assertUpToDate()`; rebuilding the image before the explicit migration sequence will cause startup failure because 000 and 007–010 are pending.
- The documented backup is stored inside the PostgreSQL data volume, not an independently retained host/off-host backup location.

## PASS / independently reproduced evidence

- `npm test`: **57 passed, 0 failed**.
- `npm run test:postgres`: **100 passed, 0 failed** on the isolated PostgreSQL test service.
- `npm run build`: successful; 3,809 modules transformed. It reports a frontend chunk larger than 500 kB.
- Ledger database triggers successfully reject unbalanced, cross-user, and direct mixed-currency transaction lines in the tested paths.
- Health routing, job lease tests, migration fresh bootstrap tests, and the isolated restore drill pass.
- Production read-only inspection: `synchronous_commit = on`; current ledger lines globally sum to zero.

## Approval gates before Docker recreation and GitHub release

1. Close B-01 with tests covering create/update/delete through the actual frontend/API path.
2. Fix and rehearse the migration/baseline/cutover procedure on a restored production-equivalent database, with zero reconciliation discrepancy.
3. Make multi-currency analytics explicit and test it.
4. Correct dependency evidence and address the direct runtime vulnerabilities or formally accept narrowly defined residual risk.
5. Re-run the complete unit, PostgreSQL, build, restore, reconciliation, and Docker smoke suites; then request final re-audit.

**Decision: CHANGES REQUIRED — PHASE II is not approved.**
