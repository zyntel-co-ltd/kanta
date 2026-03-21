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

export function evaluateWestgard(
  runs: QcRun[],
  mean: number,
  sd: number
): WestgardFlag[] {
  const flags: WestgardFlag[] = [];
  if (runs.length === 0 || sd <= 0) return flags;

  const values = runs.map((r) => r.value);
  const zScores = values.map((v) => (v - mean) / sd);

  const last = values[values.length - 1];
  const lastZ = zScores[zScores.length - 1];

  if (lastZ >= 2 && lastZ < 3) {
    flags.push({ rule: "1-2s", level: "warning" });
  }
  if (Math.abs(lastZ) >= 3) {
    flags.push({ rule: "1-3s", level: "rejection" });
  }

  if (values.length >= 2) {
    const prev = values[values.length - 2];
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
