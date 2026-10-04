-- Migration 001: Ledger Balance Constraint Trigger
-- Enforces double-entry accounting invariant SUM(amount_minor) = 0 and COUNT(*) >= 2 at COMMIT

CREATE OR REPLACE FUNCTION check_ledger_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_tx_id UUID;
    v_sum BIGINT;
    v_count INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_tx_id := OLD.transaction_id;
    ELSE
        v_tx_id := NEW.transaction_id;
    END IF;

    IF v_tx_id IS NOT NULL THEN
        -- Only check if the transaction still exists (to allow cascading delete of ledger_transactions)
        IF EXISTS (SELECT 1 FROM ledger_transactions WHERE id = v_tx_id) THEN
            SELECT COALESCE(SUM(amount_minor), 0), COUNT(*)
            INTO v_sum, v_count
            FROM transaction_lines
            WHERE transaction_id = v_tx_id;

            IF v_count < 2 THEN
                RAISE EXCEPTION 'Ledger transaction % must have at least 2 lines (found %)', v_tx_id, v_count;
            END IF;

            IF v_sum <> 0 THEN
                RAISE EXCEPTION 'Ledger transaction % is unbalanced: sum of lines is % minor units (must be 0)', v_tx_id, v_sum;
            END IF;
        END IF;
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
