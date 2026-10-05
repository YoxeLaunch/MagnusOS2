-- Migration 006: Financial invariants discovered during Codex Phase II-B recovery.
-- This migration is intentionally forward-only and must be applied explicitly.

DO $$
BEGIN
    -- Canonical convention: liability opening balances are credits (negative).
    -- Accounts without history can be normalized mechanically.
    UPDATE accounts a
    SET opening_balance_minor = -opening_balance_minor,
        current_balance_minor = -current_balance_minor
    WHERE a.type IN ('credit_card', 'loan')
      AND a.opening_balance_minor > 0
      AND NOT EXISTS (SELECT 1 FROM transaction_lines tl WHERE tl.account_id = a.id);

    -- Historical positive-liability accounts are ambiguous and require a reviewed data migration.
    IF EXISTS (
        SELECT 1
        FROM accounts a
        WHERE a.type IN ('credit_card', 'loan')
          AND a.opening_balance_minor > 0
          AND EXISTS (SELECT 1 FROM transaction_lines tl WHERE tl.account_id = a.id)
    ) THEN
        RAISE EXCEPTION 'Positive liability accounts with ledger history require manual sign normalization';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_savings_contributions_transaction
ON savings_contributions(transaction_id)
WHERE transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_savings_goal_linked_account
ON savings_goals(linked_account_id)
WHERE linked_account_id IS NOT NULL AND is_active = true;
