-- Kanta — Mazra Hospital demo seed
-- Run this in the Supabase SQL editor (Kanta project).
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING / DO UPDATE throughout.
-- Populates: hospital, departments, equipment, maintenance_schedule, technicians,
--            refrigerator_units, qc_materials, tat_targets, facility_settings,
--            facility_capability_profile, lims_connections, facility_flags.
--
-- Historical time-series data (scan_events, qc_results, temp_readings) is generated
-- by the kanta-tick Edge Function — run it manually once to backfill if needed,
-- or let it accumulate naturally.
--
-- After running: deploy supabase/functions/kanta-tick and schedule every 60 minutes.

-- ── Hospital ─────────────────────────────────────────────────────────────────
INSERT INTO public.hospitals (id, name, country, city, tier, created_at)
VALUES (
  '11111111-1111-4111-a111-111111111111',
  'Mazra Hospital',
  'Uganda',
  'Kampala',
  'pro',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name    = EXCLUDED.name,
  country = EXCLUDED.country,
  city    = EXCLUDED.city,
  tier    = EXCLUDED.tier;

-- ── Departments (facility_id — canonical column in Kanta; hospital_id may not exist) ──
INSERT INTO public.departments (id, facility_id, name, created_at)
VALUES
  ('22220001-0000-4000-a000-000000000001', '11111111-1111-4111-a111-111111111111', 'Laboratory', now()),
  ('22220002-0000-4000-a000-000000000002', '11111111-1111-4111-a111-111111111111', 'Biomedical Engineering', now())
ON CONFLICT (id) DO NOTHING;

-- ── Equipment ─────────────────────────────────────────────────────────────────
INSERT INTO public.equipment (
  id, hospital_id, facility_id, department_id, name, model, serial_number,
  manufacturer, qr_code, category, status, location,
  next_maintenance_at, updated_at, created_at
) VALUES
  ('33330001-0000-4000-a000-000000000001','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','SYSMEX XP-300 Haematology Analyser','XP-300','eq-01','Sysmex','MAZRA-EQ-01','A','operational','Main Laboratory',now() + interval '12 days',now(),now()),
  ('33330002-0000-4000-a000-000000000002','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','HUMA Star 180 Chemistry Analyser','Star 180','eq-02','Human','MAZRA-EQ-02','A','operational','Main Laboratory',now() + interval '18 days',now(),now()),
  ('33330003-0000-4000-a000-000000000003','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','HUMA Star 300 Chemistry Analyser (BU)','Star 300','eq-03','Human','MAZRA-EQ-03','A','operational','Main Laboratory',now() + interval '5 days',now(),now()),
  ('33330004-0000-4000-a000-000000000004','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','GeneXpert IV (4-module)','GX-IV','eq-04','Cepheid','MAZRA-EQ-04','A','operational','Main Laboratory',now() + interval '45 days',now(),now()),
  ('33330005-0000-4000-a000-000000000005','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Binocular Microscope (Haem)','CX23','eq-05','Olympus','MAZRA-EQ-05','B','operational','Main Laboratory',now() + interval '60 days',now(),now()),
  ('33330006-0000-4000-a000-000000000006','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Binocular Microscope (Micro)','CX23','eq-06','Olympus','MAZRA-EQ-06','B','operational','Main Laboratory',now() + interval '30 days',now(),now()),
  ('33330007-0000-4000-a000-000000000007','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','CO2 Incubator','Galaxy 170R','eq-07','Eppendorf','MAZRA-EQ-07','B','operational','Main Laboratory',now() + interval '70 days',now(),now()),
  ('33330008-0000-4000-a000-000000000008','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Autoclave (50L)','SX-700','eq-08','Tomy','MAZRA-EQ-08','B','operational','Main Laboratory',now() + interval '22 days',now(),now()),
  ('33330009-0000-4000-a000-000000000009','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Centrifuge (24-slot)','5810R','eq-09','Eppendorf','MAZRA-EQ-09','B','operational','Main Laboratory',now() + interval '35 days',now(),now()),
  ('33330010-0000-4000-a000-000000000010','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Centrifuge (12-slot)','5424','eq-10','Eppendorf','MAZRA-EQ-10','B','operational','Main Laboratory',now() + interval '50 days',now(),now()),
  ('33330011-0000-4000-a000-000000000011','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Biosafety Cabinet Class II','Safe 2020','eq-11','Thermo','MAZRA-EQ-11','A','operational','Main Laboratory',now() + interval '15 days',now(),now()),
  ('33330012-0000-4000-a000-000000000012','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','BD FACSCount (CD4 Analyser)','FACSCount','eq-12','BD','MAZRA-EQ-12','A','operational','Main Laboratory',now() + interval '8 days',now(),now()),
  ('33330013-0000-4000-a000-000000000013','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','RPR Rotator','RS12','eq-13','Stuart','MAZRA-EQ-13','C','operational','Main Laboratory',now() + interval '90 days',now(),now()),
  ('33330014-0000-4000-a000-000000000014','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Water Bath (37°C)','WB-200','eq-14','Memmert','MAZRA-EQ-14','C','operational','Main Laboratory',now() + interval '55 days',now(),now()),
  ('33330015-0000-4000-a000-000000000015','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Urine Analyser (strip reader)','Clinitek','eq-15','Siemens','MAZRA-EQ-15','B','operational','Main Laboratory',now() + interval '40 days',now(),now()),
  ('33330016-0000-4000-a000-000000000016','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Haematocrit Centrifuge','Z300','eq-16','Hermle','MAZRA-EQ-16','C','operational','Main Laboratory',now() + interval '80 days',now(),now()),
  ('33330017-0000-4000-a000-000000000017','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Label Printer (barcode)','ZD420','eq-17','Zebra','MAZRA-EQ-17','C','operational','Main Laboratory',now() + interval '105 days',now(),now()),
  ('33330018-0000-4000-a000-000000000018','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Tube Roller Mixer','StuartRoller','eq-18','Stuart','MAZRA-EQ-18','C','operational','Main Laboratory',now() + interval '60 days',now(),now()),
  -- Fridges as equipment rows (for scan_events)
  ('44440001-0000-4000-a000-000000000001','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Blood Bank Fridge','LF-140','fridge-01','Vestfrost','MAZRA-FRIDGE-01','A','operational','Blood Bank section',now() + interval '60 days',now(),now()),
  ('44440002-0000-4000-a000-000000000002','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Reagent Fridge A','LF-140','fridge-02','Vestfrost','MAZRA-FRIDGE-02','A','operational','Chemistry / Haem',now() + interval '60 days',now(),now()),
  ('44440003-0000-4000-a000-000000000003','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Reagent Fridge B','LF-140','fridge-03','Vestfrost','MAZRA-FRIDGE-03','A','operational','Serology section',now() + interval '60 days',now(),now()),
  ('44440004-0000-4000-a000-000000000004','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Sample Storage Fridge','LF-140','fridge-04','Vestfrost','MAZRA-FRIDGE-04','A','operational','Microbiology section',now() + interval '60 days',now(),now())
ON CONFLICT (id) DO NOTHING;

-- ── Maintenance schedule ──────────────────────────────────────────────────────
INSERT INTO public.maintenance_schedule (equipment_id, facility_id, interval_days, last_maintained_at, next_due_at, notes)
SELECT e.id, '11111111-1111-4111-a111-111111111111',
  CASE e.category WHEN 'A' THEN 30 WHEN 'B' THEN 90 ELSE 180 END,
  now() - interval '15 days',
  CASE e.category WHEN 'A' THEN now() + interval '15 days' WHEN 'B' THEN now() + interval '75 days' ELSE now() + interval '165 days' END,
  'Category ' || e.category || ' preventive maintenance schedule'
FROM public.equipment e
WHERE e.facility_id = '11111111-1111-4111-a111-111111111111'
ON CONFLICT (equipment_id) DO NOTHING;

-- ── Refrigerator units ────────────────────────────────────────────────────────
INSERT INTO public.refrigerator_units (id, facility_id, name, location, min_temp_celsius, max_temp_celsius, is_active, created_at)
VALUES
  ('44440001-0000-4000-a000-000000000001','11111111-1111-4111-a111-111111111111','Blood Bank Fridge','Blood Bank section',2,6,true,now()),
  ('44440002-0000-4000-a000-000000000002','11111111-1111-4111-a111-111111111111','Reagent Fridge A','Chemistry / Haem',2,8,true,now()),
  ('44440003-0000-4000-a000-000000000003','11111111-1111-4111-a111-111111111111','Reagent Fridge B','Serology section',2,8,true,now()),
  ('44440004-0000-4000-a000-000000000004','11111111-1111-4111-a111-111111111111','Sample Storage Fridge','Microbiology section',4,8,true,now())
ON CONFLICT (id) DO NOTHING;

-- ── Technicians ───────────────────────────────────────────────────────────────
INSERT INTO public.technicians (id, hospital_id, facility_id, department_id, name, avatar_initials, on_duty, shift_start, created_at)
VALUES
  ('66660001-0000-4000-a000-000000000001','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Okwi Emmanuel','OE',true,'08:00',now()),
  ('66660002-0000-4000-a000-000000000002','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Atim Grace','AG',true,'08:00',now()),
  ('66660003-0000-4000-a000-000000000003','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Opio David','OD',true,'08:00',now()),
  ('66660004-0000-4000-a000-000000000004','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Apio Faith','AF',false,'20:00',now()),
  ('66660005-0000-4000-a000-000000000005','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Omara Isaac','OI',false,'20:00',now()),
  ('66660006-0000-4000-a000-000000000006','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220002-0000-4000-a000-000000000002','Musiime Robert','MR',true,'08:00',now()),
  ('66660007-0000-4000-a000-000000000007','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Nakato Sarah','NS',true,'08:00',now()),
  ('66660008-0000-4000-a000-000000000008','11111111-1111-4111-a111-111111111111','11111111-1111-4111-a111-111111111111','22220001-0000-4000-a000-000000000001','Otim Charles','OC',true,'08:00',now())
ON CONFLICT (id) DO NOTHING;

-- ── QC materials ──────────────────────────────────────────────────────────────
INSERT INTO public.qc_materials (id, facility_id, name, lot_number, level, analyte, target_mean, target_sd, units, expires_at, is_active, created_at)
VALUES
  ('55550001-0000-4000-a000-000000000001','11111111-1111-4111-a111-111111111111','Haematology Control Level 1','LOT-HAE-2026-01',1,'Haemoglobin',12.5,0.4,'g/dL',(now()+interval '1 year')::date,true,now()),
  ('55550002-0000-4000-a000-000000000002','11111111-1111-4111-a111-111111111111','Haematology Control Level 2','LOT-HAE-2026-02',2,'Haemoglobin',16.2,0.5,'g/dL',(now()+interval '1 year')::date,true,now()),
  ('55550003-0000-4000-a000-000000000003','11111111-1111-4111-a111-111111111111','Chemistry Control (Glucose)','LOT-CHEM-2026-01',1,'Glucose',5.5,0.3,'mmol/L',(now()+interval '1 year')::date,true,now()),
  ('55550004-0000-4000-a000-000000000004','11111111-1111-4111-a111-111111111111','Chemistry Control (Creatinine)','LOT-CHEM-2026-02',1,'Creatinine',88.0,5.0,'µmol/L',(now()+interval '1 year')::date,true,now()),
  ('55550005-0000-4000-a000-000000000005','11111111-1111-4111-a111-111111111111','Malaria QC Positive Control','LOT-MAL-2026-01',1,'MalariaRDT',1.0,0.0,'qualitative',(now()+interval '1 year')::date,true,now()),
  ('55550006-0000-4000-a000-000000000006','11111111-1111-4111-a111-111111111111','CD4 Control','LOT-CD4-2026-01',1,'CD4',450,25,'cells/µL',(now()+interval '1 year')::date,true,now())
ON CONFLICT (id) DO NOTHING;

-- ── TAT targets ───────────────────────────────────────────────────────────────
INSERT INTO public.tat_targets (facility_id, section, test_name, target_minutes)
SELECT '11111111-1111-4111-a111-111111111111', section, test_name, target_minutes
FROM (VALUES
  ('Haematology', null::text, 30),
  ('Chemistry',   null,       60),
  ('Microbiology',null,       1440),
  ('Serology',    null,       60),
  ('Blood Bank',  null,       90),
  ('Haematology', 'Malaria RDT', 15),
  ('Haematology', 'Malaria Microscopy (thick/thin film)', 45),
  ('Chemistry',   'Random Blood Sugar (RBS)', 20),
  ('Microbiology','GeneXpert (TB)', 120),
  ('Serology',    'HIV Rapid Test', 20)
) AS t(section, test_name, target_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tat_targets tt
  WHERE tt.facility_id = '11111111-1111-4111-a111-111111111111'
    AND tt.section = t.section
    AND (tt.test_name IS NOT DISTINCT FROM t.test_name)
);

-- ── Facility settings ─────────────────────────────────────────────────────────
INSERT INTO public.facility_settings (facility_id, pipeline_type, pipeline_config)
VALUES (
  '11111111-1111-4111-a111-111111111111',
  'postgres',
  '{"description": "Direct PostgreSQL connection to Mazra General Hospital LIMS, Kampala, Uganda"}'::jsonb
)
ON CONFLICT (facility_id) DO UPDATE SET
  pipeline_type   = EXCLUDED.pipeline_type,
  pipeline_config = EXCLUDED.pipeline_config;

-- ── Facility capability profile ───────────────────────────────────────────────
INSERT INTO public.facility_capability_profile (facility_id, lab_sections, test_name_mappings, lab_number_retention_days)
VALUES (
  '11111111-1111-4111-a111-111111111111',
  ARRAY['Haematology','Chemistry','Microbiology','Serology','Blood Bank'],
  '[]'::jsonb,
  90
)
ON CONFLICT (facility_id) DO NOTHING;

-- ── LIMS connection (Mazra General Hospital) ──────────────────────────────────
-- Set connection_config.url to the Mazra Supabase Postgres URL after deploying.
-- Format: postgresql://postgres.[ref]:[password]@aws-0-af-south-1.pooler.supabase.com:6543/postgres
INSERT INTO public.lims_connections (
  id, facility_id, connector_type, connection_config, query_config, is_active
) VALUES (
  '77770001-0000-4000-a000-000000000001',
  '11111111-1111-4111-a111-111111111111',
  'postgresql',
  '{"note": "Mazra Hospital, Kampala — LIMS Supabase. Paste Postgres URL here.", "placeholder": true}'::jsonb,
  '{
    "sync_query": "SELECT to2.id AS lims_external_id, to2.patient_id::text AS patient_id, to2.id::text AS lab_number, tc.test_name, ls.name AS section, to2.ordered_at AS requested_at, to2.priority, COALESCE(tr.status, ''pending'') AS status, tr.resulted_at, tc.price_ugx::numeric AS price_ugx FROM test_orders to2 LEFT JOIN test_catalog tc ON to2.test_id = tc.id LEFT JOIN lab_sections ls ON to2.section_id = ls.id LEFT JOIN test_results tr ON to2.id = tr.order_id WHERE to2.ordered_at > NOW() - INTERVAL ''7 days'' ORDER BY to2.ordered_at DESC LIMIT 500",
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
    "dedupe_on": ["facility_id", "lims_connection_id", "lims_external_id"],
    "sync_window_days": 7,
    "batch_size": 200
  }'::jsonb,
  false
)
ON CONFLICT (id) DO UPDATE SET
  query_config = EXCLUDED.query_config;

-- ── Facility flags (enable all modules for demo) ──────────────────────────────
INSERT INTO public.facility_flags (facility_id, flag_name, is_enabled, created_at)
VALUES
  ('11111111-1111-4111-a111-111111111111', 'show-data-bridge',         true, now()),
  ('11111111-1111-4111-a111-111111111111', 'show-tat-patient-level',   true, now()),
  ('11111111-1111-4111-a111-111111111111', 'show-tat-test-level',      true, now()),
  ('11111111-1111-4111-a111-111111111111', 'show-refrigerator-module', true, now()),
  ('11111111-1111-4111-a111-111111111111', 'show-qc-module',           true, now())
ON CONFLICT (facility_id, flag_name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled;

-- ── Two open demo alerts ──────────────────────────────────────────────────────
INSERT INTO public.operational_alerts (
  facility_id, alert_type, title, description, severity, source_modules, metadata, created_at
) VALUES
  (
    '11111111-1111-4111-a111-111111111111',
    'maintenance_due',
    'Scheduled PM due: GeneXpert IV',
    'GeneXpert IV (4-module) is 2 days past scheduled maintenance. Contact biomedical engineering.',
    'warning',
    '["equipment"]'::jsonb,
    '{"equipment_id": "33330004-0000-4000-a000-000000000004", "overdue_days": 2}'::jsonb,
    now() - interval '2 days'
  ),
  (
    '11111111-1111-4111-a111-111111111111',
    'qc_out_of_control',
    'QC Out of Control: Chemistry Level 1',
    'Glucose control exceeded 2SD (1-2s rule). Review calibration before releasing patient results.',
    'critical',
    '["qc"]'::jsonb,
    '{"material_id": "55550003-0000-4000-a000-000000000003"}'::jsonb,
    now() - interval '1 day'
  )
ON CONFLICT DO NOTHING;
