"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LazyBar, LazyLine } from "@/components/charts/LazyCharts";
import AvailableWhenOnline from "@/components/ui/AvailableWhenOnline";
import type { FilterOption } from "@/lib/hooks/useFacilityConfig";
import { useSyncQueue } from "@/lib/SyncQueueContext";
import { computeTatPatientStatus, type TatStatusKind } from "@/lib/tat/patientStatus";
import type { ChartData, ChartOptions } from "chart.js";
import { CHART_AXIS } from "@/lib/chart-theme";

type PerfRow = { count: number; avg_tat_minutes: number };
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

type ApiPerformance = {
  by_section: (PerfRow & { section: string })[];
  by_test: (PerfRow & { test_name: string })[];
  by_day: (PerfRow & { day: string })[];
};

type Props = {
  facilityId: string;
  sectionFilterOptions: FilterOption[];
  resolveSectionLabel: (code: string) => string;
};

const STATUS_FILTERS: { value: "all" | TatStatusKind; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "xhr", label: "XHR" },
  { value: "mins_remaining", label: "Y mins remaining" },
  { value: "delayed_lt15", label: "Delayed <15 min" },
  { value: "over_delayed", label: "Over delayed" },
];

function badgeClass(kind: TatStatusKind): string {
  switch (kind) {
    case "xhr":
      return "bg-emerald-50 text-emerald-800";
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
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function TatPatientLevelTab({
  facilityId,
  sectionFilterOptions,
  resolveSectionLabel,
}: Props) {
  const { isOnline } = useSyncQueue();
  const [tick, setTick] = useState(() => Date.now());
  const defaults = useMemo(() => defaultDateRange(), []);
  const [section, setSection] = useState("all");
  const [status, setStatus] = useState<"all" | TatStatusKind>("all");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [performance, setPerformance] = useState<ApiPerformance>({
    by_section: [],
    by_test: [],
    by_day: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [isOnline]);

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
      if (status && status !== "all") q.set("status", status);
      if (dateFrom) q.set("date_from", dateFrom);
      if (dateTo) q.set("date_to", dateTo);
      const res = await fetch(`/api/tat/patient-level?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load");
      setRows(Array.isArray(j.rows) ? j.rows : []);
      setTotal(typeof j.total === "number" ? j.total : 0);
      setPerformance(j.performance ?? { by_section: [], by_test: [], by_day: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
      setTotal(0);
      setPerformance({ by_section: [], by_test: [], by_day: [] });
    } finally {
      setLoading(false);
    }
  }, [facilityId, page, limit, section, status, dateFrom, dateTo, isOnline]);

  useEffect(() => {
    void load();
  }, [load]);

  // Recompute status every minute client-side without full refetch.
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

  const sectionChartData: ChartData<"bar"> = {
    labels: performance.by_section.map((r) => resolveSectionLabel(r.section)),
    datasets: [
      {
        label: "Avg TAT (min)",
        data: performance.by_section.map((r) => r.avg_tat_minutes),
        backgroundColor: "#21336a",
        borderRadius: 4,
      },
    ],
  };
  const byDayChartData: ChartData<"line"> = {
    labels: performance.by_day.map((r) => r.day),
    datasets: [
      {
        label: "Avg TAT by Day (min)",
        data: performance.by_day.map((r) => r.avg_tat_minutes),
        borderColor: "#2d3f6e",
        backgroundColor: "rgba(45,63,110,0.2)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.35,
      },
    ],
  };
  const byTestChartData: ChartData<"bar"> = {
    labels: performance.by_test.slice(0, 12).map((r) => r.test_name),
    datasets: [
      {
        label: "Avg TAT by test (min)",
        data: performance.by_test.slice(0, 12).map((r) => r.avg_tat_minutes),
        backgroundColor: "#4c5f97",
        borderRadius: 4,
      },
    ],
  };
  const chartOpts: ChartOptions<"bar" | "line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: CHART_AXIS.grid }, ticks: { font: { size: 11 } } },
    },
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!isOnline) {
    return (
      <AvailableWhenOnline
        title="Patient Tracking available when online"
        detail="Reconnect to load live patient-level TAT statuses and performance trends."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Section
          <select
            value={section}
            onChange={(e) => {
              setPage(1);
              setSection(e.target.value);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm min-w-[10rem]"
          >
            {sectionFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Status
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as "all" | TatStatusKind);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm min-w-[11rem]"
          >
            {STATUS_FILTERS.map((o) => (
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
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Lab Number</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tests requested</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Section(s)</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Time In</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Target TAT</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Elapsed</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No rows in this range.
                      </td>
                    </tr>
                  ) : (
                    liveRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-slate-800">{r.lab_number_display}</td>
                        <td className="px-4 py-3 text-slate-800">{r.tests_requested.join(", ") || "—"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.sections.map((s) => resolveSectionLabel(s)).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDt(r.time_in)}</td>
                        <td className="px-4 py-3 text-slate-700">{r.target_tat_minutes} min</td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.elapsed_minutes != null ? `${r.elapsed_minutes} min` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badgeClass(r.status_kind)}`}>
                            {r.status_label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Average TAT by section</h3>
          <div className="h-[240px]">
            {performance.by_section.length > 0 ? (
              <LazyBar data={sectionChartData} options={chartOpts as ChartOptions<"bar">} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No section performance data</div>
            )}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Average TAT by test</h3>
          <div className="h-[240px]">
            {performance.by_test.length > 0 ? (
              <LazyBar data={byTestChartData} options={chartOpts as ChartOptions<"bar">} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No test performance data</div>
            )}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Average TAT by day</h3>
          <div className="h-[240px]">
            {performance.by_day.length > 0 ? (
              <LazyLine data={byDayChartData} options={chartOpts as ChartOptions<"line">} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No daily performance data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
