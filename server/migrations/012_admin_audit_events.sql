-- Append-oriented administrative event ledger. Restrict UPDATE/DELETE grants for
-- the application role in the production database provisioning policy.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

CREATE TABLE IF NOT EXISTS public.admin_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_username VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    outcome VARCHAR(20) NOT NULL,
    correlation_id UUID NOT NULL,
    reason VARCHAR(500),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_occurred_at ON public.admin_audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_events_actor ON public.admin_audit_events(actor_username, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_events_action ON public.admin_audit_events(action, occurred_at DESC);
