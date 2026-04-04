-- ENG-161: Per-facility feature flags in Supabase (replaces PostHog for flag evaluation).

CREATE TABLE facility_flags (
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  flag_key    text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid,
  PRIMARY KEY (facility_id, flag_key)
);

CREATE INDEX idx_facility_flags_facility ON facility_flags(facility_id);

ALTER TABLE facility_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facility_flags_read" ON facility_flags
  FOR SELECT TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

COMMENT ON TABLE facility_flags IS 'ENG-161: Kanta module toggles per hospital; Console API writes via service role.';

-- Seed: all catalog flags enabled for existing hospitals (idempotent).
INSERT INTO facility_flags (facility_id, flag_key, enabled)
SELECT h.id, f.key, true
FROM hospitals h
CROSS JOIN (
  VALUES
    ('show-ai-intelligence'),
    ('show-lrids'),
    ('show-reception-tab'),
    ('show-refrigerator-module'),
    ('show-sample-scan'),
    ('show-tat-patient-level'),
    ('show-tat-test-level'),
    ('show-unmatched-tests')
) AS f(key)
ON CONFLICT (facility_id, flag_key) DO NOTHING;
