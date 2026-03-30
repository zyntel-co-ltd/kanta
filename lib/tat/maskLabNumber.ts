/**
 * Display-only masking for lab numbers (purge / least-necessary exposure).
 */
export function maskLabNumber(raw: string | null | undefined): string {
  const s = raw?.trim();
  if (!s) return "—";
  if (s.length <= 4) return "••••";
  return `••••${s.slice(-4)}`;
}
