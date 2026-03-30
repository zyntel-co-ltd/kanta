/**
 * ENG-90: On Time / Breached (and interim states) vs tat_targets SLA.
 */

export type TestsLevelRowStatus =
  | "Pending"
  | "In progress"
  | "On Time"
  | "Breached";

export function computeTestsLevelStatus(input: {
  received_at: string | null;
  resulted_at: string | null;
  targetMinutes: number;
  now?: Date;
}): TestsLevelRowStatus {
  const now = input.now ?? new Date();
  const target = Math.max(1, Math.floor(input.targetMinutes || 60));

  if (!input.received_at) {
    return "Pending";
  }

  const recv = new Date(input.received_at);
  if (Number.isNaN(recv.getTime())) return "Pending";

  const end = input.resulted_at ? new Date(input.resulted_at) : now;
  const endMs = Number.isNaN(end.getTime()) ? now.getTime() : end.getTime();
  const elapsedMin = Math.max(0, Math.floor((endMs - recv.getTime()) / 60_000));

  if (!input.resulted_at) {
    return elapsedMin <= target ? "In progress" : "Breached";
  }

  return elapsedMin <= target ? "On Time" : "Breached";
}

export function tatMinutesBetween(
  received_at: string | null,
  resulted_at: string | null,
  now?: Date
): number | null {
  if (!received_at) return null;
  const recv = new Date(received_at);
  if (Number.isNaN(recv.getTime())) return null;
  const end = resulted_at ? new Date(resulted_at) : (now ?? new Date());
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.floor((end.getTime() - recv.getTime()) / 60_000));
}
