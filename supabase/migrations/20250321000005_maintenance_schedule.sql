-- Phase 2: Equipment categories A/B/C and maintenance schedule
-- Category A = critical, B = important, C = general

-- Update equipment category check to include A/B/C
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_category_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_category_check
  CHECK (category IN ('Diagnostic','Surgical','Monitoring','Life Support','Other','A','B','C'));

-- Maintenance schedule table
CREATE TABLE IF NOT EXISTS maintenance_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  interval_days int NOT NULL DEFAULT 90,
  last_maintained_at timestamptz,
  next_due_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_equipment ON maintenance_schedule(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_facility ON maintenance_schedule(facility_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_next_due ON maintenance_schedule(next_due_at);
