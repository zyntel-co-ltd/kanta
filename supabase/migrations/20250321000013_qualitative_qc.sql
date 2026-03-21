-- Qualitative QC (Lab-hub parity): HIV Rapid, Malaria RDT, etc.

CREATE TABLE IF NOT EXISTS qualitative_qc_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  result_type text DEFAULT 'Positive / Negative',
  lot_number text,
  manufacturer text,
  expiry_date date,
  frequency text DEFAULT 'Daily',
  controls jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualitative_qc_configs_facility ON qualitative_qc_configs(facility_id);

CREATE TABLE IF NOT EXISTS qualitative_qc_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  config_id uuid NOT NULL REFERENCES qualitative_qc_configs(id) ON DELETE CASCADE,
  run_at date NOT NULL,
  control_results jsonb NOT NULL DEFAULT '[]',
  overall_pass boolean NOT NULL,
  corrective_action text,
  entered_by text,
  submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualitative_qc_entries_facility ON qualitative_qc_entries(facility_id);
CREATE INDEX IF NOT EXISTS idx_qualitative_qc_entries_config ON qualitative_qc_entries(config_id);
CREATE INDEX IF NOT EXISTS idx_qualitative_qc_entries_run_at ON qualitative_qc_entries(run_at DESC);
