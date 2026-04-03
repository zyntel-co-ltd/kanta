-- ENG-98: result-source bridge metadata + unmatched logging
-- ENG-99: lab retention, purge_after, daily_metrics
-- ENG-100: dedupe columns + import jobs
-- ENG-92: API keys (server-side only; RLS enabled with no policies = deny via anon key)

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS external_ref text;

ALTER TABLE public.facility_capability_profile
  ADD COLUMN IF NOT EXISTS test_name_mappings jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.facility_capability_profile
  ADD COLUMN IF NOT EXISTS lab_number_retention_days int NOT NULL DEFAULT 90;

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS purge_after date;

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS price_ugx numeric(14, 2);

CREATE TABLE IF NOT EXISTS public.bridge_unmatched_test_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  source_name text NOT NULL,
  occurrence_count int NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, source_name)
);

CREATE INDEX IF NOT EXISTS idx_bridge_unmatched_facility ON public.bridge_unmatched_test_names (facility_id);

CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  test_date date NOT NULL,
  test_name text NOT NULL,
  section text NOT NULL DEFAULT '',
  request_count int NOT NULL DEFAULT 0,
  avg_tat_minutes numeric,
  revenue_ugx numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, test_date, test_name, section)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_facility_date ON public.daily_metrics (facility_id, test_date);

CREATE TABLE IF NOT EXISTS public.data_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  created_by uuid,
  status text NOT NULL DEFAULT 'pending',
  total_rows int NOT NULL DEFAULT 0,
  inserted int NOT NULL DEFAULT 0,
  skipped int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  error_report jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_import_jobs_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_data_import_jobs_facility ON public.data_import_jobs (facility_id);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL DEFAULT 'API key',
  tier text NOT NULL DEFAULT 'free',
  rate_limit_per_minute int NOT NULL DEFAULT 60,
  rate_limit_per_day int NOT NULL DEFAULT 1000,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT api_keys_tier_check CHECK (tier IN ('free', 'startup', 'growth', 'enterprise'))
);

CREATE INDEX IF NOT EXISTS idx_api_keys_facility ON public.api_keys (facility_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys (key_prefix);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Duplicate-safe import / upsert dedupe (ENG-100) — stored generated columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'test_requests' AND column_name = 'dedupe_lab'
  ) THEN
    ALTER TABLE public.test_requests
      ADD COLUMN dedupe_lab text GENERATED ALWAYS AS (COALESCE(TRIM(COALESCE(lab_number, '')), '')) STORED;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'test_requests' AND column_name = 'dedupe_day'
  ) THEN
    ALTER TABLE public.test_requests
      ADD COLUMN dedupe_day date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_requests_import_dedupe
  ON public.test_requests (facility_id, dedupe_lab, test_name, section, dedupe_day);

COMMENT ON COLUMN public.test_requests.external_ref IS 'ENG-98: opaque LIMS reference (e.g. invoice in filename), not patient identity';
COMMENT ON TABLE public.daily_metrics IS 'ENG-99: pre-aggregated rows before lab_number purge';
COMMENT ON TABLE public.api_keys IS 'ENG-92: public API keys (hashed at rest)';
