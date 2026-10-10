-- Harden the administrative audit ledger against application-level mutation.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

CREATE OR REPLACE FUNCTION public.prevent_admin_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'admin_audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_audit_mutation ON public.admin_audit_events;
CREATE TRIGGER trg_prevent_admin_audit_mutation
BEFORE UPDATE OR DELETE ON public.admin_audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_audit_mutation();

-- Providence deployment documents magnus_app as the least-privilege runtime
-- role. The conditional block preserves portability for non-Providence DBs.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'magnus_app') THEN
        REVOKE UPDATE, DELETE, TRUNCATE ON public.admin_audit_events FROM magnus_app;
        GRANT SELECT, INSERT ON public.admin_audit_events TO magnus_app;
    END IF;
END;
$$;
