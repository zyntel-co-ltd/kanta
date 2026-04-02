-- ENG-91: Hospital groups + branch labels (multi-branch; PostHog still keys on facility_id).

CREATE TABLE IF NOT EXISTS public.hospital_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hospital_groups_slug_key UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_hospital_groups_name ON public.hospital_groups (name);

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.hospital_groups (id) ON DELETE SET NULL;

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS branch_name text;

CREATE INDEX IF NOT EXISTS idx_hospitals_group_id ON public.hospitals (group_id);

COMMENT ON TABLE public.hospital_groups IS 'ENG-91: logical hospital group; branches are rows in hospitals with same group_id.';
COMMENT ON COLUMN public.hospitals.group_id IS 'ENG-91: FK to hospital_groups; NULL = standalone facility.';
COMMENT ON COLUMN public.hospitals.branch_name IS 'ENG-91: branch label within group (e.g. Main Branch); shown with hospitals.name in chrome.';

ALTER TABLE public.hospital_groups ENABLE ROW LEVEL SECURITY;
