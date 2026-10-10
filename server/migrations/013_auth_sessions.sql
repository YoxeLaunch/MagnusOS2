-- Revocable JWT session registry. Existing JWTs without a jti remain valid until
-- their normal expiry, allowing a rolling deployment without forced logout.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id UUID PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by VARCHAR(255),
    user_agent VARCHAR(500),
    ip_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_username_created ON public.auth_sessions(username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON public.auth_sessions(expires_at) WHERE revoked_at IS NULL;
