-- Tests module — tests_targets (volume targets), test_metadata (test catalog like zyntel-dashboard Meta)

-- tests_targets: monthly/daily target for number of tests (like zyntel-dashboard tests target)
CREATE TABLE IF NOT EXISTS tests_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('daily', 'monthly', 'quarterly')),
  period_start date NOT NULL,
  target int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(facility_id, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_tests_targets_facility ON tests_targets(facility_id);
CREATE INDEX IF NOT EXISTS idx_tests_targets_period ON tests_targets(period, period_start);

-- test_metadata: test catalog (test name, price, TAT, section) — like zyntel-dashboard Meta table
CREATE TABLE IF NOT EXISTS test_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  section text NOT NULL,
  price decimal(14,2) NOT NULL DEFAULT 0,
  tat_minutes int NOT NULL DEFAULT 60,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_metadata_facility ON test_metadata(facility_id);
CREATE INDEX IF NOT EXISTS idx_test_metadata_section ON test_metadata(section);
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_metadata_facility_name ON test_metadata(facility_id, LOWER(TRIM(test_name)));
