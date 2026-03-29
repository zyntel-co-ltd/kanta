-- Phase 1: RBAC — facility_users links users to facilities with roles
-- Uses Supabase auth.users; user_id = auth.uid() when auth is enabled

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'facility_role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.facility_role AS ENUM (
      'admin',
      'manager',
      'technician',
      'viewer',
      'reception'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS facility_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role facility_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(facility_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_facility_users_facility ON facility_users(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_users_user ON facility_users(user_id);
