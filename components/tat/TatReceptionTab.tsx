"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, XCircle } from "lucide-react";
import { LoadingBars } from "@/components/ui/PageLoader";
import AvailableWhenOnline from "@/components/ui/AvailableWhenOnline";
import { useSyncQueue } from "@/lib/SyncQueueContext";
import type { FilterOption } from "@/lib/hooks/useFacilityConfig";

type Row = {
  id: string;
  patient_token: string;
  lab_number: string | null;
  test_name: string;
  section: string;
  requested_at: string | null;
  section_time_in: string | null;
  section_time_out: string | null;
  tat_minutes: number | null;
  status: string;
  is_urgent?: boolean | null;
};

type Props = {
  facilityId: string;
  sectionFilterOptions: FilterOption[];
  resolveSectionLabel: (code: string) => string;
  /** When true, shows Stamp In / Stamp Out buttons (for facilities without LIMS timestamps) */
  showStampButtons?: boolean;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function canEdit(existingIso: string | null): boolean {
  if (!existingIso) return false;
  const ts = new Date(existingIso).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= 30 * 60 * 1000;
}

export default function TatReceptionTab({
  facilityId,
  sectionFilterOptions,
  resolveSectionLabel,
  showStampButtons = false,
}: Props) {
  const { isOnline } = useSyncQueue();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [section, setSection] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isOnline) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        facility_id: facilityId,
        date,
      });
      if (section && section !== "all") params.set("section", section);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/tat/reception?${params.toString()}`);
      const j = (await res.json().catch(() => ({}))) as { rows?: Row[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load reception rows");
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reception rows");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, date, section, q, isOnline]);

  useEffect(() => {
    void load();
  }, [load]);

  const stamp = useCallback(
    async (rowId: string, field: "section_time_in" | "section_time_out") => {
      setSavingId(rowId);
      setError(null);
      try {
        const res = await fetch("/api/tat/reception", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: rowId,
            facility_id: facilityId,
            field,
            value: new Date().toISOString(),
          }),
        });
        const j = (await res.json().catch(() => ({}))) as { row?: Row; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to stamp");
        if (j.row) {
          setRows((prev) => prev.map((r) => (r.id === rowId ? j.row! : r)));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to stamp");
      } finally {
        setSavingId(null);
      }
    },
    [facilityId]
  );

  const toggleUrgent = useCallback(
    async (row: Row) => {
      setSavingId(row.id);
      setError(null);
      try {
        const res = await fetch("/api/tat/reception", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: row.id,
            facility_id: facilityId,
            field: "is_urgent",
            value: !row.is_urgent,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as { row?: Row; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed");
        if (j.row) setRows((prev) => prev.map((r) => (r.id === row.id ? { ...j.row!, patient_token: r.patient_token } : r)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to toggle urgency");
      } finally {
        setSavingId(null);
      }
    },
    [facilityId]
  );

  const cancelRow = useCallback(
    async (rowId: string) => {
      if (!confirm("Cancel this test request?")) return;
      setCancellingId(rowId);
      setError(null);
      try {
        const res = await fetch("/api/tat/cancel-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: rowId, facility_id: facilityId }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to cancel");
        setRows((prev) => prev.filter((r) => r.id !== rowId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to cancel");
      } finally {
        setCancellingId(null);
      }
    },
    [facilityId]
  );

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (a.requested_at ?? "") < (b.requested_at ?? "") ? 1 : -1),
    [rows]
  );

  if (!isOnline) {
    return (
      <AvailableWhenOnline
        title="Section Capture available when online"
        detail="Reconnect to fetch requests and stamp section time-in/time-out."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Section
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            >
              {sectionFilterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide md:col-span-2">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Lab number, test, section…"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <LoadingBars />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Lab Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Test</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Section</th>
                  {showStampButtons && <>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Time In</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Time Out</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">TAT (min)</th>
                  </>}
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={showStampButtons ? 8 : 5} className="px-4 py-10 text-center text-slate-500">
                      No requests found for this date/filter.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((r) => {
                    const inEditable = canEdit(r.section_time_in);
                    const outEditable = canEdit(r.section_time_out);
                    const isBusy = savingId === r.id || cancellingId === r.id;
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50/60 ${r.is_urgent ? "bg-amber-50/40" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-800">{r.lab_number ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-800">{r.test_name}</td>
                        <td className="px-4 py-3 text-slate-700">{resolveSectionLabel(r.section)}</td>
                        {showStampButtons && <>
                          <td className="px-4 py-3 text-slate-700">
                            {r.section_time_in ? (
                              <div className="space-y-1">
                                <div>{fmt(r.section_time_in)}</div>
                                {inEditable && (
                                  <button type="button" onClick={() => void stamp(r.id, "section_time_in")} disabled={isBusy} className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-40">
                                    Edit
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button type="button" onClick={() => void stamp(r.id, "section_time_in")} disabled={isBusy} className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 disabled:opacity-40">
                                Receive
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {r.section_time_out ? (
                              <div className="space-y-1">
                                <div>{fmt(r.section_time_out)}</div>
                                {outEditable && (
                                  <button type="button" onClick={() => void stamp(r.id, "section_time_out")} disabled={isBusy} className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-40">
                                    Edit
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button type="button" onClick={() => void stamp(r.id, "section_time_out")} disabled={isBusy} className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 disabled:opacity-40">
                                Result
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{r.tat_minutes ?? "—"}</td>
                        </>}
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void toggleUrgent(r)}
                              disabled={isBusy}
                              title={r.is_urgent ? "Mark routine" : "Mark urgent"}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-40 transition-colors ${
                                r.is_urgent
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800"
                              }`}
                            >
                              <AlertTriangle size={11} />
                              {r.is_urgent ? "Urgent" : "Routine"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void cancelRow(r.id)}
                              disabled={isBusy}
                              title="Cancel this test"
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                            >
                              <XCircle size={11} />
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
