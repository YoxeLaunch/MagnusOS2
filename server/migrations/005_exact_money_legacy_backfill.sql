-- Migration 005: Exact Money Legacy Backfill
-- Adds exact BIGINT amount_minor and NUMERIC(12,6) rate columns to legacy models
-- Preserves old float/double precision columns for backward compatibility

DO $$
BEGIN
    -- 1. DailyTransactions: amount_minor BIGINT
    IF to_regclass('public."DailyTransactions"') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'DailyTransactions' AND column_name = 'amount_minor'
        ) THEN
            ALTER TABLE "DailyTransactions" ADD COLUMN amount_minor BIGINT;
            RAISE NOTICE 'Added amount_minor to DailyTransactions';
        END IF;

        UPDATE "DailyTransactions"
        SET amount_minor = ROUND((amount * 100)::numeric)::bigint
        WHERE amount_minor IS NULL;
    END IF;

    -- 2. Transactions: amount_minor BIGINT
    IF to_regclass('public."Transactions"') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'Transactions' AND column_name = 'amount_minor'
        ) THEN
            ALTER TABLE "Transactions" ADD COLUMN amount_minor BIGINT;
            RAISE NOTICE 'Added amount_minor to Transactions';
        END IF;

        UPDATE "Transactions"
        SET amount_minor = ROUND((amount * 100)::numeric)::bigint
        WHERE amount_minor IS NULL;
    END IF;

    -- 3. WealthSnapshots: net_worth_minor, assets_minor, liabilities_minor BIGINT
    IF to_regclass('public."WealthSnapshots"') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'WealthSnapshots' AND column_name = 'net_worth_minor'
        ) THEN
            ALTER TABLE "WealthSnapshots" ADD COLUMN net_worth_minor BIGINT;
            RAISE NOTICE 'Added net_worth_minor to WealthSnapshots';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'WealthSnapshots' AND column_name = 'assets_minor'
        ) THEN
            ALTER TABLE "WealthSnapshots" ADD COLUMN assets_minor BIGINT;
            RAISE NOTICE 'Added assets_minor to WealthSnapshots';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'WealthSnapshots' AND column_name = 'liabilities_minor'
        ) THEN
            ALTER TABLE "WealthSnapshots" ADD COLUMN liabilities_minor BIGINT;
            RAISE NOTICE 'Added liabilities_minor to WealthSnapshots';
        END IF;

        UPDATE "WealthSnapshots"
        SET net_worth_minor = ROUND(("netWorth" * 100)::numeric)::bigint,
            assets_minor = ROUND((COALESCE(assets, 0) * 100)::numeric)::bigint,
            liabilities_minor = ROUND((COALESCE(liabilities, 0) * 100)::numeric)::bigint
        WHERE net_worth_minor IS NULL;
    END IF;

    -- 4. CurrencyHistories: rate_exact NUMERIC(12, 6)
    IF to_regclass('public."CurrencyHistories"') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'CurrencyHistories' AND column_name = 'rate_exact'
        ) THEN
            ALTER TABLE "CurrencyHistories" ADD COLUMN rate_exact NUMERIC(12, 6);
            RAISE NOTICE 'Added rate_exact to CurrencyHistories';
        END IF;

        UPDATE "CurrencyHistories"
        SET rate_exact = ROUND(rate::numeric, 6)
        WHERE rate_exact IS NULL;
    END IF;

    -- 5. fx_rate_observations: buy_exact, sell_exact, mid_exact, spread_exact NUMERIC(12, 6)
    IF to_regclass('public.fx_rate_observations') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'fx_rate_observations' AND column_name = 'buy_exact'
        ) THEN
            ALTER TABLE fx_rate_observations ADD COLUMN buy_exact NUMERIC(12, 6);
            ALTER TABLE fx_rate_observations ADD COLUMN sell_exact NUMERIC(12, 6);
            ALTER TABLE fx_rate_observations ADD COLUMN mid_exact NUMERIC(12, 6);
            ALTER TABLE fx_rate_observations ADD COLUMN spread_exact NUMERIC(12, 6);
            RAISE NOTICE 'Added exact rate columns to fx_rate_observations';
        END IF;

        UPDATE fx_rate_observations
        SET buy_exact = ROUND(buy::numeric, 6),
            sell_exact = ROUND(sell::numeric, 6),
            mid_exact = ROUND(mid::numeric, 6),
            spread_exact = ROUND(spread::numeric, 6)
        WHERE buy_exact IS NULL AND buy IS NOT NULL;
    END IF;
END $$;
