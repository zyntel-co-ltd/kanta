-- Mazra: tat_targets, tat_breaches, lab_racks, lab_samples synthetic row tagging

ALTER TABLE public.tat_targets
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.tat_breaches
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.lab_racks
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.lab_samples
  ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tat_targets.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.tat_breaches.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.lab_racks.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
COMMENT ON COLUMN public.lab_samples.mazra_generated IS 'Mazra synthetic row — safe to delete on reset';
