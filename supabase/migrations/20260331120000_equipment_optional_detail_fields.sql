-- ENG-110: optional procurement / detail fields (UI "Additional details" section)

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS purchase_date date,
  ADD COLUMN IF NOT EXISTS purchase_value numeric(12, 2),
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.equipment.manufacturer IS 'Optional — progressive disclosure on registration form';
COMMENT ON COLUMN public.equipment.notes IS 'Free-text notes from registration or edit form';
