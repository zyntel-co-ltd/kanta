-- ENG-85: lab_sections, lab_shifts, tat_targets.section_id
-- ENG-64: audit_log — drop restrictive action CHECK, add user_id for app-level audit rows

-- ── Drop CHECK on audit_log.action (allow semantic actions like user.role_changed) ──
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY (c.conkey) AND a.attrelid = c.conrelid
    WHERE c.conrelid = 'public.audit_log'::regclass
      AND c.contype = 'c'
      AND a.attname = 'action'
  LOOP
    EXECUTE format('ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS entity_type text;

COMMENT ON COLUMN public.audit_log.user_id IS 'Actor for application audit rows (table_name = audit_app)';
COMMENT ON COLUMN public.audit_log.entity_type IS 'Logical entity for app audit (e.g. facility_user, lab_section)';
COMMENT ON COLUMN public.audit_log.table_name IS 'Source table for trigger audits; use audit_app for API audit events';

-- ── Lab sections (per facility) ──
CREATE TABLE IF NOT EXISTS public.lab_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  name text NOT NULL,
  abbreviation text NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_sections_facility_code_unique UNIQUE (facility_id, code)
);

-- Legacy lab_sections may be an older shape (no facility_id / abbreviation / code).
-- CREATE TABLE IF NOT EXISTS skips — add columns and backfill before indexes + seed INSERT.
DO $$
BEGIN
  IF to_regclass('public.lab_sections') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.lab_sections ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.hospitals (id) ON DELETE CASCADE;
  ALTER TABLE public.lab_sections ADD COLUMN IF NOT EXISTS name text;
  ALTER TABLE public.lab_sections ADD COLUMN IF NOT EXISTS abbreviation text;
  ALTER TABLE public.lab_sections ADD COLUMN IF NOT EXISTS code text;
  ALTER TABLE public.lab_sections ADD COLUMN IF NOT EXISTS is_active boolean;
  ALTER TABLE public.lab_sections ADD COLUMN IF NOT EXISTS sort_order int;
  ALTER TABLE public.lab_sections ADD COLUMN IF NOT EXISTS created_at timestamptz;
  ALTER TABLE public.lab_sections ADD COLUMN IF NOT EXISTS updated_at timestamptz;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lab_sections' AND column_name = 'hospital_id'
  ) THEN
    UPDATE public.lab_sections SET facility_id = hospital_id WHERE facility_id IS NULL;
  END IF;
  UPDATE public.lab_sections ls
  SET facility_id = (SELECT id FROM public.hospitals ORDER BY created_at ASC NULLS LAST LIMIT 1)
  WHERE ls.facility_id IS NULL AND EXISTS (SELECT 1 FROM public.hospitals LIMIT 1);
  DELETE FROM public.lab_sections WHERE facility_id IS NULL;

  UPDATE public.lab_sections SET name = COALESCE(NULLIF(btrim(name), ''), 'Section') WHERE name IS NULL OR btrim(name) = '';
  UPDATE public.lab_sections SET abbreviation = COALESCE(NULLIF(btrim(abbreviation), ''), upper(left(btrim(name), 4)))
  WHERE abbreviation IS NULL OR btrim(abbreviation) = '';
  UPDATE public.lab_sections SET code = COALESCE(NULLIF(btrim(code), ''), 'SEC-' || replace(id::text, '-', ''))
  WHERE code IS NULL OR btrim(code) = '';
  UPDATE public.lab_sections SET is_active = COALESCE(is_active, true) WHERE is_active IS NULL;
  UPDATE public.lab_sections SET sort_order = COALESCE(sort_order, 0) WHERE sort_order IS NULL;
  UPDATE public.lab_sections SET created_at = COALESCE(created_at, now()) WHERE created_at IS NULL;
  UPDATE public.lab_sections SET updated_at = COALESCE(updated_at, now()) WHERE updated_at IS NULL;

  ALTER TABLE public.lab_sections ALTER COLUMN facility_id SET NOT NULL;
  ALTER TABLE public.lab_sections ALTER COLUMN name SET NOT NULL;
  ALTER TABLE public.lab_sections ALTER COLUMN abbreviation SET NOT NULL;
  ALTER TABLE public.lab_sections ALTER COLUMN code SET NOT NULL;
  ALTER TABLE public.lab_sections ALTER COLUMN is_active SET NOT NULL;
  ALTER TABLE public.lab_sections ALTER COLUMN sort_order SET NOT NULL;
  ALTER TABLE public.lab_sections ALTER COLUMN created_at SET NOT NULL;
  ALTER TABLE public.lab_sections ALTER COLUMN updated_at SET NOT NULL;
  ALTER TABLE public.lab_sections ALTER COLUMN is_active SET DEFAULT true;
  ALTER TABLE public.lab_sections ALTER COLUMN sort_order SET DEFAULT 0;
  ALTER TABLE public.lab_sections ALTER COLUMN created_at SET DEFAULT now();
  ALTER TABLE public.lab_sections ALTER COLUMN updated_at SET DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_sections_facility ON public.lab_sections (facility_id);
CREATE INDEX IF NOT EXISTS idx_lab_sections_facility_active ON public.lab_sections (facility_id, is_active);

-- ── Lab shifts (per facility) ──
CREATE TABLE IF NOT EXISTS public.lab_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.lab_shifts') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.lab_shifts ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.hospitals (id) ON DELETE CASCADE;
  ALTER TABLE public.lab_shifts ADD COLUMN IF NOT EXISTS name text;
  ALTER TABLE public.lab_shifts ADD COLUMN IF NOT EXISTS start_time time;
  ALTER TABLE public.lab_shifts ADD COLUMN IF NOT EXISTS end_time time;
  ALTER TABLE public.lab_shifts ADD COLUMN IF NOT EXISTS is_active boolean;
  ALTER TABLE public.lab_shifts ADD COLUMN IF NOT EXISTS created_at timestamptz;
  ALTER TABLE public.lab_shifts ADD COLUMN IF NOT EXISTS updated_at timestamptz;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lab_shifts' AND column_name = 'hospital_id'
  ) THEN
    UPDATE public.lab_shifts SET facility_id = hospital_id WHERE facility_id IS NULL;
  END IF;
  UPDATE public.lab_shifts ls
  SET facility_id = (SELECT id FROM public.hospitals ORDER BY created_at ASC NULLS LAST LIMIT 1)
  WHERE ls.facility_id IS NULL AND EXISTS (SELECT 1 FROM public.hospitals LIMIT 1);
  DELETE FROM public.lab_shifts WHERE facility_id IS NULL;

  UPDATE public.lab_shifts SET name = COALESCE(NULLIF(btrim(name), ''), 'Shift') WHERE name IS NULL OR btrim(name) = '';
  UPDATE public.lab_shifts SET start_time = COALESCE(start_time, '07:00'::time) WHERE start_time IS NULL;
  UPDATE public.lab_shifts SET end_time = COALESCE(end_time, '15:00'::time) WHERE end_time IS NULL;
  UPDATE public.lab_shifts SET is_active = COALESCE(is_active, true) WHERE is_active IS NULL;
  UPDATE public.lab_shifts SET created_at = COALESCE(created_at, now()) WHERE created_at IS NULL;
  UPDATE public.lab_shifts SET updated_at = COALESCE(updated_at, now()) WHERE updated_at IS NULL;

  ALTER TABLE public.lab_shifts ALTER COLUMN facility_id SET NOT NULL;
  ALTER TABLE public.lab_shifts ALTER COLUMN name SET NOT NULL;
  ALTER TABLE public.lab_shifts ALTER COLUMN start_time SET NOT NULL;
  ALTER TABLE public.lab_shifts ALTER COLUMN end_time SET NOT NULL;
  ALTER TABLE public.lab_shifts ALTER COLUMN is_active SET NOT NULL;
  ALTER TABLE public.lab_shifts ALTER COLUMN created_at SET NOT NULL;
  ALTER TABLE public.lab_shifts ALTER COLUMN updated_at SET NOT NULL;
  ALTER TABLE public.lab_shifts ALTER COLUMN is_active SET DEFAULT true;
  ALTER TABLE public.lab_shifts ALTER COLUMN created_at SET DEFAULT now();
  ALTER TABLE public.lab_shifts ALTER COLUMN updated_at SET DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_shifts_facility ON public.lab_shifts (facility_id);

-- ── Link TAT targets to sections (optional FK; section text kept for pipeline compatibility) ──
ALTER TABLE public.tat_targets
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.lab_sections (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tat_targets_section_id ON public.tat_targets (section_id);

-- ── Seed default sections for every hospital (idempotent) ──
INSERT INTO public.lab_sections (facility_id, name, abbreviation, code, is_active, sort_order)
SELECT h.id, v.name, v.abbr, v.code, true, v.ord
FROM public.hospitals h
CROSS JOIN (
  VALUES
    ('Chemistry', 'CHEM', 'CHEMISTRY', 1),
    ('Haematology', 'HAEM', 'HAEMATOLOGY', 2),
    ('Microbiology', 'MIC', 'MICROBIOLOGY', 3),
    ('Serology', 'SER', 'SEROLOGY', 4),
    ('Referral', 'REF', 'REFERRAL', 5),
    ('N/A', 'N/A', 'N/A', 6)
) AS v (name, abbr, code, ord)
ON CONFLICT (facility_id, code) DO NOTHING;

-- ── Seed default shifts (idempotent by name per facility) ──
INSERT INTO public.lab_shifts (facility_id, name, start_time, end_time, is_active)
SELECT h.id, s.name, s.start_time::time, s.end_time::time, true
FROM public.hospitals h
CROSS JOIN (
  VALUES
    ('Morning', '07:00', '15:00'),
    ('Afternoon', '15:00', '23:00'),
    ('Night', '23:00', '07:00')
) AS s (name, start_time, end_time)
WHERE NOT EXISTS (
  SELECT 1 FROM public.lab_shifts ls
  WHERE ls.facility_id = h.id AND ls.name = s.name
);

-- ── Backfill section_id on tat_targets where section matches lab_sections.code ──
UPDATE public.tat_targets tt
SET section_id = ls.id
FROM public.lab_sections ls
WHERE ls.facility_id = tt.facility_id
  AND tt.section_id IS NULL
  AND (tt.test_name IS NULL OR trim(tt.test_name) = '')
  AND upper(trim(ls.code)) = upper(trim(tt.section));
