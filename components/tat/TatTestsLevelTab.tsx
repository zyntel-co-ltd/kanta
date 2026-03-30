"use client";

import { useCallback, useEffect, useState } from "react";
import AvailableWhenOnline from "@/components/ui/AvailableWhenOnline";
import type { FilterOption } from "@/lib/hooks/useFacilityConfig";
import { useSyncQueue } from "@/lib/SyncQueueContext";

type Row = {
  sample_display_token: string;
  test_name: string;
  section: string;
  received_at: string | null;
  resulted_at: string | null;
  tat_minutes: number | null;
  status: string;
};

type Props = {
  facilityId: string;
  sectionFilterOptions: FilterOption[];
  resolveSectionLabel: (code: string) => string;
};

function fmtDt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function TatTestsLevelTab({
  facilityId,
  sectionFilterOptions,
  resolveSectionLabel,
}: Props) {
  const { isOnline } = useSyncQueue();
  const [section, setSection] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isOnline) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        facility_id: facilityId,
        page: String(page),
        limit: String(limit),
      });
      if (section && section !== "all") q.set("section", section);
      if (dateFrom) q.set("date_from", dateFrom);
      if (dateTo) q.set("date_to", dateTo);
      const res = await fetch(`/api/tat/tests-level?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load");
      setRows(Array.isArray(j.rows) ? j.rows : []);
      setTotal(typeof j.total === "number" ? j.total : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [facilityId, page, limit, section, dateFrom, dateTo, isOnline]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!isOnline) {
    return (
      <div className="space-y-4">
        <AvailableWhenOnline
          title="Test Tracker available when online"
          detail="Reconnect to load paginated test rows from the server."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Test Tracker</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Each row is one test request from your LIMS sync. Sample ID is an anonymized handle (not the raw database id).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Section
          <select
            value={section}
            onChange={(e) => {
              setPage(1);
              setSection(e.target.value);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 min-w-[10rem]"
          >
            {sectionFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPage(1);
              setDateFrom(e.target.value);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPage(1);
              setDateTo(e.target.value);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Sample ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Test</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Section</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Received</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Resulted</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">TAT (min)</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No rows in this range. Ensure the LIMS bridge is syncing test requests.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={`${r.sample_display_token}-${i}`} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-xs text-slate-800">{r.sample_display_token}</td>
                        <td className="px-4 py-3 text-slate-800">{r.test_name}</td>
                        <td className="px-4 py-3 text-slate-700">{resolveSectionLabel(r.section)}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDt(r.received_at)}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDt(r.resulted_at)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.tat_minutes != null ? r.tat_minutes : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              r.status === "On Time" || r.status === "In progress"
                                ? "bg-emerald-50 text-emerald-800"
                                : r.status === "Pending"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-red-50 text-red-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/80">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages} · {total.toLocaleString()} rows
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
