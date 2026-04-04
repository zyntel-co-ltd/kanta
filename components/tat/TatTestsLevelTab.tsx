"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AvailableWhenOnline from "@/components/ui/AvailableWhenOnline";
import Skeleton from "@/components/ui/Skeleton";
import type { FilterOption } from "@/lib/hooks/useFacilityConfig";
import { useSyncQueue } from "@/lib/SyncQueueContext";
import { computeTatPatientStatus, type TatStatusKind } from "@/lib/tat/patientStatus";
import TatChartsPanel from "@/components/tat/TatChartsPanel";
import TestsForLabDialog from "@/components/tat/TestsForLabDialog";

// ── Types ────────────────────────────────────────────────────────────────────

type TrackerRow = {
  id: string;
  lab_number_masked: string;
  test_name: string;
  section: string;
  status: string;
  requested_at: string | null;
  received_at: string | null;
  resulted_at: string | null;
  section_time_in: string | null;
  section_time_out: string | null;
  time_in: string | null;
  time_out: string | null;
  target_minutes: number;
};

type ChartData = {
  pieData: { onTime: number; delayedLess15: number; overDelayed: number; notUploaded: number };
  dailyTrend: { date: string; delayed: number; onTime: number; notUploaded: number }[];
  hourlyTrend: { hour: number; delayed: number; onTime: number; notUploaded: number }[];
  kpis: {
    totalTests: number;
    delayedTests: number;
    onTimeTests: number;
    avgDailyDelayed: number;
    avgDailyOnTime: number;
    avgDailyNotUploaded: number;
    mostDelayedHour: string;
    mostDelayedDay: string;
  };
  granularity?: "daily" | "monthly";
};

type Props = {
  facilityId: string;
  sectionFilterOptions: FilterOption[];
  resolveSectionLabel: (code: string) => string;
};

type SubTab = "tracker" | "charts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: { value: "all" | TatStatusKind; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "xhr", label: "XHR" },
  { value: "mins_remaining", label: "Mins remaining" },
  { value: "delayed_lt15", label: "Delayed <15 min" },
  { value: "over_delayed", label: "Over delayed" },
];

function delayStatusLabel(kind: TatStatusKind, elapsed: number | null): string {
  switch (kind) {
    case "xhr": return "On Time";
    case "mins_remaining": return "On Time";
    case "delayed_lt15": return "Delayed for <15 minutes";
    case "over_delayed": return "Over Delayed";
    default: return elapsed == null ? "Not Uploaded" : "On Time";
  }
}

function delayStatusClass(kind: TatStatusKind, elapsed: number | null): string {
  if (elapsed == null) return "text-slate-500";
  switch (kind) {
    case "xhr": return "text-emerald-700 font-medium";
    case "mins_remaining": return "text-emerald-700 font-medium";
    case "delayed_lt15": return "text-amber-700 font-medium";
    case "over_delayed": return "text-red-700 font-medium";
    default: return "text-slate-500";
  }
}

function timeRangeLabel(elapsed: number | null): string {
  if (elapsed == null) return "Not Uploaded";
  if (elapsed < 30) return "< 30 min";
  if (elapsed < 60) return "30–60 min";
  if (elapsed < 120) return "1–2 hrs";
  if (elapsed < 240) return "2–4 hrs";
  if (elapsed < 480) return "4–8 hrs";
  if (elapsed < 1440) return "8–24 hrs";
  return "> 24 hrs";
}

function fmtDt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TatTestsLevelTab({
  facilityId,
  sectionFilterOptions,
  resolveSectionLabel,
}: Props) {
  const { isOnline } = useSyncQueue();
  const [subTab, setSubTab] = useState<SubTab>("tracker");
  const [tick, setTick] = useState(() => Date.now());
  const defaults = useMemo(() => defaultDateRange(), []);

  // shared filters
  const [section, setSection] = useState("all");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [testNameQ, setTestNameQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TatStatusKind>("all");

  // tracker state
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(true);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // chart state
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // dialog
  const [dialogLabNumber, setDialogLabNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    const t = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [isOnline]);

  const loadTracker = useCallback(async () => {
    if (!isOnline) { setRows([]); setTrackerLoading(false); return; }
    setTrackerLoading(true);
    setTrackerError(null);
    try {
      const q = new URLSearchParams({ facility_id: facilityId });
      if (dateFrom) q.set("date_from", dateFrom);
      if (dateTo) q.set("date_to", dateTo);
      if (section && section !== "all") q.set("section", section);
      if (testNameQ.trim()) q.set("test_name", testNameQ.trim());
      const res = await fetch(`/api/tat/test-tracker?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to load");
      setRows(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      setTrackerError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setTrackerLoading(false);
    }
  }, [facilityId, dateFrom, dateTo, section, testNameQ, isOnline]);

  const loadCharts = useCallback(async () => {
    if (!isOnline) { setChartData(null); return; }
    setChartLoading(true);
    setChartError(null);
    try {
      const q = new URLSearchParams({ facility_id: facilityId });
      if (dateFrom) q.set("startDate", dateFrom);
      if (dateTo) q.set("endDate", dateTo);
      if (section && section !== "all") q.set("section", section);
      const res = await fetch(`/api/tat/tests-charts?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to load charts");
      setChartData(j);
    } catch (e) {
      setChartError(e instanceof Error ? e.message : "Failed to load charts");
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  }, [facilityId, dateFrom, dateTo, section, isOnline]);

  useEffect(() => {
    if (subTab === "tracker") void loadTracker();
    else void loadCharts();
  }, [subTab, loadTracker, loadCharts]);

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
    if (statusFilter !== "all") list = list.filter((x) => x.st.kind === statusFilter);
    const sorted = [...list].sort((a, b) => b.st.sortScore - a.st.sortScore);
    return sorted;
  }, [enriched, statusFilter, testNameQ]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, page]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  const handleCancel = useCallback(
    async (id: string) => {
      if (!confirm("Cancel this test? This cannot be undone.")) return;
      setCancellingId(id);
      setCancelSuccess(null);
      try {
        const res = await fetch(`/api/tat/cancel-test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facility_id: facilityId, request_id: id }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Failed to cancel");
        }
        setCancelSuccess(id);
        setRows((prev) => prev.filter((r) => r.id !== id));
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to cancel test");
      } finally {
        setCancellingId(null);
      }
    },
    [facilityId]
  );

  if (!isOnline) {
    return (
      <AvailableWhenOnline
        title="Test Tracker available when online"
        detail="Reconnect to load test-level TAT data."
      />
    );
  }

  const filterBar = (
    <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Section
        <select
          value={section}
          onChange={(e) => { setPage(1); setSection(e.target.value); }}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm min-w-[10rem]"
        >
          {sectionFilterOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        From
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setPage(1); setDateFrom(e.target.value); }}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        To
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setPage(1); setDateTo(e.target.value); }}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </label>
      {subTab === "tracker" && (
        <>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Test name contains
            <input
              type="search"
              value={testNameQ}
              onChange={(e) => { setPage(1); setTestNameQ(e.target.value); }}
              placeholder="Filter…"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm w-44"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Status
            <select
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value as "all" | TatStatusKind); }}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm min-w-[11rem]"
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <button
        type="button"
        onClick={() => subTab === "tracker" ? void loadTracker() : void loadCharts()}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Refresh
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["tracker", "charts"] as SubTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subTab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {t === "tracker" ? "Tracker" : "Charts"}
          </button>
        ))}
      </div>

      {filterBar}

      {cancelSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Test cancelled successfully.
        </div>
      )}

      {/* Charts sub-tab */}
      {subTab === "charts" && (
        <>
          {chartLoading && <Skeleton className="h-96 w-full rounded-2xl" />}
          {chartError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{chartError}</div>
          )}
          {!chartLoading && chartData && (
            <TatChartsPanel
              pieData={chartData.pieData}
              dailyTrend={chartData.dailyTrend}
              hourlyTrend={chartData.hourlyTrend}
              kpis={{
                totalRequests: chartData.kpis.totalTests,
                delayedRequests: chartData.kpis.delayedTests,
                onTimeRequests: chartData.kpis.onTimeTests,
                avgDailyDelayed: chartData.kpis.avgDailyDelayed,
                avgDailyOnTime: chartData.kpis.avgDailyOnTime,
                avgDailyNotUploaded: chartData.kpis.avgDailyNotUploaded,
                mostDelayedHour: chartData.kpis.mostDelayedHour,
                mostDelayedDay: chartData.kpis.mostDelayedDay,
              }}
              granularity={chartData.granularity}
              label="tests"
            />
          )}
        </>
      )}

      {/* Tracker sub-tab */}
      {subTab === "tracker" && (
        <>
          {trackerError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{trackerError}</div>
          )}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {trackerLoading ? (
              <div className="space-y-2 py-6 px-4" aria-busy="true">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Lab Number</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Section</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Test Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time In</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time Received</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">TAT <span className="font-normal text-slate-400">(min)</span></th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time Expected</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time Out</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Delay Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time Range</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paged.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                            No rows match your filters.
                          </td>
                        </tr>
                      ) : (
                        paged.map(({ row: r, st }) => {
                          const reqDate = r.requested_at
                            ? new Date(r.requested_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—";
                          // test time-in = section_time_in (when section received the sample)
                          const timeIn = r.section_time_in ?? r.received_at;
                          // test time-received = received_at (or section_time_in)
                          const timeReceived = r.received_at ?? r.section_time_in;
                          // time-out = section_time_out or resulted_at
                          const timeOut = r.section_time_out ?? r.resulted_at;
                          const timeExpected =
                            timeIn
                              ? new Date(
                                  new Date(timeIn).getTime() + r.target_minutes * 60_000
                                ).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                              : "—";
                          const dstLabel = delayStatusLabel(st.kind, st.elapsedMinutes);
                          const dstClass = delayStatusClass(st.kind, st.elapsedMinutes);
                          const trLabel = timeRangeLabel(st.elapsedMinutes);

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{reqDate}</td>
                              <td
                                className="px-4 py-3 font-mono text-slate-800 cursor-pointer select-none hover:underline"
                                onDoubleClick={() => setDialogLabNumber(r.lab_number_masked)}
                                title="Double-click to view all tests"
                              >
                                {r.lab_number_masked}
                              </td>
                              <td className="px-4 py-3 text-slate-700">{resolveSectionLabel(r.section)}</td>
                              <td className="px-4 py-3 font-medium text-slate-800">{r.test_name}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDt(timeIn)}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDt(timeReceived)}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                    (st.elapsedMinutes ?? 0) > r.target_minutes
                                      ? "bg-red-50 text-red-800"
                                      : "bg-emerald-50 text-emerald-800"
                                  }`}
                                >
                                  {st.elapsedMinutes != null ? `${st.elapsedMinutes} min` : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{timeExpected}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDt(timeOut)}</td>
                              <td className={`px-4 py-3 whitespace-nowrap text-xs ${dstClass}`}>{dstLabel}</td>
                              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{trLabel}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  disabled={cancellingId === r.id}
                                  onClick={() => handleCancel(r.id)}
                                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                  {cancellingId === r.id ? "…" : "Cancel"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/80">
                  <p className="text-xs text-slate-500">
                    Page {page} of {totalPages} · {filteredSorted.length.toLocaleString()} rows
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
        </>
      )}

      <TestsForLabDialog
        facilityId={facilityId}
        labNumber={dialogLabNumber}
        open={dialogLabNumber !== null}
        onClose={() => setDialogLabNumber(null)}
      />
    </div>
  );
}
