-- ============================================================
-- Kanta — Supabase PostgreSQL Schema
-- Paste this into: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Hospitals ────────────────────────────────────────────────
create table if not exists hospitals (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  country     text not null default 'Uganda',
  city        text,
  tier        text not null default 'free' check (tier in ('free','starter','pro','enterprise')),
  created_at  timestamptz not null default now()
);

-- ── Departments ──────────────────────────────────────────────
create table if not exists departments (
  id          uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_departments_hospital on departments(hospital_id);

-- ── Equipment ────────────────────────────────────────────────
create table if not exists equipment (
  id                   uuid primary key default gen_random_uuid(),
  hospital_id          uuid not null references hospitals(id) on delete cascade,
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

create index if not exists idx_equipment_hospital   on equipment(hospital_id);
create index if not exists idx_equipment_department on equipment(department_id);
create index if not exists idx_equipment_status     on equipment(status);
create index if not exists idx_equipment_qr         on equipment(qr_code);

-- Auto-update updated_at
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

-- ── Scan Events ──────────────────────────────────────────────
create table if not exists scan_events (
  id               uuid primary key default gen_random_uuid(),
  hospital_id      uuid not null references hospitals(id) on delete cascade,
  equipment_id     uuid not null references equipment(id) on delete cascade,
  scanned_by       text not null,
  status_at_scan   text not null check (status_at_scan in ('operational','maintenance','offline','retired')),
  location         text,
  notes            text,
  synced           boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists idx_scans_hospital   on scan_events(hospital_id);
create index if not exists idx_scans_equipment  on scan_events(equipment_id);
create index if not exists idx_scans_created_at on scan_events(created_at desc);

-- ── Technicians ──────────────────────────────────────────────
create table if not exists technicians (
  id               uuid primary key default gen_random_uuid(),
  hospital_id      uuid not null references hospitals(id) on delete cascade,
  department_id    uuid references departments(id) on delete set null,
  name             text not null,
  avatar_initials  text not null,
  on_duty          boolean not null default false,
  shift_start      text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_technicians_hospital    on technicians(hospital_id);
create index if not exists idx_technicians_department  on technicians(department_id);

-- ── Equipment Snapshots (for monthly status charts) ──────────
create table if not exists equipment_snapshots (
  id            uuid primary key default gen_random_uuid(),
  hospital_id   uuid not null references hospitals(id) on delete cascade,
  equipment_id  uuid not null references equipment(id) on delete cascade,
  status        text not null,
  snapshot_date timestamptz not null default now()
);

create index if not exists idx_snapshots_hospital on equipment_snapshots(hospital_id);
create index if not exists idx_snapshots_date     on equipment_snapshots(snapshot_date desc);

-- ── Row Level Security ───────────────────────────────────────
-- Enable RLS on all tables (auth integration added in next phase)
alter table hospitals         enable row level security;
alter table departments       enable row level security;
alter table equipment         enable row level security;
alter table scan_events       enable row level security;
alter table technicians       enable row level security;
alter table equipment_snapshots enable row level security;

-- Temporary open policy for development (replace with auth-based policies)
create policy "dev_allow_all_hospitals"          on hospitals         for all using (true) with check (true);
create policy "dev_allow_all_departments"        on departments       for all using (true) with check (true);
create policy "dev_allow_all_equipment"          on equipment         for all using (true) with check (true);
create policy "dev_allow_all_scans"              on scan_events       for all using (true) with check (true);
create policy "dev_allow_all_technicians"        on technicians       for all using (true) with check (true);
create policy "dev_allow_all_snapshots"          on equipment_snapshots for all using (true) with check (true);

-- ── Seed: Demo hospital ──────────────────────────────────────
insert into hospitals (id, name, country, city, tier)
values ('00000000-0000-0000-0000-000000000001', 'Mulago National Referral Hospital', 'Uganda', 'Kampala', 'starter')
on conflict (id) do nothing;
