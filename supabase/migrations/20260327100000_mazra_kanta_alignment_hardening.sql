-- Mazra -> Kanta alignment hardening (migrations-first)
-- Safe to run repeatedly.

DO $$
BEGIN
  -- Ensure equipment_telemetry_log exists with all columns required by Mazra loaders.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'equipment_telemetry_log'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'equipment_id'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN equipment_id uuid;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'section'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN section text NOT NULL DEFAULT 'Unknown';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'test_name'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN test_name text NOT NULL DEFAULT 'Unknown';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'tat_minutes'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN tat_minutes decimal(10,2) NOT NULL DEFAULT 60;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'z_score'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN z_score decimal(8,4);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'hour_of_day'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN hour_of_day smallint;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'day_of_week'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN day_of_week smallint;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'samples_that_day'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN samples_that_day int;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'days_to_failure'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN days_to_failure int;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'failure_type'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log ADD COLUMN failure_type text;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'recorded_at'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'equipment_telemetry_log'
          AND column_name = 'created_at'
      ) THEN
        ALTER TABLE public.equipment_telemetry_log RENAME COLUMN created_at TO recorded_at;
      ELSE
        ALTER TABLE public.equipment_telemetry_log
          ADD COLUMN recorded_at timestamptz NOT NULL DEFAULT now();
      END IF;
    END IF;

    -- Some older schemas require record_date for telemetry inserts.
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'equipment_telemetry_log'
        AND column_name = 'record_date'
    ) THEN
      ALTER TABLE public.equipment_telemetry_log
        ADD COLUMN record_date date;
    END IF;

    UPDATE public.equipment_telemetry_log
    SET record_date = COALESCE(record_date, recorded_at::date, CURRENT_DATE)
    WHERE record_date IS NULL;

    ALTER TABLE public.equipment_telemetry_log
      ALTER COLUMN record_date SET DEFAULT CURRENT_DATE;

    CREATE INDEX IF NOT EXISTS idx_telemetry_facility ON public.equipment_telemetry_log(facility_id);
    CREATE INDEX IF NOT EXISTS idx_telemetry_equipment ON public.equipment_telemetry_log(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_telemetry_section ON public.equipment_telemetry_log(section, test_name);
    CREATE INDEX IF NOT EXISTS idx_telemetry_recorded ON public.equipment_telemetry_log(recorded_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  -- Add mazra_generated to AI/extended tables only if each table exists.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_telemetry_log') THEN
    ALTER TABLE public.equipment_telemetry_log
      ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tat_anomaly_flags') THEN
    ALTER TABLE public.tat_anomaly_flags
      ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tat_anomaly_baselines') THEN
    ALTER TABLE public.tat_anomaly_baselines
      ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_summaries') THEN
    ALTER TABLE public.weekly_summaries
      ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'unmatched_tests') THEN
    ALTER TABLE public.unmatched_tests
      ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qc_results') THEN
    ALTER TABLE public.qc_results
      ADD COLUMN IF NOT EXISTS mazra_generated boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  -- Align unmatched_tests upsert index expected by Mazra.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'unmatched_tests'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_unmatched_tests_facility_name_source'
    ) THEN
      CREATE UNIQUE INDEX idx_unmatched_tests_facility_name_source
        ON public.unmatched_tests (facility_id, test_name, source);
    END IF;
  END IF;
END $$;

-- Optional compatibility additions used by downstream tracker filters.
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS shift text;
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS unit text;
