-- ENG-154: RLS on 6 tables, facility_invites.token column hardening, function search_path.
-- Idempotent: safe to run more than once.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) Drop existing policies (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "login_audit_facility_read" ON public.login_audit;
DROP POLICY IF EXISTS "qc_results_facility_scoped" ON public.qc_results;
DROP POLICY IF EXISTS "platform_admins_self_read" ON public.platform_admins;

DROP POLICY IF EXISTS "facility_invites_admin_read" ON public.facility_invites;
DROP POLICY IF EXISTS "facility_invites_admin_write" ON public.facility_invites;
DROP POLICY IF EXISTS "facility_invites_admin_update" ON public.facility_invites;
DROP POLICY IF EXISTS "facility_invites_admin_delete" ON public.facility_invites;

DROP POLICY IF EXISTS "lab_sections_facility_read" ON public.lab_sections;
DROP POLICY IF EXISTS "lab_sections_facility_write" ON public.lab_sections;
DROP POLICY IF EXISTS "lab_sections_facility_update" ON public.lab_sections;
DROP POLICY IF EXISTS "lab_sections_facility_delete" ON public.lab_sections;

DROP POLICY IF EXISTS "lab_shifts_facility_read" ON public.lab_shifts;
DROP POLICY IF EXISTS "lab_shifts_facility_write" ON public.lab_shifts;
DROP POLICY IF EXISTS "lab_shifts_facility_update" ON public.lab_shifts;
DROP POLICY IF EXISTS "lab_shifts_facility_delete" ON public.lab_shifts;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.login_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_shifts ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) Policies — login_audit (read for facility_admin / lab_manager; NULL facility)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "login_audit_facility_read"
  ON public.login_audit FOR SELECT TO authenticated
  USING (
    (
      facility_id IN (
        SELECT fu.facility_id FROM public.facility_users fu
        WHERE fu.user_id = auth.uid()
          AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
      )
    )
    OR facility_id IS NULL
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) qc_results — facility members
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "qc_results_facility_scoped"
  ON public.qc_results FOR ALL TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 5) platform_admins — self read only
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "platform_admins_self_read"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 6) facility_invites — facility_admin
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "facility_invites_admin_read"
  ON public.facility_invites FOR SELECT TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid() AND fu.role = 'facility_admin'::public.facility_role
    )
  );

CREATE POLICY "facility_invites_admin_write"
  ON public.facility_invites FOR INSERT TO authenticated
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid() AND fu.role = 'facility_admin'::public.facility_role
    )
  );

CREATE POLICY "facility_invites_admin_update"
  ON public.facility_invites FOR UPDATE TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid() AND fu.role = 'facility_admin'::public.facility_role
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid() AND fu.role = 'facility_admin'::public.facility_role
    )
  );

CREATE POLICY "facility_invites_admin_delete"
  ON public.facility_invites FOR DELETE TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid() AND fu.role = 'facility_admin'::public.facility_role
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 7) lab_sections
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "lab_sections_facility_read"
  ON public.lab_sections FOR SELECT TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

CREATE POLICY "lab_sections_facility_write"
  ON public.lab_sections FOR INSERT TO authenticated
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
    )
  );

CREATE POLICY "lab_sections_facility_update"
  ON public.lab_sections FOR UPDATE TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
    )
  );

CREATE POLICY "lab_sections_facility_delete"
  ON public.lab_sections FOR DELETE TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 8) lab_shifts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "lab_shifts_facility_read"
  ON public.lab_shifts FOR SELECT TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu WHERE fu.user_id = auth.uid()
    )
  );

CREATE POLICY "lab_shifts_facility_write"
  ON public.lab_shifts FOR INSERT TO authenticated
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
    )
  );

CREATE POLICY "lab_shifts_facility_update"
  ON public.lab_shifts FOR UPDATE TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
    )
  );

CREATE POLICY "lab_shifts_facility_delete"
  ON public.lab_shifts FOR DELETE TO authenticated
  USING (
    facility_id IN (
      SELECT fu.facility_id FROM public.facility_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('facility_admin'::public.facility_role, 'lab_manager'::public.facility_role)
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 9) facility_invites.token — not SELECTable via PostgREST for anon / authenticated
--     (service_role retains full access for API routes)
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE SELECT (token) ON public.facility_invites FROM PUBLIC;
REVOKE SELECT (token) ON public.facility_invites FROM anon;
REVOKE SELECT (token) ON public.facility_invites FROM authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10) Function search_path hardening (mutable search_path linter)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.audit_trigger_fn() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_rack_status() SET search_path = public, pg_temp;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('custom_access_token_hook', 'update_updated_at')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.fn);
  END LOOP;
END $$;
