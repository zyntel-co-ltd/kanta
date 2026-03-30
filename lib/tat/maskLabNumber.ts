/**
 * Display-only masking for lab numbers (purge / least-necessary exposure).
 */
export function maskLabNumber(
  raw: string | null | undefined,
  requestedAt?: string | null,
  retentionDays = Number(process.env.NEXT_PUBLIC_TAT_LAB_RETENTION_DAYS ?? 90)
): string {
  const s = raw?.trim();
  if (!s) return "—";
  const requestedTs = requestedAt ? new Date(requestedAt).getTime() : Number.NaN;
  const hasAge = Number.isFinite(requestedTs);
  const ageMs = hasAge ? Date.now() - requestedTs : 0;
  const maxAgeMs = Math.max(1, retentionDays) * 24 * 60 * 60 * 1000;

  // During retention window show full lab number as-is.
  if (!hasAge || ageMs <= maxAgeMs) return s;

  // After retention/purge window show anonymized token-ish form.
  const head = s.slice(0, 3);
  return `${head}${"*".repeat(Math.max(3, s.length - head.length))}`;
}
