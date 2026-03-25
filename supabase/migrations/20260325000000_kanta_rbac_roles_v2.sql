-- Kanta RBAC v2: new facility roles, platform super-admins, facility invites

-- ── 1) Migrate facility_role enum (old → new labels) ───────────────────────
ALTER TABLE facility_users ALTER COLUMN role DROP DEFAULT;

ALTER TABLE facility_users ADD COLUMN IF NOT EXISTS role_new text;

UPDATE facility_users SET role_new = CASE role::text
  WHEN 'admin' THEN 'facility_admin'
  WHEN 'manager' THEN 'lab_manager'
  WHEN 'technician' THEN 'lab_technician'
  WHEN 'viewer' THEN 'viewer'
  WHEN 'reception' THEN 'lab_technician'
  ELSE 'viewer'
END;

ALTER TABLE facility_users DROP COLUMN role;
DROP TYPE facility_role;

CREATE TYPE facility_role AS ENUM (
  'facility_admin',
  'lab_manager',
  'lab_technician',
  'viewer'
);

ALTER TABLE facility_users RENAME COLUMN role_new TO role;
ALTER TABLE facility_users
  ALTER COLUMN role TYPE facility_role USING role::facility_role;
ALTER TABLE facility_users ALTER COLUMN role SET NOT NULL;
ALTER TABLE facility_users ALTER COLUMN role SET DEFAULT 'viewer'::facility_role;

-- ── 2) Platform super-admins (cross-facility) ─────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON platform_admins(user_id);

-- ── 3) Facility invites ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facility_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  email text NOT NULL,
  role facility_role NOT NULL DEFAULT 'lab_technician',
  token text NOT NULL UNIQUE,
  invited_by uuid,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_invites_facility ON facility_invites(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_invites_email ON facility_invites(lower(email));
