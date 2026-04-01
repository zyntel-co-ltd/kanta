-- ENG-87: LIMS data bridge — connections, sync log, test_requests LIMS keys

-- ── lims_connections ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  connector_type text NOT NULL CHECK (connector_type IN ('postgresql', 'mysql', 'mssql')),
  connection_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  query_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lims_connections_facility ON public.lims_connections (facility_id);

COMMENT ON COLUMN public.lims_connections.connection_config IS 'AES-GCM encrypted JSON (see lib/data-bridge/crypto.ts) or legacy plaintext host/db during migration; never log passwords.';

-- ── test_requests: LIMS dedupe columns (FK after lims_connections exists) ──
ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS lims_connection_id uuid REFERENCES public.lims_connections (id) ON DELETE SET NULL;

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS lims_external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_requests_lims_dedupe
  ON public.test_requests (facility_id, lims_connection_id, lims_external_id)
  WHERE lims_external_id IS NOT NULL AND lims_connection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_test_requests_lims_connection
  ON public.test_requests (lims_connection_id)
  WHERE lims_connection_id IS NOT NULL;

-- ── lims_sync_log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lims_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  lims_connection_id uuid NOT NULL REFERENCES public.lims_connections (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  records_fetched int NOT NULL DEFAULT 0,
  records_upserted int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lims_sync_log_connection ON public.lims_sync_log (lims_connection_id);
CREATE INDEX IF NOT EXISTS idx_lims_sync_log_facility_started ON public.lims_sync_log (facility_id, started_at DESC);

-- ── RLS (authenticated facility members; service role bypasses) ────────────
ALTER TABLE public.lims_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lims_sync_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lims_connections' AND policyname = 'lims_connections_facility_access'
  ) THEN
    CREATE POLICY "lims_connections_facility_access"
      ON public.lims_connections
      FOR ALL
      TO authenticated
      USING (
        facility_id IN (
          SELECT fu.facility_id FROM public.facility_users fu
          WHERE fu.user_id = auth.uid() AND fu.is_active IS NOT FALSE
        )
      )
      WITH CHECK (
        facility_id IN (
          SELECT fu.facility_id FROM public.facility_users fu
          WHERE fu.user_id = auth.uid() AND fu.is_active IS NOT FALSE
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lims_sync_log' AND policyname = 'lims_sync_log_facility_access'
  ) THEN
    CREATE POLICY "lims_sync_log_facility_access"
      ON public.lims_sync_log
      FOR ALL
      TO authenticated
      USING (
        facility_id IN (
          SELECT fu.facility_id FROM public.facility_users fu
          WHERE fu.user_id = auth.uid() AND fu.is_active IS NOT FALSE
        )
      )
      WITH CHECK (
        facility_id IN (
          SELECT fu.facility_id FROM public.facility_users fu
          WHERE fu.user_id = auth.uid() AND fu.is_active IS NOT FALSE
        )
      );
  END IF;
END $$;
