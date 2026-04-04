-- ENG-66: Data purging — scheduled nightly nullification of sensitive fields.
--
-- Kanta is an operational intelligence platform, not a patient record system.
-- Sensitive fields that could link operational records to patient identity are
-- automatically purged after a configurable retention window.
--
-- Purgeable fields (nullified, NOT deleted):
--   test_requests: external_patient_ref, qr_code_raw (lab_number, external_ref,
--                  patient_id already covered by ENG-99)
--   test_results:  free_text_notes
--
-- purge_after is set at row creation: created_at + facility.retention_days (default 90).
-- Facility admin can configure 30 / 60 / 90 / 180 days via Admin → Hospital Settings.
--
-- Aggregate metrics (daily_metrics) are pre-computed before nullification so
-- Numbers, TAT, and Revenue charts remain accurate over purged date ranges.

-- ── 1. test_requests — add purgeable sensitive columns (if not yet present) ─
ALTER TABLE test_requests
  ADD COLUMN IF NOT EXISTS external_patient_ref TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_raw          TEXT;

-- Ensure purge_after exists (added in earlier migration; safe to repeat)
ALTER TABLE test_requests
  ADD COLUMN IF NOT EXISTS purge_after DATE;

-- Index for efficient nightly purge scan
CREATE INDEX IF NOT EXISTS idx_test_requests_purge_after
  ON test_requests (purge_after)
  WHERE purge_after IS NOT NULL;

-- ── 2. test_results — add purgeable free_text_notes + purge_after ───────────
CREATE TABLE IF NOT EXISTS test_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES hospitals (id) ON DELETE CASCADE,
  request_id  UUID REFERENCES test_requests (id) ON DELETE SET NULL,
  test_name   TEXT NOT NULL,
  section     TEXT NOT NULL,
  result_value TEXT,
  free_text_notes TEXT,          -- ENG-66: nullified after purge_after
  purge_after DATE,              -- ENG-66: set to created_at + retention_days
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If table already exists, add the missing columns
ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS free_text_notes TEXT,
  ADD COLUMN IF NOT EXISTS purge_after     DATE,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_test_results_purge_after
  ON test_results (purge_after)
  WHERE purge_after IS NOT NULL;

-- ── 3. facility_capability_profile — ensure lab_number_retention_days ────────
ALTER TABLE facility_capability_profile
  ADD COLUMN IF NOT EXISTS lab_number_retention_days INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Constrain to allowed values (30 / 60 / 90 / 180)
ALTER TABLE facility_capability_profile
  DROP CONSTRAINT IF EXISTS chk_retention_days_allowed;

ALTER TABLE facility_capability_profile
  ADD CONSTRAINT chk_retention_days_allowed
  CHECK (lab_number_retention_days IN (30, 60, 90, 180));

-- ── 4. Backfill purge_after on existing test_requests that lack it ───────────
-- Uses the facility's configured retention_days (default 90).
UPDATE test_requests tr
SET purge_after = (tr.created_at::date + COALESCE(
  (SELECT fcp.lab_number_retention_days
     FROM facility_capability_profile fcp
    WHERE fcp.facility_id = tr.facility_id
    LIMIT 1),
  90
) * INTERVAL '1 day')::date
WHERE tr.purge_after IS NULL;

-- ── 5. RLS: test_results inherits facility-scoped policies ───────────────────
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_results_facility_select ON test_results;
CREATE POLICY test_results_facility_select ON test_results
  FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM facility_users WHERE user_id = auth.uid()
    )
  );
