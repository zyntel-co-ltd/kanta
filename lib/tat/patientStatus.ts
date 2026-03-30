/**
 * Patient-level and test-level TAT status (ENG-95 / ENG-96).
 * Same algorithm: compare elapsed time from section time-in to now (or time-out) against target;
 * breach bands match analytics (≤15 min vs >15 min).
 */

export type TatStatusKind = "xhr" | "mins_remaining" | "delayed_lt15" | "over_delayed";

export type TatPatientStatus = {
  kind: TatStatusKind;
  /** User-visible badge text */
  label: string;
  elapsedMinutes: number | null;
  remainingMinutes: number | null;
  breachMinutes: number | null;
  /** Higher = more urgent (for default sort) */
  sortScore: number;
};

function clampTargetMinutes(targetMinutes: number): number {
  if (!Number.isFinite(targetMinutes) || targetMinutes < 1) return 60;
  return Math.floor(targetMinutes);
}

/**
 * @param timeIn Effective section receipt (COALESCE(section_time_in, received_at))
 * @param timeOut Effective result-out (COALESCE(section_time_out, resulted_at))
 */
export function computeTatPatientStatus(input: {
  now: Date;
  timeIn: Date | null;
  timeOut: Date | null;
  targetMinutes: number;
}): TatPatientStatus {
  const target = clampTargetMinutes(input.targetMinutes);
  const { now, timeIn, timeOut } = input;

  if (!timeIn) {
    return {
      kind: "xhr",
      label: "XHR",
      elapsedMinutes: null,
      remainingMinutes: null,
      breachMinutes: null,
      /* Below in-progress "remaining" band, above completed rows */
      sortScore: 2_990_000,
    };
  }

  const endMs = timeOut ? timeOut.getTime() : now.getTime();
  const elapsed = Math.max(0, Math.floor((endMs - timeIn.getTime()) / 60_000));
  const inProgress = !timeOut;

  if (!timeOut) {
    if (elapsed <= target) {
      const rem = target - elapsed;
      return {
        kind: "mins_remaining",
        label: `${rem} min${rem === 1 ? "" : "s"} remaining`,
        elapsedMinutes: elapsed,
        remainingMinutes: rem,
        breachMinutes: null,
        sortScore: 3_000_000 + (10_000 - Math.min(rem, 10_000)),
      };
    }
    const breach = elapsed - target;
    if (breach <= 15) {
      return {
        kind: "delayed_lt15",
        label: "Delayed <15 min",
        elapsedMinutes: elapsed,
        remainingMinutes: null,
        breachMinutes: breach,
        sortScore: 4_000_000 + breach * 100 + 50_000,
      };
    }
    return {
      kind: "over_delayed",
      label: "Over delayed",
      elapsedMinutes: elapsed,
      remainingMinutes: null,
      breachMinutes: breach,
      sortScore: 5_000_000 + breach * 100 + 50_000,
    };
  }

  if (elapsed <= target) {
    return {
      kind: "xhr",
      label: "XHR",
      elapsedMinutes: elapsed,
      remainingMinutes: null,
      breachMinutes: null,
      sortScore: 100_000,
    };
  }

  const breach = elapsed - target;
  if (breach <= 15) {
    return {
      kind: "delayed_lt15",
      label: "Delayed <15 min",
      elapsedMinutes: elapsed,
      remainingMinutes: null,
      breachMinutes: breach,
      sortScore: 1_000_000 + breach * 100,
    };
  }
  return {
    kind: "over_delayed",
    label: "Over delayed",
    elapsedMinutes: elapsed,
    remainingMinutes: null,
    breachMinutes: breach,
    sortScore: 1_500_000 + breach * 100,
  };
}
