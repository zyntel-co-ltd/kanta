/**
 * Westgard rule engine — pure TypeScript
 * 1-2s warning, 1-3s rejection, 2-2s rejection, R-4s rejection, 4-1s rejection, 10x rejection
 */

export type QcRun = {
  id: string;
  value: number;
  run_at: string;
  z_score?: number | null;
};

export type WestgardFlag = {
  rule: string;
  level: "warning" | "rejection";
};

export type DriftAlert = {
  window: number;
  direction: "positive" | "negative";
  maxAbsZ: number;
};

export function evaluateWestgard(
  runs: QcRun[],
  mean: number,
  sd: number
): WestgardFlag[] {
  const flags: WestgardFlag[] = [];
  if (runs.length === 0 || sd <= 0) return flags;

  const values = runs.map((r) => r.value);
  const zScores = values.map((v) => (v - mean) / sd);

  const lastZ = zScores[zScores.length - 1];

  if (lastZ >= 2 && lastZ < 3) {
    flags.push({ rule: "1-2s", level: "warning" });
  }
  if (Math.abs(lastZ) >= 3) {
    flags.push({ rule: "1-3s", level: "rejection" });
  }

  if (values.length >= 2) {
    const prevZ = zScores[zScores.length - 2];
    if (
      (lastZ >= 2 && prevZ >= 2) ||
      (lastZ <= -2 && prevZ <= -2)
    ) {
      flags.push({ rule: "2-2s", level: "rejection" });
    }
  }

  if (values.length >= 4) {
    const recent = values.slice(-4);
    const range = Math.max(...recent) - Math.min(...recent);
    if (range / sd >= 4) {
      flags.push({ rule: "R-4s", level: "rejection" });
    }
  }

  if (values.length >= 4) {
    const recent = values.slice(-4);
    const sameSide = recent.every((v) => v > mean) || recent.every((v) => v < mean);
    if (sameSide && recent.every((v) => Math.abs((v - mean) / sd) >= 1)) {
      flags.push({ rule: "4-1s", level: "rejection" });
    }
  }

  if (values.length >= 10) {
    const recent = values.slice(-10);
    const sameSide = recent.every((v) => v > mean) || recent.every((v) => v < mean);
    if (sameSide) {
      flags.push({ rule: "10x", level: "rejection" });
    }
  }

  return flags;
}

export function computeZScore(value: number, mean: number, sd: number): number {
  if (sd <= 0) return 0;
  return (value - mean) / sd;
}

/**
 * Proactive drift detection: looks for consistent same-side movement toward +/-2 SD
 * before hard Westgard rejection.
 */
export function detectDriftAlerts(
  runs: QcRun[],
  mean: number,
  sd: number,
  window = 6
): Record<string, DriftAlert> {
  const out: Record<string, DriftAlert> = {};
  if (runs.length < window || sd <= 0) return out;

  const z = runs.map((r) => (r.z_score != null ? Number(r.z_score) : computeZScore(r.value, mean, sd)));
  const minAbsForTrend = 1.5;
  const maxAbsForPreViolation = 2.8;

  for (let i = window - 1; i < runs.length; i++) {
    const seg = z.slice(i - window + 1, i + 1);
    const last = seg[seg.length - 1];
    const direction: "positive" | "negative" | null = last > 0 ? "positive" : last < 0 ? "negative" : null;
    if (!direction) continue;

    const sameSide = seg.every((v) => (direction === "positive" ? v > 0 : v < 0));
    if (!sameSide) continue;

    const nonDecreasingAbs = seg.every((v, idx) => idx === 0 || Math.abs(v) >= Math.abs(seg[idx - 1]));
    if (!nonDecreasingAbs) continue;

    const maxAbsZ = Math.max(...seg.map((v) => Math.abs(v)));
    const nearTwoSd = maxAbsZ >= minAbsForTrend && maxAbsZ < maxAbsForPreViolation;
    if (!nearTwoSd) continue;

    out[runs[i].id] = { window, direction, maxAbsZ };
  }

  return out;
}
