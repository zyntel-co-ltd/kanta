-- ENG-157: optional hospital group / branch link (also satisfies ENG-91-style parent FK when not yet present)

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS parent_hospital_id uuid REFERENCES public.hospitals (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hospitals_parent_hospital_id ON public.hospitals (parent_hospital_id);
