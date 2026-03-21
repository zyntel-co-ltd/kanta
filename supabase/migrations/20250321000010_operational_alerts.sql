-- Phase 7: operational_alerts for cross-module anomaly surfacing

CREATE TABLE IF NOT EXISTS operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  source_modules text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_facility ON operational_alerts(facility_id);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_acknowledged ON operational_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_operational_alerts_created ON operational_alerts(created_at DESC);
