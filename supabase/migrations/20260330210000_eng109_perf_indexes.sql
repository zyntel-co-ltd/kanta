-- ENG-109: composite/partial indexes for high-traffic Lab Metrics API patterns.
-- Profiled in Supabase (EXPLAIN ANALYZE) against representative queries from:
--   • GET /api/tests — test_requests: facility_id, requested_at range, status <> cancelled
--   • GET /api/tat/summary — test_requests: facility_id, received_at range
--   • GET /api/tests — tests_targets: facility_id, period, period_start (target row)

CREATE INDEX IF NOT EXISTS idx_test_requests_facility_requested_not_cancelled
  ON public.test_requests (facility_id, requested_at)
  WHERE status IS DISTINCT FROM 'cancelled';

CREATE INDEX IF NOT EXISTS idx_test_requests_facility_received_at
  ON public.test_requests (facility_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_tests_targets_facility_period_start
  ON public.tests_targets (facility_id, period, period_start);

COMMENT ON INDEX idx_test_requests_facility_requested_not_cancelled IS 'ENG-109: speed volume/trend queries excluding cancelled rows';
COMMENT ON INDEX idx_test_requests_facility_received_at IS 'ENG-109: TAT analytics on received_at window';
COMMENT ON INDEX idx_tests_targets_facility_period_start IS 'ENG-109: monthly target row lookup by facility';
