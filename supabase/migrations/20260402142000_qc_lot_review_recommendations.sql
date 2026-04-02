-- ENG-166: Lot review recommendations for repeated Westgard triggers

CREATE TABLE IF NOT EXISTS public.qc_lot_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.qc_materials(id) ON DELETE CASCADE,
  analyte text NOT NULL,
  lot_number text,
  violation_count integer NOT NULL DEFAULT 0,
  window_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'open',
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, material_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qc_lot_recommendations_status_check'
  ) THEN
    ALTER TABLE public.qc_lot_recommendations
      ADD CONSTRAINT qc_lot_recommendations_status_check
      CHECK (status IN ('open', 'acknowledged', 'resolved'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_qc_lot_recommendations_facility_status
  ON public.qc_lot_recommendations(facility_id, status, last_detected_at DESC);
