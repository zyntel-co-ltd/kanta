-- TAT Reception board: manual urgent/routine flag (GET/PATCH /api/tat/reception).

ALTER TABLE public.test_requests
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.test_requests.is_urgent IS 'Reception/TAT: manual urgent highlight; default false.';
