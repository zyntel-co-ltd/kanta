-- ENG: Mazra General Hospital LIMS connection seed
-- Seeds the lims_connections record for Mazra's PostgreSQL LIMS.
-- Kanta treats Mazra identically to any other hospital running a real LIMS.
--
-- The query_config JSON documents the exact SQL mapping that Kanta's
-- data bridge uses to sync test_orders + test_results from Mazra into
-- Kanta's test_requests table.
--
-- Run AFTER seed-kanta-mazra.ts has inserted the hospitals and lims_connections
-- records (this migration only updates the query_config to the canonical version).

-- Upsert canonical lims_connections record for Mazra
INSERT INTO public.lims_connections (
  id,
  facility_id,
  connector_type,
  connection_config,
  query_config,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '77770001-0000-4000-a000-000000000001',
  '11111111-1111-4111-a111-111111111111', -- Mazra General Hospital
  'postgresql',
  -- connection_config: set MAZRA_LIMS_DB_URL env var; bridge reads this at sync time
  '{"note": "Mazra General Hospital Supabase LIMS — set actual URL in env MAZRA_LIMS_DB_URL", "placeholder": true}'::jsonb,
  -- query_config: canonical mapping from Mazra LIMS schema to Kanta test_requests
  '{
    "sync_query": "SELECT to.id                          AS lims_external_id, to.patient_id::text         AS patient_id, to.id::text                  AS lab_number, tc.test_name                 AS test_name, ls.name                      AS section, to.ordered_at                AS requested_at, to.priority                  AS priority, COALESCE(tr.status, ''pending'') AS status, tr.resulted_at               AS resulted_at, to.section_id::text          AS section_id, tc.price_ugx::numeric        AS price_ugx FROM test_orders to LEFT JOIN test_catalog tc ON to.test_id = tc.id LEFT JOIN lab_sections ls ON to.section_id = ls.id LEFT JOIN test_results tr ON to.id = tr.order_id WHERE to.ordered_at > NOW() - INTERVAL ''7 days'' ORDER BY to.ordered_at DESC LIMIT 500",
    "lims_external_id_column": "lims_external_id",
    "patient_id_column": "patient_id",
    "lab_number_column": "lab_number",
    "test_name_column": "test_name",
    "section_column": "section",
    "requested_at_column": "requested_at",
    "priority_column": "priority",
    "status_column": "status",
    "resulted_at_column": "resulted_at",
    "price_ugx_column": "price_ugx",
    "status_map": {
      "pending": "pending",
      "resulted": "resulted",
      "verified": "resulted",
      "amended": "resulted",
      "cancelled": "cancelled"
    },
    "priority_map": {
      "routine": "routine",
      "urgent": "urgent",
      "stat": "stat"
    },
    "section_map": {
      "Haematology": "Haematology",
      "Chemistry": "Chemistry",
      "Microbiology": "Microbiology",
      "Serology": "Serology",
      "Blood Bank": "Blood Bank"
    },
    "dedupe_on": ["facility_id", "lims_connection_id", "lims_external_id"],
    "sync_window_days": 7,
    "batch_size": 200
  }'::jsonb,
  false, -- set to true after MAZRA_LIMS_DB_URL is configured
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  query_config = EXCLUDED.query_config,
  updated_at   = now();

-- Insert a reference lims_sync_log entry to show expected schema usage
COMMENT ON TABLE public.lims_connections IS
'Each row represents a LIMS database that Kanta can sync test_requests from.
Mazra General Hospital record: id = 77770001-0000-4000-a000-000000000001.
The sync_query in query_config runs against the Mazra Supabase PostgreSQL instance.
Set connection_config.url to the Mazra Postgres connection string before setting is_active = true.';

-- Ensure facility_flags enable the data bridge for Mazra hospital
INSERT INTO public.facility_flags (facility_id, flag_name, is_enabled, created_at)
VALUES
  ('11111111-1111-4111-a111-111111111111', 'show-data-bridge',          true, now()),
  ('11111111-1111-4111-a111-111111111111', 'show-tat-patient-level',    true, now()),
  ('11111111-1111-4111-a111-111111111111', 'show-tat-test-level',       true, now()),
  ('11111111-1111-4111-a111-111111111111', 'show-refrigerator-module',  true, now()),
  ('11111111-1111-4111-a111-111111111111', 'show-qc-module',            true, now())
ON CONFLICT (facility_id, flag_name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();
