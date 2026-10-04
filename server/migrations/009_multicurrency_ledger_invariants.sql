-- Migration 009: Multicurrency Ledger Invariants
-- Enforces:
-- 1. transaction_lines.currency = accounts.currency when account_id IS NOT NULL
-- 2. Single currency per ledger transaction (no mixing currencies in an ordinary transaction)
-- 3. Strict zero-sum per currency (SUM(amount_minor) = 0 for every currency)
-- 4. Strict overall zero-sum
-- 5. Minimum 2 lines per transaction
-- 6. Strict account ownership isolation (a.user_id = tx.user_id)

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

-- 1. Preflight check: verify existing historical rows satisfy the invariants
DO $$
DECLARE
    v_mismatches INT;
    v_multicurrency_txs INT;
    v_unbalanced_currencies INT;
    v_orphans INT;
    v_cross_user INT;
BEGIN
    -- Verify account currency match
    SELECT COUNT(*) INTO v_mismatches
    FROM transaction_lines tl
    JOIN accounts a ON a.id = tl.account_id
    WHERE tl.currency <> a.currency;

    IF v_mismatches > 0 THEN
        RAISE EXCEPTION '[PREFLIGHT FAILED] Found % transaction lines where line currency does not match account currency', v_mismatches;
    END IF;

    -- Verify no transaction mixes currencies
    SELECT COUNT(*) INTO v_multicurrency_txs
    FROM (
        SELECT transaction_id
        FROM transaction_lines
        GROUP BY transaction_id
        HAVING COUNT(DISTINCT currency) > 1
    ) sub;

    IF v_multicurrency_txs > 0 THEN
        RAISE EXCEPTION '[PREFLIGHT FAILED] Found % transactions mixing multiple currencies', v_multicurrency_txs;
    END IF;

    -- Verify per-currency zero balance
    SELECT COUNT(*) INTO v_unbalanced_currencies
    FROM (
        SELECT transaction_id, currency, SUM(amount_minor) AS net_sum
        FROM transaction_lines
        GROUP BY transaction_id, currency
        HAVING SUM(amount_minor) <> 0
    ) sub;

    IF v_unbalanced_currencies > 0 THEN
        RAISE EXCEPTION '[PREFLIGHT FAILED] Found % transaction/currency pairs with non-zero sum', v_unbalanced_currencies;
    END IF;

    -- Verify minimum 2 lines
    SELECT COUNT(*) INTO v_orphans
    FROM (
        SELECT transaction_id
        FROM transaction_lines
        GROUP BY transaction_id
        HAVING COUNT(*) < 2
    ) sub;

    IF v_orphans > 0 THEN
        RAISE EXCEPTION '[PREFLIGHT FAILED] Found % transactions with fewer than 2 lines', v_orphans;
    END IF;

    -- Verify account ownership
    SELECT COUNT(*) INTO v_cross_user
    FROM transaction_lines tl
    JOIN accounts a ON a.id = tl.account_id
    JOIN ledger_transactions lt ON lt.id = tl.transaction_id
    WHERE a.user_id <> lt.user_id;

    IF v_cross_user > 0 THEN
        RAISE EXCEPTION '[PREFLIGHT FAILED] Found % lines with account belonging to a different user', v_cross_user;
    END IF;
END $$;

-- 2. Immediate row-level trigger: transaction_lines.currency = accounts.currency
CREATE OR REPLACE FUNCTION check_transaction_line_account_currency()
RETURNS TRIGGER AS $$
DECLARE
    v_acc_currency VARCHAR(3);
BEGIN
    IF NEW.account_id IS NOT NULL THEN
        SELECT currency INTO v_acc_currency FROM accounts WHERE id = NEW.account_id;
        IF v_acc_currency IS NOT NULL AND NEW.currency <> v_acc_currency THEN
            RAISE EXCEPTION 'Transaction line currency (%) must match account currency (%)', NEW.currency, v_acc_currency;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_transaction_line_account_currency ON transaction_lines;

CREATE TRIGGER trg_check_transaction_line_account_currency
BEFORE INSERT OR UPDATE ON transaction_lines
FOR EACH ROW
EXECUTE FUNCTION check_transaction_line_account_currency();

-- 3. Comprehensive transaction invariant checking function
CREATE OR REPLACE FUNCTION check_single_ledger_transaction(p_tx_id UUID)
RETURNS VOID AS $$
DECLARE
    v_count INT;
    v_distinct_currencies INT;
    v_sum BIGINT;
    v_tx_user_id VARCHAR(255);
    v_unbalanced_currency VARCHAR(3);
    v_unbalanced_sum BIGINT;
    v_mismatch_line_id UUID;
    v_line_curr VARCHAR(3);
    v_acc_curr VARCHAR(3);
    v_invalid_accounts INT;
BEGIN
    IF p_tx_id IS NULL THEN
        RETURN;
    END IF;

    -- Only check if transaction exists (allows cascading delete)
    IF NOT EXISTS (SELECT 1 FROM ledger_transactions WHERE id = p_tx_id) THEN
        RETURN;
    END IF;

    SELECT user_id INTO v_tx_user_id FROM ledger_transactions WHERE id = p_tx_id;

    -- 1. Line count, distinct currencies, and total sum
    SELECT COUNT(*), COUNT(DISTINCT currency), COALESCE(SUM(amount_minor), 0)
    INTO v_count, v_distinct_currencies, v_sum
    FROM transaction_lines
    WHERE transaction_id = p_tx_id;

    IF v_count < 2 THEN
        RAISE EXCEPTION 'Ledger transaction % must have at least 2 lines (found %)', p_tx_id, v_count;
    END IF;

    -- Multicurrency invariant: An ordinary transaction cannot mix currencies
    IF v_distinct_currencies > 1 THEN
        RAISE EXCEPTION 'Ledger transaction % mixes multiple currencies (% distinct). Cross-currency operations require linked single-currency transactions with an explicit clearing bridge.', p_tx_id, v_distinct_currencies;
    END IF;

    -- 2. Verify sum per currency = 0
    SELECT currency, SUM(amount_minor)
    INTO v_unbalanced_currency, v_unbalanced_sum
    FROM transaction_lines
    WHERE transaction_id = p_tx_id
    GROUP BY currency
    HAVING SUM(amount_minor) <> 0
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Ledger transaction % is unbalanced for currency %: sum is % minor units (must be 0)', p_tx_id, v_unbalanced_currency, v_unbalanced_sum;
    END IF;

    -- 3. Verify total sum = 0
    IF v_sum <> 0 THEN
        RAISE EXCEPTION 'Ledger transaction % is unbalanced: sum of lines is % minor units (must be 0)', p_tx_id, v_sum;
    END IF;

    -- 4. Verify line currency matches account currency
    SELECT tl.id, tl.currency, a.currency
    INTO v_mismatch_line_id, v_line_curr, v_acc_curr
    FROM transaction_lines tl
    JOIN accounts a ON a.id = tl.account_id
    WHERE tl.transaction_id = p_tx_id
      AND tl.currency <> a.currency
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Transaction line % currency (%) does not match linked account currency (%)', v_mismatch_line_id, v_line_curr, v_acc_curr;
    END IF;

    -- 5. Verify account ownership
    IF v_tx_user_id IS NOT NULL THEN
        SELECT COUNT(*)
        INTO v_invalid_accounts
        FROM transaction_lines tl
        JOIN accounts a ON a.id = tl.account_id
        WHERE tl.transaction_id = p_tx_id
          AND a.user_id <> v_tx_user_id;

        IF v_invalid_accounts > 0 THEN
            RAISE EXCEPTION 'Ledger transaction % has lines belonging to accounts of a different user', p_tx_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
