"use client";

import "@/components/charts/registry";
import { useEffect, useState, useCallback } from "react";
import LabMetricsTabs from "@/components/dashboard/LabMetricsTabs";
import KpiTwemojiIcon, { type KpiTwemojiId } from "@/components/dashboard/KpiTwemojiIcon";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

// ── Constants ──────────────────────────────────────────────────────────────
const PERIODS = [
  { value: "today",        label: "Today"        },
  { value: "yesterday",    label: "Yesterday"    },
  { value: "thisWeek",     label: "This Week"    },
  { value: "lastWeek",     label: "Last Week"    },
  { value: "thisMonth",    label: "This Month"   },
  { value: "lastMonth",    label: "Last Month"   },
  { value: "thisQuarter",  label: "This Quarter" },
  { value: "thisYear",     label: "This Year"    },
];

const SHIFTS = [
  { value: "all",         label: "All Shifts"  },
  { value: "day shift",   label: "Day Shift"   },
  { value: "night shift", label: "Night Shift" },
];

const LABORATORIES = [
  { value: "all",              label: "All Laboratories"  },
  { value: "Main Laboratory",  label: "Main Laboratory"   },
  { value: "Annex",            label: "Annex"             },
];

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#94a3b8"];

// ── Types ──────────────────────────────────────────────────────────────────
type TATData = {
  pieData: {
    onTime: number;
    delayedLess15: number;
    overDelayed: number;
    notUploaded: number;
  };
  granularity?: "daily" | "monthly";
  dailyTrend: { date: string; delayed: number; onTime: number; notUploaded: number }[];
  hourlyTrend: { hour: number; delayed: number; onTime: number; notUploaded: number }[];
  kpis: {
    totalRequests: number;
    delayedRequests: number;
    onTimeRequests: number;
    avgDailyDelayed: string | number;
    avgDailyOnTime: string | number;
    avgDailyNotUploaded: string | number;
    mostDelayedHour: string;
    mostDelayedDay: string;
  };
};

// ── Sub-components ─────────────────────────────────────────────────────────
function ProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1 text-sm">
        <span className="text-slate-700 font-medium">{label}</span>
        <span className="text-slate-500 text-xs">
          {value.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-right text-xs text-slate-500 mt-0.5">{pct.toFixed(1)}%</div>
    </div>
  );
}

function KPICard({
  title,
  value,
  iconId,
  full,
}: {
  title: string;
  value: string | number;
  iconId: KpiTwemojiId;
  full?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 ${full ? "col-span-2" : ""}`}
    >
      <KpiTwemojiIcon id={iconId} size={40} />
      <p className="text-xs text-slate-500 leading-tight">{title}</p>
      <p className="text-lg font-bold text-slate-800 truncate">{value ?? "—"}</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function TATPage() {
  const [filters, setFilters] = useState({
    period: "thisMonth",
    shift: "all",
    hospitalUnit: "all",
    startDate: "",
    endDate: "",
  });
  const [data, setData] = useState<TATData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateFilter = (key: string, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () =>
    setFilters({ period: "thisMonth", shift: "all", hospitalUnit: "all", startDate: "", endDate: "" });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: DEFAULT_FACILITY_ID, period: filters.period });
      if (filters.shift && filters.shift !== "all") params.append("shift", filters.shift);
      if (filters.hospitalUnit && filters.hospitalUnit !== "all")
        params.append("laboratory", filters.hospitalUnit);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/tat/analytics?${params}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      if (!json.error) setData(json);
      else setData(null);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived chart datasets
  const pieData = data?.pieData
    ? [
        { name: "On Time",             value: data.pieData.onTime        },
        { name: "Delayed <15 min",      value: data.pieData.delayedLess15 },
        { name: "Over Delayed",         value: data.pieData.overDelayed   },
        { name: "Not Uploaded",         value: data.pieData.notUploaded   },
      ]
    : [];

  const hourlyData = (data?.hourlyTrend ?? []).map((h) => ({
    ...h,
    hour: `${String(h.hour).padStart(2, "0")}:00`,
  }));

  const pieLabels = pieData.map((d) => d.name);
  const pieValues = pieData.map((d) => d.value);
  const pieChartData: ChartData<"doughnut"> = {
    labels: pieLabels,
    datasets: [
      {
        data: pieValues,
        backgroundColor: pieLabels.map((_, idx) => PIE_COLORS[idx % PIE_COLORS.length]),
        borderWidth: 0,
      },
    ],
  };
  const pieOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `${Number(ctx.parsed ?? 0).toLocaleString()}`,
        },
      },
    },
  };

  const dailyLabels = (data?.dailyTrend ?? []).map((d) => d.date);
  const dailyChartData: ChartData<"line"> = {
    labels: dailyLabels,
    datasets: [
      {
        label: "On Time",
        data: (data?.dailyTrend ?? []).map((d) => d.onTime),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.10)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35,
      },
      {
        label: "Delayed",
        data: (data?.dailyTrend ?? []).map((d) => d.delayed),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.08)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35,
      },
      {
        label: "Not Uploaded",
        data: (data?.dailyTrend ?? []).map((d) => d.notUploaded),
        borderColor: "#94a3b8",
        backgroundColor: "rgba(148,163,184,0.08)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35,
      },
    ],
  };
  const dailyOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          title: (items) => {
            const raw = items[0]?.label ?? "";
            return typeof raw === "string" ? raw : String(raw);
          },
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          callback: (value, index) => {
            const raw = dailyLabels[index] ?? "";
            return typeof raw === "string" ? raw.slice(5) : String(raw);
          },
        },
      },
      y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } } },
    },
  };

  const hourlyLabels = hourlyData.map((h) => h.hour);
  const hourlyChartData: ChartData<"bar"> = {
    labels: hourlyLabels,
    datasets: [
      {
        label: "On Time",
        data: hourlyData.map((h) => h.onTime),
        backgroundColor: "#10b981",
        stack: "a",
        borderWidth: 0,
      },
      {
        label: "Delayed",
        data: hourlyData.map((h) => h.delayed),
        backgroundColor: "#ef4444",
        stack: "a",
        borderWidth: 0,
      },
      {
        label: "Not Uploaded",
        data: hourlyData.map((h) => h.notUploaded),
        backgroundColor: "#94a3b8",
        stack: "a",
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };
  const hourlyOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 } } },
      y: { stacked: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } } },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Lab Metrics Tab Navigation ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <LabMetricsTabs />
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <h1 className="text-xl font-bold text-slate-800 mr-2">TAT</h1>

          {/* Period */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Period</label>
            <select
              value={filters.period}
              onChange={(e) => updateFilter("period", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Shift */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Shift</label>
            <select
              value={filters.shift}
              onChange={(e) => updateFilter("shift", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {SHIFTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Laboratory */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Laboratory</label>
            <select
              value={filters.hospitalUnit}
              onChange={(e) => updateFilter("hospitalUnit", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {LABORATORIES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter("startDate", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={resetFilters}
            className="text-sm text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-8 bg-emerald-500 rounded animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Main Layout ───────────────────────────────────────────────── */}
      {!isLoading && (
        <main className="flex gap-6 p-6">
          {/* Sidebar */}
          <aside className="w-72 flex-shrink-0 flex flex-col gap-4">
            {/* Progress bars */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              {data ? (
                <>
                  <ProgressBar
                    label="Total Delayed Requests"
                    value={data.kpis.delayedRequests}
                    total={data.kpis.totalRequests}
                    color="#ef4444"
                  />
                  <ProgressBar
                    label="Total On-Time Requests"
                    value={data.kpis.onTimeRequests}
                    total={data.kpis.totalRequests}
                    color="#10b981"
                  />
                </>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No data</p>
              )}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard
                title="Avg Daily On-Time"
                value={data?.kpis.avgDailyOnTime ?? "—"}
                iconId="onTime"
              />
              <KPICard
                title="Avg Daily Delayed"
                value={data?.kpis.avgDailyDelayed ?? "—"}
                iconId="delayed"
              />
              <KPICard
                title="Avg Daily Not Uploaded"
                value={data?.kpis.avgDailyNotUploaded ?? "—"}
                iconId="notUploaded"
              />
              <KPICard
                title="Most Delayed Hour"
                value={data?.kpis.mostDelayedHour ?? "—"}
                iconId="hourly"
              />
              <KPICard
                title="Most Delayed Day"
                value={data?.kpis.mostDelayedDay ?? "—"}
                iconId="calendar"
                full
              />
            </div>
          </aside>

          {/* Charts Area */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* Row 1 – Pie + Line */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TAT Distribution */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="text-emerald-600">◕</span> TAT Performance Distribution
                </h3>
                {pieData.length > 0 ? (
                  <div className="h-[280px]">
                    <Doughnut data={pieChartData} options={pieOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No data available
                  </div>
                )}
              </div>

              {/* Daily TAT Trend */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="text-emerald-600">📈</span>{" "}
                  {data?.granularity === "monthly" ? "Monthly" : "Daily"} TAT Performance Trend
                </h3>
                {(data?.dailyTrend ?? []).length > 0 ? (
                  <div className="h-[280px]">
                    <Line data={dailyChartData} options={dailyOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No trend data available
                  </div>
                )}
              </div>
            </div>

            {/* Row 2 – Hourly */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="text-emerald-600">🕐</span> Hourly TAT Performance Trend
              </h3>
              {hourlyData.length > 0 ? (
                <div className="h-[240px]">
                  <Bar data={hourlyChartData} options={hourlyOptions} />
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No hourly data available
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
