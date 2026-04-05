-- Phase 6: Quality Control module — qc_materials, qc_runs, qc_violations

CREATE TABLE IF NOT EXISTS qc_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  lot_number text,
  level int NOT NULL DEFAULT 1,
  analyte text NOT NULL,
  target_mean decimal(12,4) NOT NULL,
  target_sd decimal(12,4) NOT NULL,
  units text DEFAULT 'μmol/L',
  expires_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_materials_facility ON qc_materials(facility_id);
CREATE INDEX IF NOT EXISTS idx_qc_materials_analyte ON qc_materials(analyte);

CREATE TABLE IF NOT EXISTS qc_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES qc_materials(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  instrument_id uuid,
  operator_id uuid,
  value decimal(12,4) NOT NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  z_score decimal(6,2),
  westgard_flags jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Legacy qc_runs may pre-date material_id; CREATE TABLE IF NOT EXISTS skips — align columns before indexes.
DO $$
BEGIN
  IF to_regclass('public.qc_runs') IS NULL THEN
    RETURN;
  END IF;
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.qc_materials(id) ON DELETE CASCADE;
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE;
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS instrument_id uuid;
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS operator_id uuid;
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS value decimal(12,4);
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS run_at timestamptz;
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS z_score decimal(6,2);
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS westgard_flags jsonb DEFAULT '[]';
  ALTER TABLE public.qc_runs ADD COLUMN IF NOT EXISTS created_at timestamptz;

  UPDATE public.qc_runs r
  SET material_id = (SELECT id FROM public.qc_materials ORDER BY created_at ASC NULLS LAST LIMIT 1)
  WHERE r.material_id IS NULL AND EXISTS (SELECT 1 FROM public.qc_materials LIMIT 1);
  UPDATE public.qc_runs r
  SET facility_id = (SELECT id FROM public.hospitals ORDER BY created_at ASC NULLS LAST LIMIT 1)
  WHERE r.facility_id IS NULL AND EXISTS (SELECT 1 FROM public.hospitals LIMIT 1);
  UPDATE public.qc_runs SET value = 0 WHERE value IS NULL;
  UPDATE public.qc_runs SET run_at = COALESCE(run_at, now()) WHERE run_at IS NULL;
  UPDATE public.qc_runs SET created_at = COALESCE(created_at, now()) WHERE created_at IS NULL;
  UPDATE public.qc_runs SET westgard_flags = COALESCE(westgard_flags, '[]'::jsonb) WHERE westgard_flags IS NULL;

  ALTER TABLE public.qc_runs ALTER COLUMN material_id SET NOT NULL;
  ALTER TABLE public.qc_runs ALTER COLUMN facility_id SET NOT NULL;
  ALTER TABLE public.qc_runs ALTER COLUMN value SET NOT NULL;
  ALTER TABLE public.qc_runs ALTER COLUMN run_at SET NOT NULL;
  ALTER TABLE public.qc_runs ALTER COLUMN created_at SET NOT NULL;
  ALTER TABLE public.qc_runs ALTER COLUMN run_at SET DEFAULT now();
  ALTER TABLE public.qc_runs ALTER COLUMN created_at SET DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_qc_runs_material ON qc_runs(material_id);
CREATE INDEX IF NOT EXISTS idx_qc_runs_facility ON qc_runs(facility_id);
CREATE INDEX IF NOT EXISTS idx_qc_runs_run_at ON qc_runs(run_at DESC);

CREATE TABLE IF NOT EXISTS qc_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES qc_runs(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  rule text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_qc_violations_run ON qc_violations(run_id);
CREATE INDEX IF NOT EXISTS idx_qc_violations_facility ON qc_violations(facility_id);
CREATE INDEX IF NOT EXISTS idx_qc_violations_rule ON qc_violations(rule);
