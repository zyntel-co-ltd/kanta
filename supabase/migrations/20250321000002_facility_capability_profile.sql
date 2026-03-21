-- Phase 1: facility_capability_profile — engine of Adaptive Presence
-- One row per facility, boolean per feature

CREATE TABLE IF NOT EXISTS facility_capability_profile (
  facility_id uuid PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
  has_tat boolean NOT NULL DEFAULT false,
  has_revenue boolean NOT NULL DEFAULT false,
  has_refrigerator_monitoring boolean NOT NULL DEFAULT false,
  has_qc boolean NOT NULL DEFAULT false,
  has_equipment boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed for demo hospital (Mulago)
INSERT INTO facility_capability_profile (facility_id, has_equipment, has_tat, has_revenue, has_refrigerator_monitoring, has_qc)
VALUES ('00000000-0000-0000-0000-000000000001', true, false, false, false, false)
ON CONFLICT (facility_id) DO NOTHING;
