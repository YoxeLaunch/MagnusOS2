-- Migration 008: Job Observability & Execution Ledger
-- Tracks execution metadata, performance, health, and sanitized errors for scheduled jobs.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

CREATE TABLE IF NOT EXISTS public.job_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    execution_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'running', 'success', 'failed', 'skipped'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    summary VARCHAR(500),
    error_sanitized TEXT,
    items_processed INTEGER NOT NULL DEFAULT 0,
    failures_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_executions_name_started 
    ON public.job_executions(job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_executions_status 
    ON public.job_executions(status);
