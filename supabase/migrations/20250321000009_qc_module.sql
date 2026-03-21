-- Phase 6: Quality Control module — qc_materials, qc_runs, qc_violations

CREATE TABLE IF NOT EXISTS qc_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  lot_number text,
  level int NOT NULL DEFAULT 1,
  analyte text NOT NULL,
  target_mean decimal(12,4) NOT NULL,
  target_sd decimal(12,4) NOT NULL,
  units text DEFAULT 'μmol/L',
  expires_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_materials_facility ON qc_materials(facility_id);
CREATE INDEX IF NOT EXISTS idx_qc_materials_analyte ON qc_materials(analyte);

CREATE TABLE IF NOT EXISTS qc_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES qc_materials(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  instrument_id uuid,
  operator_id uuid,
  value decimal(12,4) NOT NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  z_score decimal(6,2),
  westgard_flags jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_runs_material ON qc_runs(material_id);
CREATE INDEX IF NOT EXISTS idx_qc_runs_facility ON qc_runs(facility_id);
CREATE INDEX IF NOT EXISTS idx_qc_runs_run_at ON qc_runs(run_at DESC);

CREATE TABLE IF NOT EXISTS qc_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES qc_runs(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  rule text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_qc_violations_run ON qc_violations(run_id);
CREATE INDEX IF NOT EXISTS idx_qc_violations_facility ON qc_violations(facility_id);
CREATE INDEX IF NOT EXISTS idx_qc_violations_rule ON qc_violations(rule);
