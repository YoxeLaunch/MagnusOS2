-- Migration 001: Ledger Balance Constraint Trigger
-- Enforces double-entry accounting invariant SUM(amount_minor) = 0 and COUNT(*) >= 2 at COMMIT
-- Enforces account ownership consistency (account.user_id = ledger_transaction.user_id)

-- 1. Helper function to check a transaction's lines and ownership
CREATE OR REPLACE FUNCTION check_single_ledger_transaction(p_tx_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sum BIGINT;
    v_count INT;
    v_tx_user_id VARCHAR(255);
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

    SELECT COALESCE(SUM(amount_minor), 0), COUNT(*)
    INTO v_sum, v_count
    FROM transaction_lines
    WHERE transaction_id = p_tx_id;

    IF v_count < 2 THEN
        RAISE EXCEPTION 'Ledger transaction % must have at least 2 lines (found %)', p_tx_id, v_count;
    END IF;

    IF v_sum <> 0 THEN
        RAISE EXCEPTION 'Ledger transaction % is unbalanced: sum of lines is % minor units (must be 0)', p_tx_id, v_sum;
    END IF;

    -- Ensure all account lines belong to the transaction's user
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

-- 2. Trigger function on transaction_lines
CREATE OR REPLACE FUNCTION check_ledger_transaction_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- If transaction_id changed during UPDATE, check the OLD transaction as well
    IF TG_OP = 'UPDATE' AND OLD.transaction_id IS DISTINCT FROM NEW.transaction_id THEN
        PERFORM check_single_ledger_transaction(OLD.transaction_id);
    END IF;

    IF TG_OP = 'DELETE' THEN
        PERFORM check_single_ledger_transaction(OLD.transaction_id);
    ELSE
        PERFORM check_single_ledger_transaction(NEW.transaction_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_ledger_transaction_balance ON transaction_lines;

CREATE CONSTRAINT TRIGGER trg_check_ledger_transaction_balance
AFTER INSERT OR UPDATE OR DELETE ON transaction_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_ledger_transaction_balance();

-- 3. Trigger function on ledger_transactions (prevents committing headers with 0 lines)
CREATE OR REPLACE FUNCTION check_ledger_transaction_header()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM check_single_ledger_transaction(NEW.id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_ledger_transaction_header ON ledger_transactions;

CREATE CONSTRAINT TRIGGER trg_check_ledger_transaction_header
AFTER INSERT OR UPDATE ON ledger_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_ledger_transaction_header();

