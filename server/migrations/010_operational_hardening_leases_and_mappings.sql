-- Migration 010: Operational Hardening Leases and Legacy Daily Transaction Mappings
-- 1. Creates legacy_daily_transaction_mappings for deterministic 1:1 cutover from DailyTransactions to Ledger
-- 2. Creates job_leases table for distributed multi-instance job execution concurrency control

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

-- 1. Table for tracking cutover from legacy DailyTransactions to Ledger
CREATE TABLE IF NOT EXISTS public.legacy_daily_transaction_mappings (
    id SERIAL PRIMARY KEY,
    daily_transaction_id INTEGER NOT NULL UNIQUE,
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    legacy_hash VARCHAR(64) NOT NULL,
    migrated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'migrated', -- 'migrated', 'previously_migrated', 'skipped_zero_amount'
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_legacy_mappings_user_id ON public.legacy_daily_transaction_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_mappings_ledger_id ON public.legacy_daily_transaction_mappings(ledger_transaction_id);

-- 2. Table for distributed job execution leases across multiple application instances
CREATE TABLE IF NOT EXISTS public.job_leases (
    job_name VARCHAR(100) PRIMARY KEY,
    locked_by VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lease_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    execution_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_leases_expires ON public.job_leases(lease_expires_at);
