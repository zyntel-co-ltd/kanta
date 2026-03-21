-- Phase 3: TAT module — test_requests, tat_targets, tat_breaches, facility_settings (pipeline config)

-- facility_settings: pipeline config per facility (REST endpoint, SFTP, etc.)
CREATE TABLE IF NOT EXISTS facility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE UNIQUE,
  pipeline_type text CHECK (pipeline_type IN ('rest', 'sftp', 'postgres', 'manual')),
  pipeline_config jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_settings_facility ON facility_settings(facility_id);

-- test_requests: lab test turnaround time tracking
CREATE TABLE IF NOT EXISTS test_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id text,
  lab_number text,
  test_name text NOT NULL,
  section text NOT NULL,
  priority text DEFAULT 'routine' CHECK (priority IN ('stat', 'urgent', 'routine')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz,
  resulted_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'in_progress', 'resulted', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_requests_facility ON test_requests(facility_id);
CREATE INDEX IF NOT EXISTS idx_test_requests_status ON test_requests(status);
CREATE INDEX IF NOT EXISTS idx_test_requests_received ON test_requests(received_at);
CREATE INDEX IF NOT EXISTS idx_test_requests_section ON test_requests(section);

-- tat_targets: target minutes per section/test
CREATE TABLE IF NOT EXISTS tat_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  section text NOT NULL,
  test_name text,
  target_minutes int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(facility_id, section, COALESCE(test_name, ''))
);

CREATE INDEX IF NOT EXISTS idx_tat_targets_facility ON tat_targets(facility_id);

-- tat_breaches: detected TAT breaches
CREATE TABLE IF NOT EXISTS tat_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES test_requests(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  breach_minutes int NOT NULL,
  target_minutes int NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid
);

CREATE INDEX IF NOT EXISTS idx_tat_breaches_facility ON tat_breaches(facility_id);
CREATE INDEX IF NOT EXISTS idx_tat_breaches_detected ON tat_breaches(detected_at);
