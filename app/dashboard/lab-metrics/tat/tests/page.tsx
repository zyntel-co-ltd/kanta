"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { useFacilityConfig } from "@/lib/hooks/useFacilityConfig";
import LabMetricsConfigEmpty from "@/components/dashboard/LabMetricsConfigEmpty";
import { useFlag } from "@/lib/featureFlags";
import AvailableWhenOnline from "@/components/ui/AvailableWhenOnline";
import Skeleton from "@/components/ui/Skeleton";
import { useSyncQueue } from "@/lib/SyncQueueContext";
import { computeTatPatientStatus, type TatStatusKind } from "@/lib/tat/patientStatus";
import { Timer } from "lucide-react";

type TrackerApiRow = {
  id: string;
  lab_number_masked: string;
  test_name: string;
  section: string;
  status: string;
  requested_at: string | null;
  time_in: string | null;
  time_out: string | null;
  target_minutes: number;
};

const STATUS_FILTER_OPTIONS: { value: "all" | TatStatusKind; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "xhr", label: "XHR" },
  { value: "mins_remaining", label: "Mins remaining" },
  { value: "delayed_lt15", label: "Delayed <15 min" },
  { value: "over_delayed", label: "Over delayed" },
];

function badgeClass(kind: TatStatusKind): string {
  switch (kind) {
    case "xhr":
      return "bg-slate-100 text-slate-700";
    case "mins_remaining":
      return "bg-blue-50 text-blue-800";
    case "delayed_lt15":
      return "bg-amber-50 text-amber-800";
    case "over_delayed":
      return "bg-red-50 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function TestLevelTatTrackerPage() {
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const { isOnline } = useSyncQueue();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  const showTatTestLevel = useFlag("show-tat-test-level");
  const {
    loading: labConfigLoading,
    sectionFilterOptions,
    resolveSectionLabel,
    hasConfiguredSections,
  } = useFacilityConfig(facilityId);

  const [tick, setTick] = useState(() => Date.now());
  const [rows, setRows] = useState<TrackerApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const defaults = useMemo(() => defaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [section, setSection] = useState("all");
  const [testNameQ, setTestNameQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TatStatusKind>("all");

  useEffect(() => {
    if (!isOnline) return;
    const t = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [isOnline]);

  const load = useCallback(async () => {
    if (!facilityId || !showTatTestLevel || !isOnline) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchErr(null);
    try {
      const q = new URLSearchParams({ facility_id: facilityId });
      if (dateFrom) q.set("date_from", dateFrom);
      if (dateTo) q.set("date_to", dateTo);
      if (section && section !== "all") q.set("section", section);
      const res = await fetch(`/api/tat/test-tracker?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Failed to load");
      setRows(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, showTatTestLevel, dateFrom, dateTo, section, isOnline]);

  useEffect(() => {
    if (facilityAuthLoading || !isOnline) return;
    void load();
  }, [facilityAuthLoading, load, isOnline]);

  const now = useMemo(() => new Date(tick), [tick]);

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const timeIn = r.time_in ? new Date(r.time_in) : null;
      const timeOut = r.time_out ? new Date(r.time_out) : null;
      const st = computeTatPatientStatus({
        now,
        timeIn,
        timeOut,
        targetMinutes: r.target_minutes,
      });
      return { row: r, st };
    });
  }, [rows, now]);

  const filteredSorted = useMemo(() => {
    let list = enriched;
    const q = testNameQ.trim().toLowerCase();
    if (q) list = list.filter((x) => x.row.test_name.toLowerCase().includes(q));
    if (statusFilter !== "all") {
      list = list.filter((x) => x.st.kind === statusFilter);
    }
    return [...list].sort((a, b) => b.st.sortScore - a.st.sortScore);
  }, [enriched, statusFilter, testNameQ]);

  if (facilityAuthLoading) {
    return (
      <div className="min-h-[40vh] space-y-4 p-6" aria-busy="true">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!facilityId) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-6">
        <Timer size={32} className="text-slate-300 mb-3" />
        <p className="text-slate-700 font-medium">No facility assigned</p>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          Ask an administrator to assign you to a facility to view test-level TAT.
        </p>
      </div>
    );
  }

  if (!showTatTestLevel) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-6 max-w-lg mx-auto">
        <Timer size={32} className="text-slate-300 mb-3" />
        <p className="text-slate-700 font-medium">Test-level TAT is not enabled</p>
        <p className="text-sm text-slate-500 mt-1">
          This Professional feature is controlled for your facility. Contact Zyntel if you need access.
        </p>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Test-level TAT tracker</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            One row per test and section. Live status updates require a network connection.
          </p>
        </div>
        <AvailableWhenOnline
          title="Live TAT table available when online"
          detail="Reconnect to load and refresh test turnaround status from the server."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Test-level TAT tracker</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          One row per test and section. Time-in uses section receipt (LIMS or Reception); time-out uses result timestamps the same way.
        </p>
      </div>

      {!labConfigLoading && !hasConfiguredSections && (
        <LabMetricsConfigEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
      )}

      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Section
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
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
          Test name contains
          <input
            type="search"
            value={testNameQ}
            onChange={(e) => setTestNameQ(e.target.value)}
            placeholder="Filter…"
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 w-44"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | TatStatusKind)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 min-w-[11rem]"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium px-4 py-2 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {fetchErr && (
        <div className="rounded-xl border border-red-100 bg-red-50 text-red-800 text-sm px-4 py-3">{fetchErr}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-2 py-6" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Test</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Section</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Lab number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Time in</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Target TAT</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Elapsed</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No rows match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredSorted.map(({ row, st }) => {
                    const timeInDisp = row.time_in
                      ? new Date(row.time_in).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—";
                    const elapsedDisp =
                      st.elapsedMinutes != null ? `${st.elapsedMinutes} min` : "—";
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.test_name}</td>
                        <td className="px-4 py-3 text-slate-700">{resolveSectionLabel(row.section)}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{row.lab_number_masked}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{timeInDisp}</td>
                        <td className="px-4 py-3 text-slate-700">{row.target_minutes} min</td>
                        <td className="px-4 py-3 text-slate-700">{elapsedDisp}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badgeClass(st.kind)}`}
                          >
                            {st.label}
                          </span>
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
