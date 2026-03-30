-- ENG-96: Test-level TAT — explicit section receipt / result-out timestamps
-- Prefer these when set; otherwise fall back to received_at / resulted_at (LIMS).

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS section_time_in timestamptz;

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS section_time_out timestamptz;

COMMENT ON COLUMN public.test_requests.section_time_in IS 'Section receipt (LIMS or Reception manual receive); overrides received_at for TAT clock start when set';
COMMENT ON COLUMN public.test_requests.section_time_out IS 'Result out for this section/test (LIMS/analyser or Reception manual); overrides resulted_at when set';

CREATE INDEX IF NOT EXISTS idx_test_requests_section_time_in ON public.test_requests (facility_id, section_time_in)
  WHERE section_time_in IS NOT NULL;
