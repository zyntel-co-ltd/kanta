-- ENG-187: Seed `show-qc-module` and `show-data-bridge` in facility_flags from hospital tier.
-- Does not overwrite existing rows (manual Console toggles preserved).

INSERT INTO facility_flags (facility_id, flag_key, enabled)
SELECT h.id, 'show-qc-module',
  CASE
    WHEN LOWER(COALESCE(h.tier, 'free')) IN ('pro', 'professional', 'enterprise') THEN true
    ELSE false
  END
FROM hospitals h
ON CONFLICT (facility_id, flag_key) DO NOTHING;

INSERT INTO facility_flags (facility_id, flag_key, enabled)
SELECT h.id, 'show-data-bridge',
  CASE
    WHEN LOWER(COALESCE(h.tier, 'free')) = 'enterprise' THEN true
    ELSE false
  END
FROM hospitals h
ON CONFLICT (facility_id, flag_key) DO NOTHING;
