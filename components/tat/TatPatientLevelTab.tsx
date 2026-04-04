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

type ApiRow = {
  id: string;
  lab_number_display: string;
  tests_requested: string[];
  sections: string[];
  time_in: string | null;
  time_out: string | null;
  target_tat_minutes: number;
  requested_at: string | null;
  status_kind: TatStatusKind;
  status_label: string;
  sort_score: number;
  elapsed_minutes: number | null;
};

type ChartData = {
  pieData: { onTime: number; delayedLess15: number; overDelayed: number; notUploaded: number };
  dailyTrend: { date: string; delayed: number; onTime: number; notUploaded: number }[];
  hourlyTrend: { hour: number; delayed: number; onTime: number; notUploaded: number }[];
  kpis: {
    totalRequests: number;
    delayedRequests: number;
    onTimeRequests: number;
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

type SubTab = "charts" | "table";

// ── Status helpers ───────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: "all" | TatStatusKind; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "xhr", label: "XHR" },
  { value: "mins_remaining", label: "Y mins remaining" },
  { value: "delayed_lt15", label: "Delayed <15 min" },
  { value: "over_delayed", label: "Over delayed" },
];

function badgeClass(kind: TatStatusKind): string {
  switch (kind) {
    case "xhr": return "bg-emerald-50 text-emerald-800";
    case "mins_remaining": return "bg-blue-50 text-blue-800";
    case "delayed_lt15": return "bg-amber-50 text-amber-800";
    case "over_delayed": return "bg-red-50 text-red-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

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

function progressLabel(timeIn: string | null, timeOut: string | null, targetMinutes: number): { text: string; cls: string } {
  const now = new Date();
  if (!timeIn) return { text: "No ETA", cls: "text-slate-400" };
  const inMs = new Date(timeIn).getTime();
  const expected = new Date(inMs + targetMinutes * 60_000);
  if (timeOut) {
    const outMs = new Date(timeOut).getTime();
    if (outMs <= now.getTime()) return { text: "Completed", cls: "text-emerald-700 font-semibold" };
  }
  if (expected <= now && !timeOut) return { text: "Delayed", cls: "text-red-600 font-semibold" };
  if (expected > now) {
    const diffMs = expected.getTime() - now.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffMin <= 10) return { text: `${diffMin} min(s) remaining`, cls: "text-red-500 font-semibold" };
    if (diffDays > 0) return { text: `${diffDays} day(s) remaining`, cls: "text-blue-700" };
    if (diffHrs > 0) return { text: `${diffHrs} hr(s) remaining`, cls: "text-blue-700" };
    return { text: `${diffMin} min(s) remaining`, cls: "text-blue-700" };
  }
  return { text: "No ETA", cls: "text-slate-400" };
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

export default function TatPatientLevelTab({
  facilityId,
  sectionFilterOptions,
  resolveSectionLabel,
}: Props) {
  const { isOnline } = useSyncQueue();
  const [subTab, setSubTab] = useState<SubTab>("table");
  const [tick, setTick] = useState(() => Date.now());
  const defaults = useMemo(() => defaultDateRange(), []);

  // shared filters
  const [section, setSection] = useState("all");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);

  // table state
  const [status, setStatus] = useState<"all" | TatStatusKind>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);

  // chart state
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // dialog
  const [dialogLabNumber, setDialogLabNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [isOnline]);

  const loadTable = useCallback(async () => {
    if (!isOnline) { setRows([]); setTotal(0); setTableLoading(false); return; }
    setTableLoading(true);
    setTableError(null);
    try {
      const q = new URLSearchParams({
        facility_id: facilityId,
        page: String(page),
        limit: String(limit),
      });
      if (section && section !== "all") q.set("section", section);
      if (status && status !== "all") q.set("status", status);
      if (dateFrom) q.set("date_from", dateFrom);
      if (dateTo) q.set("date_to", dateTo);
      const res = await fetch(`/api/tat/patient-level?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to load");
      setRows(Array.isArray(j.rows) ? j.rows : []);
      setTotal(typeof j.total === "number" ? j.total : 0);
    } catch (e) {
      setTableError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
      setTotal(0);
    } finally {
      setTableLoading(false);
    }
  }, [facilityId, page, limit, section, status, dateFrom, dateTo, isOnline]);

  const loadCharts = useCallback(async () => {
    if (!isOnline) { setChartData(null); return; }
    setChartLoading(true);
    setChartError(null);
    try {
      const q = new URLSearchParams({
        facility_id: facilityId,
      });
      if (dateFrom) q.set("startDate", dateFrom);
      if (dateTo) q.set("endDate", dateTo);
      const res = await fetch(`/api/tat/patient-charts?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to load charts");
      setChartData(j);
    } catch (e) {
      setChartError(e instanceof Error ? e.message : "Failed to load charts");
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  }, [facilityId, dateFrom, dateTo, isOnline]);

  useEffect(() => {
    void loadTable();
  }, [loadTable]);

  useEffect(() => {
    if (subTab === "charts") void loadCharts();
  }, [subTab, loadCharts]);

  const now = useMemo(() => new Date(tick), [tick]);
  const liveRows = useMemo(() => {
    return rows
      .map((r) => {
        const st = computeTatPatientStatus({
          now,
          timeIn: r.time_in ? new Date(r.time_in) : null,
          timeOut: r.time_out ? new Date(r.time_out) : null,
          targetMinutes: r.target_tat_minutes,
        });
        return {
          ...r,
          status_kind: st.kind,
          status_label: st.label,
          elapsed_minutes: st.elapsedMinutes,
          sort_score: st.sortScore,
        };
      })
      .sort((a, b) => b.sort_score - a.sort_score);
  }, [rows, now]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!isOnline) {
    return (
      <AvailableWhenOnline
        title="Patient Tracking available when online"
        detail="Reconnect to load live patient-level TAT statuses."
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
      {subTab === "table" && (
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Status
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value as "all" | TatStatusKind); }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm min-w-[11rem]"
          >
            {STATUS_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={() => subTab === "table" ? void loadTable() : void loadCharts()}
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
        {(["table", "charts"] as SubTab[]).map((t) => (
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
            {t === "table" ? "Progress Table" : "Charts"}
          </button>
        ))}
      </div>

      {filterBar}

      {/* Charts sub-tab */}
      {subTab === "charts" && (
        <>
          {chartLoading && (
            <div className="space-y-4">
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          )}
          {chartError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{chartError}</div>
          )}
          {!chartLoading && chartData && (
            <TatChartsPanel
              pieData={chartData.pieData}
              dailyTrend={chartData.dailyTrend}
              hourlyTrend={chartData.hourlyTrend}
              kpis={chartData.kpis}
              granularity={chartData.granularity}
              label="requests"
            />
          )}
        </>
      )}

      {/* Progress Table sub-tab */}
      {subTab === "table" && (
        <>
          {tableError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{tableError}</div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {tableLoading ? (
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
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Section(s)</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time In</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Daily TAT <span className="font-normal text-slate-400">(min)</span></th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time Expected</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time Out</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Progress</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Delay Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {liveRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                            No rows in this range.
                          </td>
                        </tr>
                      ) : (
                        liveRows.map((r) => {
                          const reqDate = r.requested_at
                            ? new Date(r.requested_at).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "—";
                          const timeExpected =
                            r.time_in
                              ? new Date(
                                  new Date(r.time_in).getTime() + r.target_tat_minutes * 60_000
                                ).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                              : "—";
                          const prog = progressLabel(r.time_in, r.time_out, r.target_tat_minutes);
                          const dstLabel = delayStatusLabel(r.status_kind, r.elapsed_minutes);
                          const dstClass = delayStatusClass(r.status_kind, r.elapsed_minutes);
                          const trLabel = timeRangeLabel(r.elapsed_minutes);

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{reqDate}</td>
                              <td
                                className="px-4 py-3 font-mono text-slate-800 cursor-pointer select-none hover:underline"
                                onDoubleClick={() => setDialogLabNumber(r.lab_number_display)}
                                title="Double-click to view all tests"
                              >
                                {r.lab_number_display}
                              </td>
                              <td className="px-4 py-3 text-slate-700 text-xs">
                                {r.sections.map((s) => resolveSectionLabel(s)).join(", ") || "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDt(r.time_in)}</td>
                              <td className="px-4 py-3 text-slate-700">
                                {r.elapsed_minutes != null ? r.elapsed_minutes : "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{timeExpected}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDt(r.time_out)}</td>
                              <td className={`px-4 py-3 whitespace-nowrap ${prog.cls}`}>{prog.text}</td>
                              <td className={`px-4 py-3 whitespace-nowrap text-xs ${dstClass}`}>{dstLabel}</td>
                              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{trLabel}</td>
                            </tr>
                          );
                        })
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
