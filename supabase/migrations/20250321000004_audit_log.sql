-- Phase 1: Audit log — append-only for critical changes
-- Triggers on equipment, facility_users, scan_events

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  facility_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_facility ON audit_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- Generic audit trigger function
-- Resolve facility via JSON so legacy hospital_id rows and facility_id-only rows both work
-- (direct NEW.hospital_id fails when the table has no such column).
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  fid uuid;
  j jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    j := to_jsonb(OLD);
    fid := COALESCE((j->>'facility_id')::uuid, (j->>'hospital_id')::uuid);
    INSERT INTO audit_log (table_name, record_id, facility_id, action, old_data)
    VALUES (TG_TABLE_NAME, (j->>'id')::uuid, fid, 'DELETE', j);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    j := to_jsonb(NEW);
    fid := COALESCE((j->>'facility_id')::uuid, (j->>'hospital_id')::uuid);
    INSERT INTO audit_log (table_name, record_id, facility_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, (j->>'id')::uuid, fid, 'UPDATE', to_jsonb(OLD), j);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    j := to_jsonb(NEW);
    fid := COALESCE((j->>'facility_id')::uuid, (j->>'hospital_id')::uuid);
    INSERT INTO audit_log (table_name, record_id, facility_id, action, new_data)
    VALUES (TG_TABLE_NAME, (j->>'id')::uuid, fid, 'INSERT', j);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Equipment audit
DROP TRIGGER IF EXISTS audit_equipment ON equipment;
CREATE TRIGGER audit_equipment
  AFTER INSERT OR UPDATE OR DELETE ON equipment
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Scan events audit
DROP TRIGGER IF EXISTS audit_scan_events ON scan_events;
CREATE TRIGGER audit_scan_events
  AFTER INSERT ON scan_events
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
