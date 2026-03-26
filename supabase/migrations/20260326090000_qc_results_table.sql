-- Phase 11+: Quantitative QC results table (used by UI as `qc_results`)
-- Keep separate from `qc_runs` (which feeds `qc_violations`).

CREATE TABLE IF NOT EXISTS qc_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES qc_materials(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  run_date date NOT NULL,
  value decimal(12,4) NOT NULL,
  z_score decimal(6,2),
  rule_violations jsonb NOT NULL DEFAULT '[]',
  result_type text NOT NULL DEFAULT 'quantitative',
  notes text,
  operator text,
  created_at timestamptz NOT NULL DEFAULT now(),
  mazra_generated boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_qc_results_facility ON qc_results(facility_id);
CREATE INDEX IF NOT EXISTS idx_qc_results_material ON qc_results(material_id);
CREATE INDEX IF NOT EXISTS idx_qc_results_run_date ON qc_results(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_qc_results_result_type ON qc_results(result_type);

