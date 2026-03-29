-- Phase 1: Add facility_id to all tables (facility = hospital in this schema)
-- Backfill facility_id from hospital_id only when legacy hospital_id exists (Mazra / fresh DBs may skip).

-- Add facility_id to departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES hospitals(id) ON DELETE CASCADE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'departments' AND column_name = 'hospital_id'
  ) THEN
    UPDATE public.departments SET facility_id = hospital_id WHERE facility_id IS NULL;
  END IF;
END $$;
ALTER TABLE departments ALTER COLUMN facility_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_facility ON departments(facility_id);

-- Add facility_id to equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES hospitals(id) ON DELETE CASCADE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipment' AND column_name = 'hospital_id'
  ) THEN
    UPDATE public.equipment SET facility_id = hospital_id WHERE facility_id IS NULL;
  END IF;
END $$;
ALTER TABLE equipment ALTER COLUMN facility_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_facility ON equipment(facility_id);

-- Add facility_id to scan_events
ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES hospitals(id) ON DELETE CASCADE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scan_events' AND column_name = 'hospital_id'
  ) THEN
    UPDATE public.scan_events SET facility_id = hospital_id WHERE facility_id IS NULL;
  END IF;
END $$;
ALTER TABLE scan_events ALTER COLUMN facility_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_facility ON scan_events(facility_id);

-- Add facility_id to technicians
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES hospitals(id) ON DELETE CASCADE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'technicians' AND column_name = 'hospital_id'
  ) THEN
    UPDATE public.technicians SET facility_id = hospital_id WHERE facility_id IS NULL;
  END IF;
END $$;
ALTER TABLE technicians ALTER COLUMN facility_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_technicians_facility ON technicians(facility_id);

-- Add facility_id to equipment_snapshots
ALTER TABLE equipment_snapshots ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES hospitals(id) ON DELETE CASCADE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipment_snapshots' AND column_name = 'hospital_id'
  ) THEN
    UPDATE public.equipment_snapshots SET facility_id = hospital_id WHERE facility_id IS NULL;
  END IF;
END $$;
ALTER TABLE equipment_snapshots ALTER COLUMN facility_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_snapshots_facility ON equipment_snapshots(facility_id);
