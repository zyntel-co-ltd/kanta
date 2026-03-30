/**
 * Mint a short-lived LRIDS token and open the standalone display board in a new tab.
 * Call only from the browser (e.g. sidebar / dashboard buttons).
 */
export async function openLridsBoardInNewTab(facilityId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/lrids/token?facilityId=${encodeURIComponent(facilityId)}`);
    const j = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
    if (!res.ok) {
      return { ok: false, error: typeof j.error === "string" ? j.error : "Could not open board" };
    }
    if (typeof j.token !== "string" || !j.token) {
      return { ok: false, error: "Invalid token response" };
    }
    const url = `${window.location.origin}/lrids/${encodeURIComponent(facilityId)}?token=${encodeURIComponent(j.token)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
