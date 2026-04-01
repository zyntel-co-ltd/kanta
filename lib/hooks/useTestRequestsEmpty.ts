"use client";

import { useEffect, useState } from "react";

/**
 * True when `test_requests` has no rows for the facility (after loading). ENG-89 empty states.
 */
export function useTestRequestsEmpty(facilityId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!facilityId) {
      setLoading(false);
      setEmpty(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/facility/test-requests-status?facility_id=${encodeURIComponent(facilityId)}`
        );
        const json = (await res.json()) as { empty?: boolean };
        if (!cancelled) setEmpty(json.empty === true);
      } catch {
        if (!cancelled) setEmpty(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  return { loading, empty };
}
