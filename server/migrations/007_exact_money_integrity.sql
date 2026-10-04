-- Migration 007: enforce exact-money coexistence invariants.
-- The application must never run this migration automatically in production.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "DailyTransactions"
        WHERE amount_minor IS NULL
           OR amount::text IN ('NaN', 'Infinity', '-Infinity')
           OR amount_minor IS DISTINCT FROM ROUND((amount * 100)::numeric)::bigint
    ) THEN
        RAISE EXCEPTION 'DailyTransactions exact-money reconciliation failed';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "Transactions"
        WHERE amount_minor IS NULL
           OR amount::text IN ('NaN', 'Infinity', '-Infinity')
           OR amount_minor IS DISTINCT FROM ROUND((amount * 100)::numeric)::bigint
    ) THEN
        RAISE EXCEPTION 'Transactions exact-money reconciliation failed';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "WealthSnapshots"
        WHERE net_worth_minor IS NULL OR assets_minor IS NULL OR liabilities_minor IS NULL
           OR "netWorth"::text IN ('NaN', 'Infinity', '-Infinity')
           OR assets::text IN ('NaN', 'Infinity', '-Infinity')
           OR liabilities::text IN ('NaN', 'Infinity', '-Infinity')
           OR net_worth_minor IS DISTINCT FROM ROUND(("netWorth" * 100)::numeric)::bigint
           OR assets_minor IS DISTINCT FROM ROUND((COALESCE(assets, 0) * 100)::numeric)::bigint
           OR liabilities_minor IS DISTINCT FROM ROUND((COALESCE(liabilities, 0) * 100)::numeric)::bigint
    ) THEN
        RAISE EXCEPTION 'WealthSnapshots exact-money reconciliation failed';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "CurrencyHistories"
        WHERE rate_exact IS NULL
           OR rate::text IN ('NaN', 'Infinity', '-Infinity')
           OR rate_exact IS DISTINCT FROM ROUND(rate::numeric, 6)
    ) THEN
        RAISE EXCEPTION 'CurrencyHistories exact-rate reconciliation failed';
    END IF;
END $$;

ALTER TABLE "DailyTransactions" ALTER COLUMN amount_minor SET NOT NULL;
ALTER TABLE "Transactions" ALTER COLUMN amount_minor SET NOT NULL;
ALTER TABLE "WealthSnapshots" ALTER COLUMN net_worth_minor SET NOT NULL;
ALTER TABLE "WealthSnapshots" ALTER COLUMN assets_minor SET NOT NULL;
ALTER TABLE "WealthSnapshots" ALTER COLUMN liabilities_minor SET NOT NULL;
ALTER TABLE "CurrencyHistories" ALTER COLUMN rate_exact SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM transaction_lines WHERE transaction_id IS NULL) THEN
        RAISE EXCEPTION 'transaction_lines contains orphan rows with null transaction_id';
    END IF;
END $$;
ALTER TABLE transaction_lines ALTER COLUMN transaction_id SET NOT NULL;

ALTER TABLE "DailyTransactions"
    ADD CONSTRAINT daily_transactions_exact_money_consistent
    CHECK (CASE WHEN amount::text IN ('NaN', 'Infinity', '-Infinity') THEN false
                ELSE amount_minor = ROUND((amount * 100)::numeric)::bigint END) NOT VALID;
ALTER TABLE "DailyTransactions" VALIDATE CONSTRAINT daily_transactions_exact_money_consistent;

ALTER TABLE "Transactions"
    ADD CONSTRAINT transactions_exact_money_consistent
    CHECK (CASE WHEN amount::text IN ('NaN', 'Infinity', '-Infinity') THEN false
                ELSE amount_minor = ROUND((amount * 100)::numeric)::bigint END) NOT VALID;
ALTER TABLE "Transactions" VALIDATE CONSTRAINT transactions_exact_money_consistent;

ALTER TABLE "WealthSnapshots"
    ADD CONSTRAINT wealth_snapshots_exact_money_consistent
    CHECK (
        CASE
            WHEN "netWorth"::text IN ('NaN', 'Infinity', '-Infinity')
              OR assets::text IN ('NaN', 'Infinity', '-Infinity')
              OR liabilities::text IN ('NaN', 'Infinity', '-Infinity') THEN false
            ELSE net_worth_minor = ROUND(("netWorth" * 100)::numeric)::bigint
             AND assets_minor = ROUND((COALESCE(assets, 0) * 100)::numeric)::bigint
             AND liabilities_minor = ROUND((COALESCE(liabilities, 0) * 100)::numeric)::bigint
        END
    ) NOT VALID;
ALTER TABLE "WealthSnapshots" VALIDATE CONSTRAINT wealth_snapshots_exact_money_consistent;

ALTER TABLE "CurrencyHistories"
    ADD CONSTRAINT currency_histories_exact_rate_consistent
    CHECK (CASE WHEN rate::text IN ('NaN', 'Infinity', '-Infinity') THEN false
                ELSE rate_exact = ROUND(rate::numeric, 6) END) NOT VALID;
ALTER TABLE "CurrencyHistories" VALIDATE CONSTRAINT currency_histories_exact_rate_consistent;
