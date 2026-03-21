-- Phase 5: Refrigerator and cold chain monitoring
-- facility_settings already exists; add telemetry_api_key column for fridge sensor auth

ALTER TABLE facility_settings ADD COLUMN IF NOT EXISTS telemetry_api_key text;

-- refrigerator_units
CREATE TABLE IF NOT EXISTS refrigerator_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  min_temp_celsius decimal(4,2) NOT NULL DEFAULT 2,
  max_temp_celsius decimal(4,2) NOT NULL DEFAULT 8,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refrigerator_units_facility ON refrigerator_units(facility_id);

-- temp_readings
CREATE TABLE IF NOT EXISTS temp_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES refrigerator_units(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  temp_celsius decimal(4,2) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_temp_readings_unit ON temp_readings(unit_id);
CREATE INDEX IF NOT EXISTS idx_temp_readings_facility ON temp_readings(facility_id);
CREATE INDEX IF NOT EXISTS idx_temp_readings_recorded ON temp_readings(recorded_at DESC);

-- temp_breaches
CREATE TABLE IF NOT EXISTS temp_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES refrigerator_units(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  breach_type text NOT NULL CHECK (breach_type IN ('too_hot', 'too_cold')),
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  max_deviation decimal(4,2)
);

CREATE INDEX IF NOT EXISTS idx_temp_breaches_unit ON temp_breaches(unit_id);
CREATE INDEX IF NOT EXISTS idx_temp_breaches_facility ON temp_breaches(facility_id);
CREATE INDEX IF NOT EXISTS idx_temp_breaches_started ON temp_breaches(started_at);
