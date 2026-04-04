-- ENG-163: Track corrective-action follow-up and rerun closure evidence

ALTER TABLE IF EXISTS public.qualitative_qc_entries
  ADD COLUMN IF NOT EXISTS followup_status text,
  ADD COLUMN IF NOT EXISTS rerun_for_entry_id uuid REFERENCES public.qualitative_qc_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rerun_entry_id uuid REFERENCES public.qualitative_qc_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS followup_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_override_reason text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'qualitative_qc_entries'
      AND column_name = 'followup_status'
  ) THEN
    UPDATE public.qualitative_qc_entries
    SET followup_status = CASE
      WHEN submitted = true AND overall_pass = false AND COALESCE(TRIM(corrective_action), '') <> '' THEN 'open'
      ELSE 'none'
    END
    WHERE followup_status IS NULL;

    ALTER TABLE public.qualitative_qc_entries
      ALTER COLUMN followup_status SET DEFAULT 'none';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'qualitative_qc_entries'
      AND column_name = 'followup_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'qualitative_qc_entries_followup_status_check'
  ) THEN
    ALTER TABLE public.qualitative_qc_entries
      ADD CONSTRAINT qualitative_qc_entries_followup_status_check
      CHECK (followup_status IN ('none', 'open', 'closed', 'override'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_qualitative_qc_entries_followup_status
  ON public.qualitative_qc_entries(facility_id, followup_status);

CREATE INDEX IF NOT EXISTS idx_qualitative_qc_entries_rerun_for
  ON public.qualitative_qc_entries(rerun_for_entry_id);
