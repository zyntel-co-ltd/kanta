-- Mazra: tag additional synthetic rows for reset

ALTER TABLE public.maintenance_schedule
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.equipment_snapshots
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.operational_alerts
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.qualitative_qc_entries
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.qualitative_qc_configs
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.test_metadata
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.revenue_targets
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.numbers_targets
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.tests_targets
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.temp_breaches
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.maintenance_schedule.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.equipment_snapshots.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.operational_alerts.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.qualitative_qc_entries.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.qualitative_qc_configs.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.test_metadata.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.revenue_targets.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.numbers_targets.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.tests_targets.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.temp_breaches.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
