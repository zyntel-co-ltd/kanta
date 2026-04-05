-- =============================================================================
-- Run in Supabase SQL Editor (Kanta) BEFORE wiping public / resetting DB.
-- Copy the "restore_sql" column values into a file — run that file AFTER `db push`.
--
-- Preserves:
--   • platform_admins — platform super-admins (cross-facility)
--   • facility_users — per-hospital roles (facility_admin, lab_manager, …)
--
-- auth.users (passwords / emails) is in schema "auth". A reset that only rebuilds
-- "public" usually leaves auth alone — confirm in your Supabase plan / reset UI.
-- If auth is wiped, users must sign up again or use Auth admin to recreate users;
-- keep the UUIDs below if you recreate users with the same ids.
-- =============================================================================

SELECT 'INSERT INTO public.platform_admins (user_id, created_at) VALUES ('
  || quote_literal(user_id::text)
  || '::uuid, '
  || quote_literal(created_at::text)
  || '::timestamptz) ON CONFLICT (user_id) DO NOTHING;'
  AS restore_sql
FROM public.platform_admins
ORDER BY created_at;

SELECT 'INSERT INTO public.facility_users (id, facility_id, user_id, role, created_at, updated_at) VALUES ('
  || quote_literal(id::text)
  || '::uuid, '
  || quote_literal(facility_id::text)
  || '::uuid, '
  || quote_literal(user_id::text)
  || '::uuid, '
  || quote_literal(role::text)
  || '::public.facility_role, '
  || quote_literal(created_at::text)
  || '::timestamptz, '
  || quote_literal(updated_at::text)
  || '::timestamptz) ON CONFLICT (facility_id, user_id) DO UPDATE SET '
  || 'role = EXCLUDED.role, updated_at = EXCLUDED.updated_at;'
  AS restore_sql
FROM public.facility_users
ORDER BY created_at;

-- If you use avatar_url on facility_users, add a separate UPDATE after restore, e.g.:
-- UPDATE public.facility_users SET avatar_url = '...' WHERE user_id = '...'::uuid;
