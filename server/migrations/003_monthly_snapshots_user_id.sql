-- Migration 003: Monthly Snapshots Multi-User Support
-- Adds user_id to monthly_snapshots and replaces period unique constraint with (period, user_id)

DO $$
BEGIN
    IF to_regclass('public.monthly_snapshots') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'monthly_snapshots' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE monthly_snapshots ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'soberano';
            RAISE NOTICE 'Added user_id column to monthly_snapshots';
        END IF;

        -- Drop single period unique constraint if present
        IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.monthly_snapshots'::regclass AND conname = 'monthly_snapshots_period_key'
        ) THEN
            ALTER TABLE monthly_snapshots DROP CONSTRAINT monthly_snapshots_period_key;
            RAISE NOTICE 'Dropped monthly_snapshots_period_key';
        END IF;

        -- Add composite unique constraint on (period, user_id)
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.monthly_snapshots'::regclass AND conname = 'monthly_snapshots_period_user_id_key'
        ) THEN
            ALTER TABLE monthly_snapshots ADD CONSTRAINT monthly_snapshots_period_user_id_key UNIQUE (period, user_id);
            RAISE NOTICE 'Added unique constraint on (period, user_id)';
        END IF;
    END IF;
END $$;
