-- Bootstrap core tables for empty databases so later migrations (e.g. 20250321000001)
-- can ALTER them. Mirrors supabase/schema.sql — keep in sync when editing schema.sql.

create extension if not exists "pgcrypto";

create table if not exists hospitals (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  country     text not null default 'Uganda',
  city        text,
  tier        text not null default 'free' check (tier in ('free','starter','pro','enterprise')),
  created_at  timestamptz not null default now()
);

create table if not exists departments (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references hospitals(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_departments_facility on departments(facility_id);

create table if not exists equipment (
  id                   uuid primary key default gen_random_uuid(),
  facility_id          uuid not null references hospitals(id) on delete cascade,
  department_id        uuid references departments(id) on delete set null,
  name                 text not null,
  model                text,
  serial_number        text,
  qr_code              text unique not null,
  category             text not null default 'Other'
                         check (category in ('Diagnostic','Surgical','Monitoring','Life Support','Other')),
  status               text not null default 'operational'
                         check (status in ('operational','maintenance','offline','retired')),
  location             text,
  last_scanned_at      timestamptz,
  last_scanned_by      text,
  next_maintenance_at  timestamptz,
  updated_at           timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

create index if not exists idx_equipment_facility   on equipment(facility_id);
create index if not exists idx_equipment_department on equipment(department_id);
create index if not exists idx_equipment_status     on equipment(status);
create index if not exists idx_equipment_qr         on equipment(qr_code);

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists equipment_updated_at on equipment;
create trigger equipment_updated_at
  before update on equipment
  for each row execute function update_updated_at();

create table if not exists scan_events (
  id               uuid primary key default gen_random_uuid(),
  facility_id      uuid not null references hospitals(id) on delete cascade,
  equipment_id     uuid not null references equipment(id) on delete cascade,
  scanned_by       text not null,
  status_at_scan   text not null check (status_at_scan in ('operational','maintenance','offline','retired')),
  location         text,
  notes            text,
  synced           boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists idx_scans_facility   on scan_events(facility_id);
create index if not exists idx_scans_equipment  on scan_events(equipment_id);
create index if not exists idx_scans_created_at on scan_events(created_at desc);

create table if not exists technicians (
  id               uuid primary key default gen_random_uuid(),
  facility_id      uuid not null references hospitals(id) on delete cascade,
  department_id    uuid references departments(id) on delete set null,
  name             text not null,
  avatar_initials  text not null,
  on_duty          boolean not null default false,
  shift_start      text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_technicians_facility    on technicians(facility_id);
create index if not exists idx_technicians_department  on technicians(department_id);

create table if not exists equipment_snapshots (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references hospitals(id) on delete cascade,
  equipment_id  uuid not null references equipment(id) on delete cascade,
  status        text not null,
  snapshot_date timestamptz not null default now()
);

create index if not exists idx_snapshots_facility on equipment_snapshots(facility_id);
create index if not exists idx_snapshots_date     on equipment_snapshots(snapshot_date desc);

create table if not exists plan_config (
  tier          text primary key check (tier in ('free','starter','pro','enterprise')),
  equipment_limit int not null default 5,
  history_days   int not null default 1,
  api_calls_per_day int not null default 0,
  features       jsonb default '{}'
);

insert into plan_config (tier, equipment_limit, history_days, api_calls_per_day, features)
values
  ('free',      5,   1,    0, '{}'),
  ('starter',  50,  90, 5000, '{"api_access": true}'::jsonb),
  ('pro',      200, 365, 50000, '{"api_access": true, "webhooks": true}'::jsonb),
  ('enterprise', -1, -1, -1, '{"api_access": true, "webhooks": true, "custom_integrations": true}'::jsonb)
on conflict (tier) do nothing;

alter table hospitals         enable row level security;
alter table departments       enable row level security;
alter table equipment         enable row level security;
alter table scan_events       enable row level security;
alter table technicians       enable row level security;
alter table equipment_snapshots enable row level security;

drop policy if exists "dev_allow_all_hospitals"          on hospitals;
drop policy if exists "dev_allow_all_departments"        on departments;
drop policy if exists "dev_allow_all_equipment"          on equipment;
drop policy if exists "dev_allow_all_scans"              on scan_events;
drop policy if exists "dev_allow_all_technicians"        on technicians;
drop policy if exists "dev_allow_all_snapshots"          on equipment_snapshots;

create policy "dev_allow_all_hospitals"          on hospitals         for all using (true) with check (true);
create policy "dev_allow_all_departments"        on departments       for all using (true) with check (true);
create policy "dev_allow_all_equipment"          on equipment         for all using (true) with check (true);
create policy "dev_allow_all_scans"              on scan_events       for all using (true) with check (true);
create policy "dev_allow_all_technicians"        on technicians       for all using (true) with check (true);
create policy "dev_allow_all_snapshots"          on equipment_snapshots for all using (true) with check (true);

insert into hospitals (id, name, country, city, tier)
values ('00000000-0000-0000-0000-000000000001', 'Mulago National Referral Hospital', 'Uganda', 'Kampala', 'starter')
on conflict (id) do nothing;

insert into departments (id, facility_id, name)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'ICU'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Theatre'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Maternity'),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Casualty'),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Paediatrics'),
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'Emergency'),
  ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'Outpatient'),
  ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'Radiology'),
  ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'Laboratory'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Pharmacy'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Surgery'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Cardiology'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'Orthopaedics'),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'Anaesthesia'),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'Neonatology'),
  ('00000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', 'Oncology'),
  ('00000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', 'Dialysis'),
  ('00000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', 'Physiotherapy'),
  ('00000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', 'Psychiatry'),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'General Medicine'),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Ward')
on conflict (id) do nothing;
