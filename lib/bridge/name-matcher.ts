/**
 * ENG-98: map LIMS test names → Kanta names using facility mappings + fuzzy fallback.
 */

import type { TestNameMapping } from "./types";

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

function normalizeMappings(raw: unknown): TestNameMapping[] {
  if (!Array.isArray(raw)) return [];
  const out: TestNameMapping[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const lims = typeof o.lims_name === "string" ? o.lims_name.trim() : "";
    const kanta = typeof o.kanta_name === "string" ? o.kanta_name.trim() : "";
    if (lims && kanta) out.push({ lims_name: lims, kanta_name: kanta });
  }
  return out;
}

export type MapTestNameResult = {
  kantaName: string;
  matched: "exact" | "fuzzy" | "none";
};

/**
 * 1) Exact case-insensitive match on lims_name
 * 2) Fuzzy match to any kanta_name in mappings with Levenshtein < 3
 * 3) Else return original trimmed name, matched none
 */
export function mapLimsTestName(
  limsTestName: string,
  mappingsRaw: unknown
): MapTestNameResult {
  const trimmed = limsTestName.trim();
  if (!trimmed) return { kantaName: "Unknown", matched: "none" };
  const mappings = normalizeMappings(mappingsRaw);
  const lower = trimmed.toLowerCase();
  for (const m of mappings) {
    if (m.lims_name.toLowerCase() === lower) {
      return { kantaName: m.kanta_name, matched: "exact" };
    }
  }
  const kantaTargets = [...new Set(mappings.map((m) => m.kanta_name))];
  let best: { name: string; d: number } | null = null;
  for (const k of kantaTargets) {
    const d = levenshtein(lower, k.toLowerCase());
    if (d < 3 && (!best || d < best.d)) best = { name: k, d };
  }
  if (best) return { kantaName: best.name, matched: "fuzzy" };
  return { kantaName: trimmed, matched: "none" };
}
