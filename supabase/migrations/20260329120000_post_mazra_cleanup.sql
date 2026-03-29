-- Post-Mazra cleanup: drop synthetic injector columns, tighten RLS, hospital classification, seed names.
-- Captures changes applied in Supabase SQL editor 2026-03-28 — 2026-03-29 (idempotent).

-- =============================================================================
-- 1. Drop all mazra_generated columns (legacy injector tagging)
-- =============================================================================
ALTER TABLE IF EXISTS public.test_requests DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.revenue_entries DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.temp_readings DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.scan_events DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.qc_runs DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.qc_results DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.equipment_snapshots DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.lab_samples DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.lab_racks DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.maintenance_schedule DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.numbers_targets DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.revenue_targets DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.tat_targets DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.test_metadata DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.operational_alerts DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.qc_violations DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.qualitative_qc_configs DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.qualitative_qc_entries DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.weekly_summaries DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.tat_anomaly_baselines DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.tat_anomaly_flags DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.tat_breaches DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.temp_breaches DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.tests_targets DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.unmatched_tests DROP COLUMN IF EXISTS mazra_generated;
ALTER TABLE IF EXISTS public.equipment_telemetry_log DROP COLUMN IF EXISTS mazra_generated;

-- =============================================================================
-- 2. Hospital classification + subscription (Kanta hospitals table)
-- =============================================================================
ALTER TABLE IF EXISTS public.hospitals
  ADD COLUMN IF NOT EXISTS classification text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'hospitals' AND c.conname = 'hospitals_classification_check'
  ) THEN
    ALTER TABLE public.hospitals
      ADD CONSTRAINT hospitals_classification_check
      CHECK (classification IS NULL OR classification IN (
        'health_centre_iii','health_centre_iv','general_hospital','regional_referral',
        'national_referral','reference_laboratory','research_institute'
      ));
  END IF;
END $$;

ALTER TABLE IF EXISTS public.hospitals
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'hospitals' AND c.conname = 'hospitals_subscription_status_check'
  ) THEN
    ALTER TABLE public.hospitals
      ADD CONSTRAINT hospitals_subscription_status_check
      CHECK (subscription_status IS NULL OR subscription_status IN ('active','suspended','cancelled','trial'));
  END IF;
END $$;

-- =============================================================================
-- 3. Replace permissive RLS with facility-scoped policies (authenticated users)
-- =============================================================================

-- lab_racks
DROP POLICY IF EXISTS "facility_racks" ON public.lab_racks;
CREATE POLICY "lab_racks_facility_scoped"
  ON public.lab_racks
  FOR ALL
  TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

-- lab_samples
DROP POLICY IF EXISTS "facility_samples" ON public.lab_samples;
CREATE POLICY "lab_samples_facility_scoped"
  ON public.lab_samples
  FOR ALL
  TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

-- equipment_telemetry_log
DROP POLICY IF EXISTS "telemetry_policy" ON public.equipment_telemetry_log;
CREATE POLICY "equipment_telemetry_log_facility_scoped"
  ON public.equipment_telemetry_log
  FOR ALL
  TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

-- tat_anomaly_baselines
DROP POLICY IF EXISTS "facility_baselines" ON public.tat_anomaly_baselines;
CREATE POLICY "tat_anomaly_baselines_facility_scoped"
  ON public.tat_anomaly_baselines
  FOR ALL
  TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

-- tat_anomaly_flags
DROP POLICY IF EXISTS "facility_flags" ON public.tat_anomaly_flags;
CREATE POLICY "tat_anomaly_flags_facility_scoped"
  ON public.tat_anomaly_flags
  FOR ALL
  TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

-- weekly_summaries
DROP POLICY IF EXISTS "facility_summaries" ON public.weekly_summaries;
CREATE POLICY "weekly_summaries_facility_scoped"
  ON public.weekly_summaries
  FOR ALL
  TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

-- ai_inference_log: deny authenticated row access (service role bypasses RLS)
DROP POLICY IF EXISTS "ai_log_policy" ON public.ai_inference_log;
CREATE POLICY "ai_inference_log_no_authenticated"
  ON public.ai_inference_log
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- 4. Canonical Mazra demo hospital names (idempotent updates)
-- =============================================================================
UPDATE public.hospitals
SET
  name = 'Mazra National Referral Hospital',
  classification = 'national_referral',
  subscription_status = 'active'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE public.hospitals
SET
  name = 'Mazra Referral Hospital',
  classification = 'regional_referral',
  subscription_status = 'active'
WHERE id = '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5';
