-- Admin parity: unmatched_tests, test_cancellations, login_audit, numbers_targets
-- Plus shift/unit on test_requests for Tracker

-- Add shift and unit to test_requests (for Tracker filters like zyntel-dashboard)
ALTER TABLE test_requests ADD COLUMN IF NOT EXISTS shift text;
ALTER TABLE test_requests ADD COLUMN IF NOT EXISTS unit text;

-- Unmatched tests: test names seen in data but not in test_metadata
CREATE TABLE IF NOT EXISTS unmatched_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  source text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  occurrence_count int NOT NULL DEFAULT 1,
  last_seen timestamptz NOT NULL DEFAULT now(),
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unmatched_tests_unique
  ON unmatched_tests (facility_id, LOWER(TRIM(test_name)), COALESCE(source, ''));
CREATE INDEX IF NOT EXISTS idx_unmatched_tests_facility ON unmatched_tests(facility_id);
CREATE INDEX IF NOT EXISTS idx_unmatched_tests_resolved ON unmatched_tests(is_resolved);

-- Test cancellations: track cancelled tests with reason
CREATE TABLE IF NOT EXISTS test_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  request_id uuid REFERENCES test_requests(id) ON DELETE SET NULL,
  reason text NOT NULL,
  refund_amount decimal(14,2),
  cancelled_by uuid,
  cancelled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_cancellations_facility ON test_cancellations(facility_id);
CREATE INDEX IF NOT EXISTS idx_test_cancellations_cancelled_at ON test_cancellations(cancelled_at);

-- Login audit: login attempts (success/fail)
CREATE TABLE IF NOT EXISTS login_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  username text NOT NULL,
  user_id uuid,
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_created ON login_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_username ON login_audit(username);
CREATE INDEX IF NOT EXISTS idx_login_audit_facility ON login_audit(facility_id);

-- Numbers targets: monthly request count targets (like zyntel-dashboard)
CREATE TABLE IF NOT EXISTS numbers_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('daily', 'monthly', 'quarterly')),
  period_start date NOT NULL,
  target int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(facility_id, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_numbers_targets_facility ON numbers_targets(facility_id);

-- Add is_active to facility_users for user management
ALTER TABLE facility_users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add UNIQUE to revenue_targets for upsert (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'revenue_targets_facility_period_start_key'
  ) THEN
    ALTER TABLE revenue_targets ADD CONSTRAINT revenue_targets_facility_period_start_key
      UNIQUE (facility_id, period, period_start);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
