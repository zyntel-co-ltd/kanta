-- Samples module: lab_racks and lab_samples
-- Replaces the localhost Lab-hub integration with native Supabase storage

CREATE TABLE IF NOT EXISTS lab_racks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  rack_name   text NOT NULL,
  rack_date   date NOT NULL DEFAULT CURRENT_DATE,
  rack_type   text NOT NULL DEFAULT 'normal' CHECK (rack_type IN ('normal', 'igra')),
  description text,
  status      text NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'partial', 'full')),
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Pre-existing lab_racks (e.g. Mazra) may omit `status`; CREATE TABLE IF NOT EXISTS skips the full DDL.
ALTER TABLE public.lab_racks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'empty';

CREATE INDEX IF NOT EXISTS idx_lab_racks_facility   ON lab_racks(facility_id);
CREATE INDEX IF NOT EXISTS idx_lab_racks_rack_date  ON lab_racks(rack_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_racks_status     ON lab_racks(status);

CREATE TABLE IF NOT EXISTS lab_samples (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id         uuid NOT NULL REFERENCES lab_racks(id) ON DELETE CASCADE,
  facility_id     uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  barcode         text NOT NULL,
  patient_id      text,
  sample_type     text,
  position        int NOT NULL,
  collection_date date,
  notes           text,
  discarded_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rack_id, position)
);

CREATE INDEX IF NOT EXISTS idx_lab_samples_rack     ON lab_samples(rack_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_facility ON lab_samples(facility_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_barcode  ON lab_samples(barcode);
CREATE INDEX IF NOT EXISTS idx_lab_samples_patient  ON lab_samples(patient_id);

-- Auto-update rack status when samples change
CREATE OR REPLACE FUNCTION update_rack_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  capacity int;
  sample_count int;
BEGIN
  SELECT CASE WHEN rack_type = 'igra' THEN 40 ELSE 100 END
  INTO capacity
  FROM lab_racks WHERE id = COALESCE(NEW.rack_id, OLD.rack_id);

  SELECT COUNT(*) INTO sample_count
  FROM lab_samples
  WHERE rack_id = COALESCE(NEW.rack_id, OLD.rack_id)
    AND discarded_at IS NULL;

  UPDATE lab_racks SET
    status = CASE
      WHEN sample_count = 0 THEN 'empty'
      WHEN sample_count >= capacity THEN 'full'
      ELSE 'partial'
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.rack_id, OLD.rack_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rack_status_insert ON lab_samples;
DROP TRIGGER IF EXISTS trg_rack_status_update ON lab_samples;
DROP TRIGGER IF EXISTS trg_rack_status_delete ON lab_samples;

CREATE TRIGGER trg_rack_status_insert AFTER INSERT ON lab_samples FOR EACH ROW EXECUTE FUNCTION update_rack_status();
CREATE TRIGGER trg_rack_status_update AFTER UPDATE ON lab_samples FOR EACH ROW EXECUTE FUNCTION update_rack_status();
CREATE TRIGGER trg_rack_status_delete AFTER DELETE ON lab_samples FOR EACH ROW EXECUTE FUNCTION update_rack_status();

-- RLS
ALTER TABLE lab_racks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facility_racks"   ON lab_racks   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "facility_samples" ON lab_samples FOR ALL USING (true) WITH CHECK (true);
