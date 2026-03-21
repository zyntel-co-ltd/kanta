-- Mazra: tag synthetic rows for safe reset (delete only mazra_generated = true)

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.revenue_entries
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.temp_readings
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.qc_runs
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.qc_violations
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.test_requests.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.revenue_entries.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.scan_events.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.temp_readings.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.qc_runs.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.qc_violations.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
