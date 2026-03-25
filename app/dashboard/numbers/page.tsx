"use client";

import { useEffect, useState, useCallback } from "react";
import LabMetricsTabs from "@/components/dashboard/LabMetricsTabs";
import "@/components/charts/registry";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

// ── Constants ──────────────────────────────────────────────────────────────
const PERIODS = [
  { value: "today",       label: "Today"        },
  { value: "yesterday",   label: "Yesterday"    },
  { value: "thisWeek",    label: "This Week"    },
  { value: "lastWeek",    label: "Last Week"    },
  { value: "thisMonth",   label: "This Month"   },
  { value: "lastMonth",   label: "Last Month"   },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "thisYear",    label: "This Year"    },
];

const SHIFTS = [
  { value: "all",         label: "All Shifts"  },
  { value: "day shift",   label: "Day Shift"   },
  { value: "night shift", label: "Night Shift" },
];

const LABORATORIES = [
  { value: "all",             label: "All Laboratories" },
  { value: "Main Laboratory", label: "Main Laboratory"  },
  { value: "Annex",           label: "Annex"            },
];

// ── Types ──────────────────────────────────────────────────────────────────
type NumbersData = {
  totalRequests: number;
  targetRequests: number;
  requestsPercentage: number;
  totalTests: number;
  targetTests: number;
  avgDailyRequests: number;
  avgDailyTests: number;
  busiestHour: string | null;
  busiestDay: string | null;
  dailyRequestVolume: { date: string; count: number }[];
  hourlyRequestVolume: { hour: number; count: number }[];
  granularity?: "daily" | "monthly";
};

// ── Sub-components ─────────────────────────────────────────────────────────
function TargetProgress({
  current,
  target,
  title,
  tooltip,
}: {
  current: number;
  target: number;
  title: string;
  tooltip?: string;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className="mb-5" title={tooltip}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="text-sm font-bold text-emerald-600">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{current.toLocaleString()}</span>
        <span>of {target.toLocaleString()} target</span>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  tooltip,
  full,
}: {
  title: string;
  value: string | number;
  tooltip?: string;
  full?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-4 ${full ? "col-span-2" : ""}`}
      title={tooltip}
    >
      <p className="text-xs text-slate-500 mb-1">{title}</p>
      <p className="text-xl font-bold text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function NumbersPage() {
  const [filters, setFilters] = useState({
    period: "thisMonth",
    shift: "all",
    hospitalUnit: "all",
    startDate: "",
    endDate: "",
  });
  const [data, setData] = useState<NumbersData | null>(null);
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

      const res = await fetch(`/api/numbers?${params}`);
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

  const hourlyData = (data?.hourlyRequestVolume ?? []).map((h) => ({
    hour: `${String(h.hour).padStart(2, "0")}:00`,
    count: h.count,
  }));

  const dailyLabels = (data?.dailyRequestVolume ?? []).map((d) => d.date);
  const dailyValues = (data?.dailyRequestVolume ?? []).map((d) => d.count);
  const dailyChartData: ChartData<"bar"> = {
    labels: dailyLabels,
    datasets: [
      { label: "Requests", data: dailyValues, backgroundColor: "#10b981", borderRadius: 4 },
    ],
  };
  const dailyOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `Requests: ${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
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
      y: { ticks: { font: { size: 11 } }, grid: { color: "#f1f5f9" } },
    },
  };

  const hourlyLabels = hourlyData.map((d) => d.hour);
  const hourlyValues = hourlyData.map((d) => d.count);
  const hourlyChartData: ChartData<"bar"> = {
    labels: hourlyLabels,
    datasets: [
      { label: "Requests", data: hourlyValues, backgroundColor: "#059669", borderRadius: 4 },
    ],
  };
  const hourlyOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `Requests: ${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 } } },
      y: { ticks: { font: { size: 11 } }, grid: { color: "#f1f5f9" } },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Lab Metrics Tab Navigation ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <LabMetricsTabs />
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <h1 className="text-xl font-bold text-slate-800 mr-2">Numbers</h1>

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

      {/* Loading */}
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

      {/* Main Layout */}
      {!isLoading && (
        <main className="flex gap-6 p-6">
          {/* Sidebar */}
          <aside className="w-72 flex-shrink-0 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              {data ? (
                <TargetProgress
                  current={data.totalRequests}
                  target={data.targetRequests || 1}
                  title="Total Requests"
                  tooltip="Target is prorated for the selected date range"
                />
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No data</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <KPICard
                title="Avg Daily Requests"
                value={data?.avgDailyRequests?.toFixed(1) ?? "0"}
                tooltip="For the selected date range"
                full
              />
              <KPICard
                title="Busiest Hour"
                value={data?.busiestHour ?? (data ? "—" : "N/A")}
                tooltip="For the selected date range"
              />
              <KPICard
                title="Busiest Day"
                value={data?.busiestDay ?? (data ? "—" : "N/A")}
                tooltip="For the selected date range"
                full
              />
            </div>
          </aside>

          {/* Charts */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* Daily Volume */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="text-emerald-600">📊</span>{" "}
                {data?.granularity === "monthly" ? "Monthly" : "Daily"} Request Volume
              </h3>
              {(data?.dailyRequestVolume ?? []).length > 0 ? (
                <div className="h-[240px]">
                  <Bar data={dailyChartData} options={dailyOptions} />
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No data available for the selected period
                </div>
              )}
            </div>

            {/* Hourly Volume */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="text-emerald-600">🕐</span> Hourly Request Volume
              </h3>
              {hourlyData.length > 0 ? (
                <div className="h-[220px]">
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
