-- ENG-90: Sample barcode lookup + patient-level (visit) grouping for LIMS-synced rows

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS barcode text;

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS visit_token text;

COMMENT ON COLUMN public.test_requests.barcode IS 'Sample/specimen barcode from LIMS (Code128 / alphanumeric); used for scan-to-lookup';
COMMENT ON COLUMN public.test_requests.visit_token IS 'Opaque facility-scoped visit/group id from LIMS (not patient id); groups tests for Patient Level TAT';

CREATE INDEX IF NOT EXISTS idx_test_requests_facility_barcode ON public.test_requests (facility_id, barcode)
  WHERE barcode IS NOT NULL AND trim(barcode) <> '';

CREATE INDEX IF NOT EXISTS idx_test_requests_facility_visit_token ON public.test_requests (facility_id, visit_token)
  WHERE visit_token IS NOT NULL AND trim(visit_token) <> '';
