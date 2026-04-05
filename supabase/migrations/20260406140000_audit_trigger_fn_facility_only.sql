-- audit_trigger_fn previously referenced NEW/OLD.hospital_id, which errors when
-- equipment / scan_events rows only have facility_id (no hospital_id column).
-- Idempotent: replaces function deployed by 20250321000004_audit_log.sql.

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
