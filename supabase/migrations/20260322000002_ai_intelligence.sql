-- ============================================================
-- AI Intelligence Layer — Phase 10
-- Tables: tat_anomaly_baselines, tat_anomaly_flags,
--         weekly_summaries, ai_inference_log,
--         equipment_telemetry_log
-- ============================================================

-- ─── 1. Rolling TAT baselines (per facility × section × test type) ───────────
CREATE TABLE IF NOT EXISTS tat_anomaly_baselines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  section         text NOT NULL,
  test_name       text NOT NULL,
  -- Rolling 90-day stats (recomputed nightly)
  sample_count    int NOT NULL DEFAULT 0,
  mean_minutes    decimal(10,2),
  stddev_minutes  decimal(10,2),
  p50_minutes     decimal(10,2),
  p90_minutes     decimal(10,2),
  baseline_from   date NOT NULL DEFAULT (CURRENT_DATE - INTERVAL '90 days')::date,
  baseline_to     date NOT NULL DEFAULT CURRENT_DATE,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, section, test_name)
);

CREATE INDEX IF NOT EXISTS idx_tat_baselines_facility ON tat_anomaly_baselines(facility_id);

-- ─── 2. TAT anomaly flags ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tat_anomaly_flags (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id          uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  request_id           uuid,             -- references test_requests if available
  section              text NOT NULL,
  test_name            text NOT NULL,
  equipment_id         uuid,             -- nullable — linked when known
  tat_minutes          decimal(10,2) NOT NULL,
  baseline_mean        decimal(10,2),
  baseline_stddev      decimal(10,2),
  z_score              decimal(8,4),
  deviation_pct        decimal(8,2),     -- % above/below mean
  confidence_score     decimal(4,3),     -- 0.000–1.000
  is_cluster           boolean NOT NULL DEFAULT false,
  cluster_size         int NOT NULL DEFAULT 1,
  reason_text          text,             -- plain English, AI-generated or rule-based
  flagged_at           timestamptz NOT NULL DEFAULT now(),
  resolved_at          timestamptz,
  acknowledged_by      uuid REFERENCES auth.users(id),
  acknowledged_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_anomaly_flags_facility  ON tat_anomaly_flags(facility_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_equipment ON tat_anomaly_flags(equipment_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_flagged   ON tat_anomaly_flags(flagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_section   ON tat_anomaly_flags(section);

-- ─── 3. Weekly operational summaries ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  week_start      date NOT NULL,
  week_end        date NOT NULL,
  summary_md      text NOT NULL,          -- Markdown body (AI-generated)
  top_anomalies   jsonb DEFAULT '[]',
  equipment_flags jsonb DEFAULT '[]',
  kpi_snapshot    jsonb DEFAULT '{}',
  prior_period_delta jsonb DEFAULT '{}',
  model_version   text DEFAULT 'claude-3-haiku',
  generated_at    timestamptz NOT NULL DEFAULT now(),
  emailed_at      timestamptz,
  email_recipients text[],
  UNIQUE (facility_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_facility ON weekly_summaries(facility_id);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week     ON weekly_summaries(week_start DESC);

-- ─── 4. AI inference audit log (compliance + debugging) ──────────────────────
-- Every AI call is logged: input token count, model, facility, output hash.
-- Raw patient data NEVER enters this table.
CREATE TABLE IF NOT EXISTS ai_inference_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     uuid REFERENCES hospitals(id),
  user_id         uuid REFERENCES auth.users(id),
  feature         text NOT NULL,   -- 'anomaly_reason' | 'nl_query' | 'weekly_summary' | 'fault_signal'
  model           text NOT NULL,
  prompt_tokens   int,
  completion_tokens int,
  -- Data sources used (never raw values — only metadata)
  data_sources    jsonb DEFAULT '[]',  -- e.g. ["tat_anomaly_flags", "tat_anomaly_baselines"]
  data_row_count  int,                 -- how many rows were referenced
  output_hash     text,                -- SHA-256 of output for reproducibility audit
  latency_ms      int,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_log_facility ON ai_inference_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_feature  ON ai_inference_log(feature);
CREATE INDEX IF NOT EXISTS idx_ai_log_created  ON ai_inference_log(created_at DESC);

-- ─── 5. Equipment telemetry log (data flywheel foundation) ───────────────────
-- Stores operational signals over time to build training datasets.
-- No patient-identifying fields. Hashed facility_id for cross-facility training.
CREATE TABLE IF NOT EXISTS equipment_telemetry_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  equipment_id      uuid,
  section           text NOT NULL,
  test_name         text NOT NULL,
  tat_minutes       decimal(10,2) NOT NULL,
  z_score           decimal(8,4),
  hour_of_day       smallint,
  day_of_week       smallint,
  samples_that_day  int,
  -- Outcome labels (filled retroactively when equipment failure recorded)
  days_to_failure   int,            -- NULL until failure event known
  failure_type      text,           -- 'mechanical' | 'reagent' | 'calibration' | 'software'
  recorded_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_facility  ON equipment_telemetry_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_equipment ON equipment_telemetry_log(equipment_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_section   ON equipment_telemetry_log(section, test_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded  ON equipment_telemetry_log(recorded_at DESC);

-- ─── RLS (permissive — tighten per facility RBAC later) ──────────────────────
ALTER TABLE tat_anomaly_baselines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tat_anomaly_flags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_inference_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_telemetry_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facility_baselines"  ON tat_anomaly_baselines  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "facility_flags"      ON tat_anomaly_flags      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "facility_summaries"  ON weekly_summaries       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ai_log_policy"       ON ai_inference_log       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "telemetry_policy"    ON equipment_telemetry_log FOR ALL USING (true) WITH CHECK (true);
