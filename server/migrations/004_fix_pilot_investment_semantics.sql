-- Migration 004: Fix Pilot Investment Semantics
-- Corrects sign of pilot investment transactions so that cash outflows are correctly
-- represented as negative amounts on the cash account lines and positive on balancing category lines.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT lt.id as tx_id, tl.account_id
        FROM ledger_transactions lt
        JOIN transaction_lines tl ON tl.transaction_id = lt.id
        WHERE lt.type = 'investment' AND tl.account_id IS NOT NULL AND tl.amount_minor > 0
    ) LOOP
        -- 1. Invert account line (from positive inflow to negative outflow)
        UPDATE transaction_lines
        SET amount_minor = -amount_minor
        WHERE transaction_id = r.tx_id AND account_id = r.account_id;

        -- 2. Invert balancing category line (from negative to positive)
        UPDATE transaction_lines
        SET amount_minor = -amount_minor
        WHERE transaction_id = r.tx_id AND account_id IS NULL;

        -- 3. Reconcile account cached balance with derived line sums
        UPDATE accounts a
        SET current_balance_minor = a.opening_balance_minor + (
            SELECT COALESCE(SUM(tl.amount_minor), 0)
            FROM transaction_lines tl
            WHERE tl.account_id = a.id
        )
        WHERE a.id = r.account_id;
    END LOOP;
END;
$$;
