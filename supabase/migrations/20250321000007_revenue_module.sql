-- Phase 4: Revenue module — revenue_entries, revenue_targets

CREATE TABLE IF NOT EXISTS revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  date date NOT NULL,
  test_name text NOT NULL,
  section text NOT NULL,
  amount decimal(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UGX',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'pending')),
  source_ref text,
  lab_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_entries_facility ON revenue_entries(facility_id);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_date ON revenue_entries(date);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_section ON revenue_entries(section);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_status ON revenue_entries(status);

CREATE TABLE IF NOT EXISTS revenue_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('daily', 'monthly', 'quarterly')),
  period_start date NOT NULL,
  amount decimal(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'UGX',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_targets_facility ON revenue_targets(facility_id);
CREATE INDEX IF NOT EXISTS idx_revenue_targets_period ON revenue_targets(period, period_start);
