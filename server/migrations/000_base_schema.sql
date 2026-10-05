--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_Messages_type; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Messages_type') THEN
        CREATE TYPE public."enum_Messages_type" AS ENUM (
    'public',
    'private',
    'system'
);
    END IF;
END $$;


--
-- Name: enum_SystemUpdates_type; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_SystemUpdates_type') THEN
        CREATE TYPE public."enum_SystemUpdates_type" AS ENUM (
    'feature',
    'bugfix',
    'announcement',
    'improvement'
);
    END IF;
END $$;


--
-- Name: enum_accounts_type; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_accounts_type') THEN
        CREATE TYPE public.enum_accounts_type AS ENUM (
    'cash',
    'checking',
    'savings',
    'credit_card',
    'investment',
    'loan'
);
    END IF;
END $$;


--
-- Name: enum_categories_type; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_categories_type') THEN
        CREATE TYPE public.enum_categories_type AS ENUM (
    'income',
    'expense'
);
    END IF;
END $$;


--
-- Name: enum_financial_anomalies_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_financial_anomalies_status') THEN
        CREATE TYPE public.enum_financial_anomalies_status AS ENUM (
    'pending',
    'justified'
);
    END IF;
END $$;


--
-- Name: enum_ledger_transactions_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ledger_transactions_status') THEN
        CREATE TYPE public.enum_ledger_transactions_status AS ENUM (
    'pending',
    'cleared',
    'reconciled'
);
    END IF;
END $$;


--
-- Name: enum_ledger_transactions_type; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ledger_transactions_type') THEN
        CREATE TYPE public.enum_ledger_transactions_type AS ENUM (
    'income',
    'expense',
    'transfer',
    'investment'
);
    END IF;
END $$;


--
-- Name: enum_magnus_events_severity; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_magnus_events_severity') THEN
        CREATE TYPE public.enum_magnus_events_severity AS ENUM (
    'INFO',
    'WATCH',
    'IMPORTANT',
    'CRITICAL'
);
    END IF;
END $$;


--
-- Name: check_ledger_transaction_balance(); Type: FUNCTION; Schema: public; Owner: -
--

-- [001] check_ledger_transaction_balance


--
-- Name: check_ledger_transaction_header(); Type: FUNCTION; Schema: public; Owner: -
--

-- [001] check_ledger_transaction_header


--
-- Name: check_single_ledger_transaction(uuid); Type: FUNCTION; Schema: public; Owner: -
--

-- [001] check_single_ledger_transaction


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: CurrencyHistories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."CurrencyHistories" (
    id integer NOT NULL,
    date date NOT NULL,
    code character varying(255) NOT NULL,
    rate double precision NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: CurrencyHistories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public."CurrencyHistories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CurrencyHistories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CurrencyHistories_id_seq" OWNED BY public."CurrencyHistories".id;


--
-- Name: CurriculumModules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."CurriculumModules" (
    id character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    "order" integer DEFAULT 0,
    mentor character varying(255),
    month character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: DailyTransactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."DailyTransactions" (
    id integer NOT NULL,
    "userId" character varying(255),
    date date NOT NULL,
    amount double precision NOT NULL,
    description character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    category character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: DailyTransactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public."DailyTransactions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DailyTransactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DailyTransactions_id_seq" OWNED BY public."DailyTransactions".id;


--
-- Name: Mentors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."Mentors" (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(255),
    image character varying(255),
    quotes text,
    "startDate" timestamp with time zone,
    "endDate" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."Messages" (
    id uuid NOT NULL,
    text text NOT NULL,
    type public."enum_Messages_type" DEFAULT 'public'::public."enum_Messages_type",
    "fromUsername" character varying(255) NOT NULL,
    "toUsername" character varying(255),
    read boolean DEFAULT false,
    "replyTo" text,
    "createdAt" timestamp with time zone
);


--
-- Name: Missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."Missions" (
    id uuid NOT NULL,
    text character varying(255) NOT NULL,
    week integer NOT NULL,
    "isCompleted" boolean DEFAULT false,
    "moduleId" character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."Publications" (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    "coverImage" character varying(255),
    attachments json DEFAULT '[]'::json,
    author character varying(255) NOT NULL,
    "isPublished" boolean DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: SystemUpdates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."SystemUpdates" (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    type public."enum_SystemUpdates_type" DEFAULT 'feature'::public."enum_SystemUpdates_type",
    date date,
    "isPublished" boolean DEFAULT true,
    version character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."Transactions" (
    id character varying(255) NOT NULL,
    "userId" character varying(255),
    name character varying(255) NOT NULL,
    amount double precision NOT NULL,
    frequency character varying(255) NOT NULL,
    category character varying(255),
    currency character varying(255) DEFAULT 'DOP'::character varying NOT NULL,
    date date NOT NULL,
    type character varying(255) NOT NULL,
    deductions json,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "validFrom" date,
    "validTo" date,
    "conceptId" character varying
);


--
-- Name: UserCalendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."UserCalendars" (
    id integer NOT NULL,
    "userId" character varying(255) NOT NULL,
    date character varying(255) NOT NULL,
    value character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: UserCalendars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public."UserCalendars_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: UserCalendars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UserCalendars_id_seq" OWNED BY public."UserCalendars".id;


--
-- Name: UserChecklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."UserChecklists" (
    id integer NOT NULL,
    "userId" character varying(255) NOT NULL,
    text character varying(255) NOT NULL,
    completed boolean DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: UserChecklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public."UserChecklists_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: UserChecklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UserChecklists_id_seq" OWNED BY public."UserChecklists".id;


--
-- Name: Users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."Users" (
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    name character varying(255),
    role character varying(255) DEFAULT 'user'::character varying,
    tags_old text,
    preferences_old text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    tags jsonb,
    preferences jsonb
);


--
-- Name: WealthSnapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public."WealthSnapshots" (
    id integer NOT NULL,
    "userId" character varying(255),
    date date NOT NULL,
    "netWorth" double precision NOT NULL,
    currency character varying(255) DEFAULT 'DOP'::character varying NOT NULL,
    assets double precision,
    liabilities double precision,
    breakdown json,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: WealthSnapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public."WealthSnapshots_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: WealthSnapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."WealthSnapshots_id_seq" OWNED BY public."WealthSnapshots".id;


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.accounts (
    id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    type public.enum_accounts_type DEFAULT 'checking'::public.enum_accounts_type NOT NULL,
    currency character varying(3) DEFAULT 'DOP'::character varying NOT NULL,
    institution character varying(255),
    opening_balance_minor bigint DEFAULT 0 NOT NULL,
    current_balance_minor bigint DEFAULT 0 NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.app_settings (
    key character varying(255) NOT NULL,
    value text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    "group" character varying(255),
    type public.enum_categories_type DEFAULT 'expense'::public.enum_categories_type NOT NULL,
    icon character varying(255),
    color character varying(7),
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: financial_anomalies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.financial_anomalies (
    id uuid NOT NULL,
    user_id character varying(255),
    date date NOT NULL,
    category character varying(255) NOT NULL,
    amount_actual double precision NOT NULL,
    amount_expected double precision NOT NULL,
    residual double precision NOT NULL,
    z_score double precision NOT NULL,
    description text,
    status public.enum_financial_anomalies_status DEFAULT 'pending'::public.enum_financial_anomalies_status NOT NULL,
    justification text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: fuel_catalogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fuel_catalogs (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    short_name character varying(50) NOT NULL,
    category character varying(30) DEFAULT 'PRIMARY'::character varying NOT NULL,
    unit character varying(20) DEFAULT 'RD$/gal'::character varying NOT NULL,
    description text,
    priority_order integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: fuel_policy_weeks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fuel_policy_weeks (
    id character varying(60) NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    published_at timestamp with time zone,
    total_subsidy_dop double precision,
    wti_reference double precision,
    brent_reference double precision,
    usd_dop_reference double precision,
    government_notes text,
    source character varying(60) DEFAULT 'MICM / Presidencia'::character varying NOT NULL,
    source_bulletin_url character varying(255),
    metadata json,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: fuel_price_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fuel_price_observations (
    id integer NOT NULL,
    fuel_id character varying(50),
    price_dop double precision NOT NULL,
    unit character varying(20) DEFAULT 'RD$/gal'::character varying NOT NULL,
    previous_price_dop double precision,
    change_dop double precision,
    change_percent double precision,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    published_at timestamp with time zone,
    observed_at timestamp with time zone NOT NULL,
    source character varying(50) DEFAULT 'MICM'::character varying NOT NULL,
    source_url character varying(255),
    subsidy_per_unit double precision,
    import_parity_price double precision,
    tax_ley_112_00 double precision,
    tax_ley_495_06 double precision,
    distribution_margin double precision,
    retail_margin double precision,
    transport_fee double precision,
    exchange_rate_reference double precision,
    metadata json,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: fuel_price_observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.fuel_price_observations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fuel_price_observations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fuel_price_observations_id_seq OWNED BY public.fuel_price_observations.id;


--
-- Name: fuel_source_healths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fuel_source_healths (
    id integer NOT NULL,
    source character varying(50) DEFAULT 'MICM'::character varying NOT NULL,
    request_type character varying(50) DEFAULT 'WEEKLY_BULLETIN'::character varying NOT NULL,
    success boolean NOT NULL,
    http_status integer,
    latency_ms integer DEFAULT 0 NOT NULL,
    records_received integer DEFAULT 0 NOT NULL,
    error_type character varying(255),
    "timestamp" timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: fuel_source_healths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.fuel_source_healths_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fuel_source_healths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fuel_source_healths_id_seq OWNED BY public.fuel_source_healths.id;


--
-- Name: fx_provider_healths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fx_provider_healths (
    id integer NOT NULL,
    provider character varying(50) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    success boolean NOT NULL,
    http_status integer,
    latency_ms integer DEFAULT 0 NOT NULL,
    records_received integer DEFAULT 0 NOT NULL,
    error_type character varying(255),
    retry_count integer DEFAULT 0 NOT NULL,
    circuit_state character varying(30) DEFAULT 'CLOSED'::character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: fx_provider_healths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.fx_provider_healths_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fx_provider_healths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fx_provider_healths_id_seq OWNED BY public.fx_provider_healths.id;


--
-- Name: fx_rate_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fx_rate_observations (
    id integer NOT NULL,
    observed_at timestamp with time zone NOT NULL,
    provider character varying(50) NOT NULL,
    institution_id character varying(50) NOT NULL,
    institution_name character varying(100) NOT NULL,
    rate_type character varying(30) DEFAULT 'RETAIL_BANK'::character varying NOT NULL,
    base_currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    quote_currency character varying(10) DEFAULT 'DOP'::character varying NOT NULL,
    buy double precision,
    sell double precision,
    mid double precision,
    spread double precision,
    confidence double precision DEFAULT '1'::double precision NOT NULL,
    validation_status character varying(30) DEFAULT 'VERIFIED'::character varying NOT NULL,
    provider_updated_at timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: fx_rate_observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.fx_rate_observations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fx_rate_observations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fx_rate_observations_id_seq OWNED BY public.fx_rate_observations.id;


--
-- Name: ledger_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    date date NOT NULL,
    payee_id uuid,
    payee_name character varying(255),
    memo text,
    status public.enum_ledger_transactions_status DEFAULT 'pending'::public.enum_ledger_transactions_status NOT NULL,
    type public.enum_ledger_transactions_type DEFAULT 'expense'::public.enum_ledger_transactions_type NOT NULL,
    reference character varying(255),
    recurring_template_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: macro_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.macro_indicators (
    id character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    short_name character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    frequency character varying(30) NOT NULL,
    unit character varying(30) NOT NULL,
    source character varying(100) DEFAULT 'BCRD'::character varying NOT NULL,
    source_url character varying(255),
    description text,
    magnus_interpretation text,
    preferred_chart_type character varying(20) DEFAULT 'line'::character varying NOT NULL,
    priority_order integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: macro_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.macro_observations (
    id integer NOT NULL,
    indicator_id character varying(50) NOT NULL,
    reference_period character varying(50) NOT NULL,
    value double precision NOT NULL,
    unit character varying(30) NOT NULL,
    frequency character varying(30) DEFAULT 'MONTHLY'::character varying NOT NULL,
    published_at timestamp with time zone,
    observed_at timestamp with time zone NOT NULL,
    source character varying(100) DEFAULT 'BCRD'::character varying NOT NULL,
    source_url character varying(255),
    revision integer DEFAULT 1 NOT NULL,
    original_value double precision,
    previous_value double precision,
    change_absolute double precision,
    change_percent double precision,
    is_derived boolean DEFAULT false NOT NULL,
    metadata json,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: macro_observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.macro_observations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: macro_observations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.macro_observations_id_seq OWNED BY public.macro_observations.id;


--
-- Name: macro_source_healths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.macro_source_healths (
    id integer NOT NULL,
    source character varying(50) DEFAULT 'BCRD'::character varying NOT NULL,
    indicator_id character varying(50),
    success boolean NOT NULL,
    http_status integer,
    latency_ms integer DEFAULT 0 NOT NULL,
    records_received integer DEFAULT 0 NOT NULL,
    error_type character varying(255),
    "timestamp" timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: macro_source_healths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.macro_source_healths_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: macro_source_healths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.macro_source_healths_id_seq OWNED BY public.macro_source_healths.id;


--
-- Name: magnus_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.magnus_events (
    id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    domain character varying(30) DEFAULT 'MACRO_RD'::character varying NOT NULL,
    indicator_id character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    severity character varying(20) DEFAULT 'INFO'::character varying NOT NULL,
    reference_period character varying(50),
    value_before double precision,
    value_after double precision NOT NULL,
    delta double precision,
    unit character varying(30),
    idempotency_key character varying(150) NOT NULL,
    metadata json,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: magnus_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.magnus_notifications (
    id uuid NOT NULL,
    event_id uuid,
    user_id character varying(50),
    title character varying(200) NOT NULL,
    message text NOT NULL,
    severity character varying(20) DEFAULT 'INFO'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    link_url character varying(255) DEFAULT '/finanza/mercado'::character varying,
    metadata json,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: monthly_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.monthly_snapshots (
    id integer NOT NULL,
    period date NOT NULL,
    computed_metrics jsonb,
    gemini_narrative text,
    gemini_alerts jsonb,
    gemini_recommendations jsonb,
    tokens_used integer,
    user_id character varying(255) DEFAULT 'soberano'::character varying NOT NULL,
    created_at timestamp with time zone NOT NULL
    );


--
-- Name: monthly_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.monthly_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monthly_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monthly_snapshots_id_seq OWNED BY public.monthly_snapshots.id;


--
-- Name: payees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payees (
    id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    normalized_name character varying(255) NOT NULL,
    default_category_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: savings_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.savings_contributions (
    id uuid NOT NULL,
    goal_id uuid,
    transaction_id uuid,
    amount_minor bigint NOT NULL,
    date date NOT NULL,
    notes character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: savings_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.savings_goals (
    id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    target_amount_minor bigint NOT NULL,
    current_amount_minor bigint DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'DOP'::character varying NOT NULL,
    target_date date,
    linked_account_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    icon character varying(255),
    color character varying(7),
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telegram_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.telegram_links (
    id integer NOT NULL,
    "chatId" character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    "linkedAt" timestamp with time zone
);


--
-- Name: telegram_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.telegram_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telegram_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telegram_links_id_seq OWNED BY public.telegram_links.id;


--
-- Name: transaction_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.transaction_lines (
    id uuid NOT NULL,
    transaction_id uuid,
    account_id uuid,
    category_id uuid,
    amount_minor bigint NOT NULL,
    currency character varying(3) DEFAULT 'DOP'::character varying NOT NULL,
    fx_rate numeric(12,6),
    memo character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: CurrencyHistories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CurrencyHistories" ALTER COLUMN id SET DEFAULT nextval('public."CurrencyHistories_id_seq"'::regclass);


--
-- Name: DailyTransactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyTransactions" ALTER COLUMN id SET DEFAULT nextval('public."DailyTransactions_id_seq"'::regclass);


--
-- Name: UserCalendars id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserCalendars" ALTER COLUMN id SET DEFAULT nextval('public."UserCalendars_id_seq"'::regclass);


--
-- Name: UserChecklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserChecklists" ALTER COLUMN id SET DEFAULT nextval('public."UserChecklists_id_seq"'::regclass);


--
-- Name: WealthSnapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WealthSnapshots" ALTER COLUMN id SET DEFAULT nextval('public."WealthSnapshots_id_seq"'::regclass);


--
-- Name: fuel_price_observations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_price_observations ALTER COLUMN id SET DEFAULT nextval('public.fuel_price_observations_id_seq'::regclass);


--
-- Name: fuel_source_healths id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_source_healths ALTER COLUMN id SET DEFAULT nextval('public.fuel_source_healths_id_seq'::regclass);


--
-- Name: fx_provider_healths id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_provider_healths ALTER COLUMN id SET DEFAULT nextval('public.fx_provider_healths_id_seq'::regclass);


--
-- Name: fx_rate_observations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_rate_observations ALTER COLUMN id SET DEFAULT nextval('public.fx_rate_observations_id_seq'::regclass);


--
-- Name: macro_observations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.macro_observations ALTER COLUMN id SET DEFAULT nextval('public.macro_observations_id_seq'::regclass);


--
-- Name: macro_source_healths id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.macro_source_healths ALTER COLUMN id SET DEFAULT nextval('public.macro_source_healths_id_seq'::regclass);


--
-- Name: monthly_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_snapshots ALTER COLUMN id SET DEFAULT nextval('public.monthly_snapshots_id_seq'::regclass);


--
-- Name: telegram_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_links ALTER COLUMN id SET DEFAULT nextval('public.telegram_links_id_seq'::regclass);


--
-- Name: CurrencyHistories CurrencyHistories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CurrencyHistories_pkey') THEN
        ALTER TABLE ONLY public."CurrencyHistories" ADD CONSTRAINT "CurrencyHistories_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: CurriculumModules CurriculumModules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CurriculumModules_pkey') THEN
        ALTER TABLE ONLY public."CurriculumModules" ADD CONSTRAINT "CurriculumModules_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: DailyTransactions DailyTransactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyTransactions_pkey') THEN
        ALTER TABLE ONLY public."DailyTransactions" ADD CONSTRAINT "DailyTransactions_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: Mentors Mentors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Mentors_pkey') THEN
        ALTER TABLE ONLY public."Mentors" ADD CONSTRAINT "Mentors_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: Messages Messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Messages_pkey') THEN
        ALTER TABLE ONLY public."Messages" ADD CONSTRAINT "Messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: Missions Missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Missions_pkey') THEN
        ALTER TABLE ONLY public."Missions" ADD CONSTRAINT "Missions_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: Publications Publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Publications_pkey') THEN
        ALTER TABLE ONLY public."Publications" ADD CONSTRAINT "Publications_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: SystemUpdates SystemUpdates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SystemUpdates_pkey') THEN
        ALTER TABLE ONLY public."SystemUpdates" ADD CONSTRAINT "SystemUpdates_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: Transactions Transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transactions_pkey') THEN
        ALTER TABLE ONLY public."Transactions" ADD CONSTRAINT "Transactions_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: UserCalendars UserCalendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserCalendars_pkey') THEN
        ALTER TABLE ONLY public."UserCalendars" ADD CONSTRAINT "UserCalendars_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: UserChecklists UserChecklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserChecklists_pkey') THEN
        ALTER TABLE ONLY public."UserChecklists" ADD CONSTRAINT "UserChecklists_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Users_pkey') THEN
        ALTER TABLE ONLY public."Users" ADD CONSTRAINT "Users_pkey" PRIMARY KEY (username);
    END IF;
END $$;


--
-- Name: WealthSnapshots WealthSnapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WealthSnapshots_pkey') THEN
        ALTER TABLE ONLY public."WealthSnapshots" ADD CONSTRAINT "WealthSnapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_pkey') THEN
        ALTER TABLE ONLY public.accounts ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_pkey') THEN
        ALTER TABLE ONLY public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);
    END IF;
END $$;


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_pkey') THEN
        ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: financial_anomalies financial_anomalies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_anomalies_pkey') THEN
        ALTER TABLE ONLY public.financial_anomalies ADD CONSTRAINT financial_anomalies_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: fuel_catalogs fuel_catalogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_catalogs_pkey') THEN
        ALTER TABLE ONLY public.fuel_catalogs ADD CONSTRAINT fuel_catalogs_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: fuel_policy_weeks fuel_policy_weeks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_policy_weeks_pkey') THEN
        ALTER TABLE ONLY public.fuel_policy_weeks ADD CONSTRAINT fuel_policy_weeks_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: fuel_policy_weeks fuel_policy_weeks_valid_from_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_policy_weeks_valid_from_key') THEN
        ALTER TABLE ONLY public.fuel_policy_weeks ADD CONSTRAINT fuel_policy_weeks_valid_from_key UNIQUE (valid_from);
    END IF;
END $$;


--
-- Name: fuel_price_observations fuel_price_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_price_observations_pkey') THEN
        ALTER TABLE ONLY public.fuel_price_observations ADD CONSTRAINT fuel_price_observations_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: fuel_source_healths fuel_source_healths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_source_healths_pkey') THEN
        ALTER TABLE ONLY public.fuel_source_healths ADD CONSTRAINT fuel_source_healths_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: fx_provider_healths fx_provider_healths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fx_provider_healths_pkey') THEN
        ALTER TABLE ONLY public.fx_provider_healths ADD CONSTRAINT fx_provider_healths_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: fx_rate_observations fx_rate_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fx_rate_observations_pkey') THEN
        ALTER TABLE ONLY public.fx_rate_observations ADD CONSTRAINT fx_rate_observations_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: ledger_transactions ledger_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_transactions_pkey') THEN
        ALTER TABLE ONLY public.ledger_transactions ADD CONSTRAINT ledger_transactions_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: macro_indicators macro_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'macro_indicators_pkey') THEN
        ALTER TABLE ONLY public.macro_indicators ADD CONSTRAINT macro_indicators_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: macro_observations macro_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'macro_observations_pkey') THEN
        ALTER TABLE ONLY public.macro_observations ADD CONSTRAINT macro_observations_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: macro_source_healths macro_source_healths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'macro_source_healths_pkey') THEN
        ALTER TABLE ONLY public.macro_source_healths ADD CONSTRAINT macro_source_healths_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: magnus_events magnus_events_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'magnus_events_idempotency_key_key') THEN
        ALTER TABLE ONLY public.magnus_events ADD CONSTRAINT magnus_events_idempotency_key_key UNIQUE (idempotency_key);
    END IF;
END $$;


--
-- Name: magnus_events magnus_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'magnus_events_pkey') THEN
        ALTER TABLE ONLY public.magnus_events ADD CONSTRAINT magnus_events_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: magnus_notifications magnus_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'magnus_notifications_pkey') THEN
        ALTER TABLE ONLY public.magnus_notifications ADD CONSTRAINT magnus_notifications_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: monthly_snapshots monthly_snapshots_period_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

-- [003] monthly_snapshots_period_user_id_key moved to 003


--
-- Name: monthly_snapshots monthly_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_snapshots_pkey') THEN
        ALTER TABLE ONLY public.monthly_snapshots ADD CONSTRAINT monthly_snapshots_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: payees payees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payees_pkey') THEN
        ALTER TABLE ONLY public.payees ADD CONSTRAINT payees_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: savings_contributions savings_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_contributions_pkey') THEN
        ALTER TABLE ONLY public.savings_contributions ADD CONSTRAINT savings_contributions_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: savings_goals savings_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_goals_pkey') THEN
        ALTER TABLE ONLY public.savings_goals ADD CONSTRAINT savings_goals_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: telegram_links telegram_links_chatId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_links_chatId_key') THEN
        ALTER TABLE ONLY public.telegram_links ADD CONSTRAINT "telegram_links_chatId_key" UNIQUE ("chatId");
    END IF;
END $$;


--
-- Name: telegram_links telegram_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telegram_links_pkey') THEN
        ALTER TABLE ONLY public.telegram_links ADD CONSTRAINT telegram_links_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: transaction_lines transaction_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_lines_pkey') THEN
        ALTER TABLE ONLY public.transaction_lines ADD CONSTRAINT transaction_lines_pkey PRIMARY KEY (id);
    END IF;
END $$;


--
-- Name: accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS accounts_user_id ON public.accounts USING btree (user_id);


--
-- Name: accounts_user_id_is_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS accounts_user_id_is_archived ON public.accounts USING btree (user_id, is_archived);


--
-- Name: accounts_user_id_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS accounts_user_id_type ON public.accounts USING btree (user_id, type);


--
-- Name: categories_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS categories_user_id ON public.categories USING btree (user_id);


--
-- Name: categories_user_id_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS categories_user_id_type ON public.categories USING btree (user_id, type);


--
-- Name: daily_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS daily_transactions_date ON public."DailyTransactions" USING btree (date);


--
-- Name: daily_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS daily_transactions_user_id ON public."DailyTransactions" USING btree ("userId");


--
-- Name: financial_anomalies_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS financial_anomalies_user_id ON public.financial_anomalies USING btree (user_id);


--
-- Name: financial_anomalies_user_id_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS financial_anomalies_user_id_date ON public.financial_anomalies USING btree (user_id, date);


--
-- Name: financial_anomalies_user_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS financial_anomalies_user_id_status ON public.financial_anomalies USING btree (user_id, status);


--
-- Name: fuel_price_observations_fuel_id_valid_from; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS fuel_price_observations_fuel_id_valid_from ON public.fuel_price_observations USING btree (fuel_id, valid_from);


--
-- Name: fx_provider_healths_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS fx_provider_healths_provider ON public.fx_provider_healths USING btree (provider);


--
-- Name: fx_provider_healths_provider_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS fx_provider_healths_provider_timestamp ON public.fx_provider_healths USING btree (provider, "timestamp");


--
-- Name: fx_provider_healths_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS fx_provider_healths_timestamp ON public.fx_provider_healths USING btree ("timestamp");


--
-- Name: fx_rate_observations_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS fx_rate_observations_institution_id ON public.fx_rate_observations USING btree (institution_id);


--
-- Name: fx_rate_observations_institution_id_observed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS fx_rate_observations_institution_id_observed_at ON public.fx_rate_observations USING btree (institution_id, observed_at);


--
-- Name: fx_rate_observations_observed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS fx_rate_observations_observed_at ON public.fx_rate_observations USING btree (observed_at);


--
-- Name: fx_rate_observations_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS fx_rate_observations_provider ON public.fx_rate_observations USING btree (provider);


--
-- Name: idx_daily_transactions_userid_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_transactions_userid_date ON public."DailyTransactions" USING btree ("userId", date DESC);


--
-- Name: idx_transactions_userid_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_transactions_userid_date ON public."Transactions" USING btree ("userId", date DESC);


--
-- Name: idx_wealth_snapshots_userid_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wealth_snapshots_userid_date ON public."WealthSnapshots" USING btree ("userId", date DESC);


--
-- Name: ledger_transactions_payee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS ledger_transactions_payee_id ON public.ledger_transactions USING btree (payee_id);


--
-- Name: ledger_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS ledger_transactions_user_id ON public.ledger_transactions USING btree (user_id);


--
-- Name: ledger_transactions_user_id_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS ledger_transactions_user_id_date ON public.ledger_transactions USING btree (user_id, date);


--
-- Name: ledger_transactions_user_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS ledger_transactions_user_id_status ON public.ledger_transactions USING btree (user_id, status);


--
-- Name: ledger_transactions_user_id_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS ledger_transactions_user_id_type ON public.ledger_transactions USING btree (user_id, type);


--
-- Name: macro_indicators_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS macro_indicators_category ON public.macro_indicators USING btree (category);


--
-- Name: macro_indicators_priority_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS macro_indicators_priority_order ON public.macro_indicators USING btree (priority_order);


--
-- Name: macro_observations_indicator_id_reference_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS macro_observations_indicator_id_reference_period ON public.macro_observations USING btree (indicator_id, reference_period);


--
-- Name: macro_observations_observed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS macro_observations_observed_at ON public.macro_observations USING btree (observed_at);


--
-- Name: macro_observations_reference_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS macro_observations_reference_period ON public.macro_observations USING btree (reference_period);


--
-- Name: macro_source_healths_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS macro_source_healths_source ON public.macro_source_healths USING btree (source);


--
-- Name: macro_source_healths_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS macro_source_healths_timestamp ON public.macro_source_healths USING btree ("timestamp");


--
-- Name: magnus_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS magnus_events_created_at ON public.magnus_events USING btree (created_at);


--
-- Name: magnus_events_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS magnus_events_domain ON public.magnus_events USING btree (domain);


--
-- Name: magnus_events_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS magnus_events_idempotency_key ON public.magnus_events USING btree (idempotency_key);


--
-- Name: magnus_events_indicator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS magnus_events_indicator_id ON public.magnus_events USING btree (indicator_id);


--
-- Name: magnus_events_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS magnus_events_severity ON public.magnus_events USING btree (severity);


--
-- Name: monthly_snapshots_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS monthly_snapshots_period ON public.monthly_snapshots USING btree (period);


--
-- Name: monthly_snapshots_period_user_id; Type: INDEX; Schema: public; Owner: -
--

-- [003] monthly_snapshots_period_user_id moved to 003


--
-- Name: monthly_snapshots_user_id_period; Type: INDEX; Schema: public; Owner: -
--

-- [003] monthly_snapshots_user_id_period moved to 003


--
-- Name: payees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS payees_user_id ON public.payees USING btree (user_id);


--
-- Name: payees_user_id_normalized_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS payees_user_id_normalized_name ON public.payees USING btree (user_id, normalized_name);


--
-- Name: savings_contributions_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS savings_contributions_goal_id ON public.savings_contributions USING btree (goal_id);


--
-- Name: savings_contributions_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS savings_contributions_transaction_id ON public.savings_contributions USING btree (transaction_id);


--
-- Name: savings_goals_linked_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS savings_goals_linked_account_id ON public.savings_goals USING btree (linked_account_id);


--
-- Name: savings_goals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS savings_goals_user_id ON public.savings_goals USING btree (user_id);


--
-- Name: savings_goals_user_id_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS savings_goals_user_id_is_active ON public.savings_goals USING btree (user_id, is_active);


--
-- Name: transaction_lines_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS transaction_lines_account_id ON public.transaction_lines USING btree (account_id);


--
-- Name: transaction_lines_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS transaction_lines_category_id ON public.transaction_lines USING btree (category_id);


--
-- Name: transaction_lines_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS transaction_lines_transaction_id ON public.transaction_lines USING btree (transaction_id);


--
-- Name: transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS transactions_date ON public."Transactions" USING btree (date);


--
-- Name: transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS transactions_user_id ON public."Transactions" USING btree ("userId");


--
-- Name: uq_active_savings_goal_linked_account; Type: INDEX; Schema: public; Owner: -
--

-- [006] uq_active_savings_goal_linked_account moved to 006


--
-- Name: uq_fuel_policy_valid_from; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_fuel_policy_valid_from ON public.fuel_policy_weeks USING btree (valid_from);


--
-- Name: uq_fuel_price_fuel_validfrom; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_fuel_price_fuel_validfrom ON public.fuel_price_observations USING btree (fuel_id, valid_from);


--
-- Name: uq_savings_contributions_transaction; Type: INDEX; Schema: public; Owner: -
--

-- [006] uq_savings_contributions_transaction moved to 006


--
-- Name: transaction_lines trg_check_ledger_transaction_balance; Type: TRIGGER; Schema: public; Owner: -
--

-- [001] trg_check_ledger_transaction_balance moved to 001


--
-- Name: ledger_transactions trg_check_ledger_transaction_header; Type: TRIGGER; Schema: public; Owner: -
--

-- [001] trg_check_ledger_transaction_header moved to 001


--
-- Name: DailyTransactions DailyTransactions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyTransactions_userId_fkey') THEN
        ALTER TABLE ONLY public."DailyTransactions" ADD CONSTRAINT "DailyTransactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."Users"(username) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: Missions Missions_moduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Missions_moduleId_fkey') THEN
        ALTER TABLE ONLY public."Missions" ADD CONSTRAINT "Missions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES public."CurriculumModules"(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;


--
-- Name: Transactions Transactions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transactions_userId_fkey') THEN
        ALTER TABLE ONLY public."Transactions" ADD CONSTRAINT "Transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."Users"(username) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: WealthSnapshots WealthSnapshots_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WealthSnapshots_userId_fkey') THEN
        ALTER TABLE ONLY public."WealthSnapshots" ADD CONSTRAINT "WealthSnapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."Users"(username) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: financial_anomalies financial_anomalies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_anomalies_user_id_fkey') THEN
        ALTER TABLE ONLY public.financial_anomalies ADD CONSTRAINT financial_anomalies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"(username) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: fuel_price_observations fuel_price_observations_fuel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_price_observations_fuel_id_fkey') THEN
        ALTER TABLE ONLY public.fuel_price_observations ADD CONSTRAINT fuel_price_observations_fuel_id_fkey FOREIGN KEY (fuel_id) REFERENCES public.fuel_catalogs(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: ledger_transactions ledger_transactions_payee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_transactions_payee_id_fkey') THEN
        ALTER TABLE ONLY public.ledger_transactions ADD CONSTRAINT ledger_transactions_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES public.payees(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: savings_contributions savings_contributions_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_contributions_goal_id_fkey') THEN
        ALTER TABLE ONLY public.savings_contributions ADD CONSTRAINT savings_contributions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.savings_goals(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;


--
-- Name: savings_goals savings_goals_linked_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_goals_linked_account_id_fkey') THEN
        ALTER TABLE ONLY public.savings_goals ADD CONSTRAINT savings_goals_linked_account_id_fkey FOREIGN KEY (linked_account_id) REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: transaction_lines transaction_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_lines_account_id_fkey') THEN
        ALTER TABLE ONLY public.transaction_lines ADD CONSTRAINT transaction_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: transaction_lines transaction_lines_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_lines_category_id_fkey') THEN
        ALTER TABLE ONLY public.transaction_lines ADD CONSTRAINT transaction_lines_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


--
-- Name: transaction_lines transaction_lines_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_lines_transaction_id_fkey') THEN
        ALTER TABLE ONLY public.transaction_lines ADD CONSTRAINT transaction_lines_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.ledger_transactions(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;


--
-- PostgreSQL database dump complete
--


