"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import KpiTwemojiIcon, { type KpiTwemojiId } from "@/components/dashboard/KpiTwemojiIcon";
import { LazyBar, LazyDoughnut, LazyLine } from "@/components/charts/LazyCharts";
import type { ChartData, ChartOptions } from "chart.js";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { useFacilityConfig } from "@/lib/hooks/useFacilityConfig";
import LabMetricsConfigEmpty from "@/components/dashboard/LabMetricsConfigEmpty";
import LimsTestDataEmpty from "@/components/dashboard/LimsTestDataEmpty";
import { useTestRequestsEmpty } from "@/lib/hooks/useTestRequestsEmpty";
import PageLoader from "@/components/ui/PageLoader";
import { CircleDot, TrendingUp, TrendingDown, TestTube, Building2 } from "lucide-react";

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

const SECTION_COLORS = [
  "#21336a", "#2d3f6e", "#3b4f84", "#5a6fa8",
  "#7f91c0", "#9fb0d6", "#c2cde6", "#d9e1f2",
];

const UNIT_COLORS = [
  "#1e3a5f", "#264d7a", "#2e6099", "#3573b8",
  "#4a89c9", "#6fa0d5", "#95b8e0", "#bad0ec",
];

// ── Types ──────────────────────────────────────────────────────────────────
type RevenueData = {
  today: number;
  yesterday: number;
  sameDayLastWeek: number;
  totalRevenue: number;
  targetRevenue: number;
  avgDailyRevenue: number;
  revenueGrowthRate: number;
  dailyRevenue: { date: string; revenue: number }[];
  sectionRevenue: { section: string; revenue: number }[];
  testRevenue: { test_name: string; revenue: number }[];
  hospitalUnitRevenue: { unit: string; revenue: number }[];
  cancellationRate: number;
  pendingCount: number;
  cancelledCount: number;
};

function fmtUGX(v: number) {
  return `UGX ${v.toLocaleString()}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function KPICard({
  title,
  value,
  sub,
  full,
  iconId,
}: {
  title: string;
  value: string;
  sub?: string;
  full?: boolean;
  iconId?: KpiTwemojiId;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 ${full ? "col-span-2" : ""}`}>
      {iconId && <KpiTwemojiIcon id={iconId} size={40} />}
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-lg font-bold text-slate-800 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function TargetProgress({
  label,
  value,
  target,
  format,
}: {
  label: string;
  value: number;
  target: number;
  format: (v: number) => string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{target > 0 ? `${pct.toFixed(0)}%` : "–"}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: "var(--module-primary)" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{format(value)}</span>
        {target > 0 && <span className="text-slate-300">/ {format(target)}</span>}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function RevenuePage() {
  const { facilityAuth } = useAuth();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  const {
    loading: labConfigLoading,
    sectionFilterOptions,
    shiftFilterOptions,
    resolveSectionLabel,
    hasConfiguredSections,
  } = useFacilityConfig(facilityId);
  const { loading: testRequestsLoading, empty: testRequestsEmpty } = useTestRequestsEmpty(facilityId);

  const [filters, setFilters] = useState({
    period: "thisMonth",
    labSection: "all",
    shift: "all",
    testName: "",
    startDate: "",
    endDate: "",
  });
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateFilter = (key: string, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () =>
    setFilters({ period: "thisMonth", labSection: "all", shift: "all", testName: "", startDate: "", endDate: "" });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: facilityId, period: filters.period });
      if (filters.labSection && filters.labSection !== "all") params.append("labSection", filters.labSection);
      if (filters.shift && filters.shift !== "all") params.append("shift", filters.shift);
      if (filters.testName?.trim()) params.append("testName", filters.testName.trim());
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/revenue?${params}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      if (json.data && !json.error) setData(json.data);
      else setData(null);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [filters, facilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalRevenue = data?.totalRevenue ?? (data?.dailyRevenue ?? []).reduce((s, d) => s + d.revenue, 0);
  const targetRevenue = data?.targetRevenue ?? 0;
  const avgDaily = data?.avgDailyRevenue ?? 0;
  const growthRate = data?.revenueGrowthRate ?? 0;

  // Filter test revenue by test name if provided
  const filteredTestRevenue = filters.testName.trim()
    ? (data?.testRevenue ?? []).filter((t) =>
        t.test_name.toLowerCase().includes(filters.testName.trim().toLowerCase())
      )
    : (data?.testRevenue ?? []).slice(0, 30);

  const sectionRevenue = data?.sectionRevenue;
  const sectionLabels = useMemo(
    () => (sectionRevenue ?? []).map((d) => resolveSectionLabel(d.section)),
    [sectionRevenue, resolveSectionLabel]
  );
  const sectionValues = (sectionRevenue ?? []).map((d) => d.revenue);
  const sectionColors = sectionLabels.map((_, idx) => SECTION_COLORS[idx % SECTION_COLORS.length]);
  const sectionChartData: ChartData<"doughnut"> = {
    labels: sectionLabels,
    datasets: [
      {
        data: sectionValues,
        backgroundColor: sectionColors,
        borderWidth: 0,
      },
    ],
  };
  const sectionOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => fmtUGX(Number(ctx.parsed ?? 0)),
        },
      },
    },
  };

  const dailyLabels = (data?.dailyRevenue ?? []).map((d) => d.date);
  const dailyValues = (data?.dailyRevenue ?? []).map((d) => d.revenue);
  const dailyChartData: ChartData<"line"> = {
    labels: dailyLabels,
    datasets: [
      {
        label: "Revenue",
        data: dailyValues,
        borderColor: "#21336a",
        backgroundColor: "rgba(33,51,106,0.10)",
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
          label: (ctx) => `${ctx.dataset.label}: ${fmtUGX(Number(ctx.parsed.y ?? 0))}`,
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
      y: {
        grid: { color: "#f1f5f9" },
        ticks: {
          font: { size: 10 },
          callback: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  const testLabels = filteredTestRevenue.map((t) => t.test_name);
  const testValues = filteredTestRevenue.map((t) => t.revenue);
  const testChartData: ChartData<"bar"> = {
    labels: testLabels,
    datasets: [
      {
        label: "Revenue",
        data: testValues,
        backgroundColor: "#2d3f6e",
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  };
  const testOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => fmtUGX(Number(ctx.parsed.x ?? 0)),
        },
      },
    },
    scales: {
      x: {
        grid: { color: "#f1f5f9" },
        ticks: {
          font: { size: 10 },
          callback: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
        },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  };

  // Hospital Unit Revenue chart data
  const hospitalUnits = data?.hospitalUnitRevenue ?? [];
  const unitLabels = hospitalUnits.map((u) => u.unit);
  const unitValues = hospitalUnits.map((u) => u.revenue);
  const unitChartData: ChartData<"bar"> = {
    labels: unitLabels,
    datasets: [
      {
        label: "Revenue",
        data: unitValues,
        backgroundColor: unitLabels.map((_, idx) => UNIT_COLORS[idx % UNIT_COLORS.length]),
        borderRadius: 4,
        barThickness: 18,
      },
    ],
  };
  const unitOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => fmtUGX(Number(ctx.parsed.y ?? 0)),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: {
          font: { size: 10 },
          callback: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {!labConfigLoading && !hasConfiguredSections && (
        <LabMetricsConfigEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
      )}
      {!labConfigLoading &&
        !testRequestsLoading &&
        hasConfiguredSections &&
        testRequestsEmpty && (
          <div className="px-6 pt-4">
            <LimsTestDataEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
          </div>
        )}
      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <h1 className="text-xl font-bold text-slate-800 mr-2">Revenue</h1>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Period</label>
            <select
              value={filters.period}
              onChange={(e) => updateFilter("period", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lab Section</label>
            <select
              value={filters.labSection}
              onChange={(e) => updateFilter("labSection", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
            >
              {sectionFilterOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Shift</label>
            <select
              value={filters.shift}
              onChange={(e) => updateFilter("shift", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
            >
              {shiftFilterOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Test Name</label>
            <input
              type="text"
              value={filters.testName}
              onChange={(e) => updateFilter("testName", e.target.value)}
              placeholder="Filter by test..."
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)] w-40"
            />
          </div>

          <button
            onClick={resetFilters}
            className="text-sm module-accent-text border rounded-lg px-3 py-1.5 transition-colors"
            style={{ borderColor: "var(--module-primary)" }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && <PageLoader variant="inline" />}

      {/* Main Layout */}
      {!isLoading && (
        <main className="flex gap-6 p-6">
          {/* Sidebar */}
          <aside className="w-72 flex-shrink-0 flex flex-col gap-4">
            {/* Total Revenue Card with Target Progress */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <KpiTwemojiIcon id="moneyBag" size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold module-accent-text">{fmtUGX(totalRevenue)}</p>
                </div>
              </div>

              {targetRevenue > 0 && (
                <div className="mb-4">
                  <TargetProgress
                    label="vs Monthly Target"
                    value={totalRevenue}
                    target={targetRevenue}
                    format={fmtUGX}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Today</span>
                  <span className="font-medium text-slate-800">{fmtUGX(data?.today ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Yesterday</span>
                  <span className="font-medium text-slate-800">{fmtUGX(data?.yesterday ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Same Day Last Week</span>
                  <span className="font-medium text-slate-800">{fmtUGX(data?.sameDayLastWeek ?? 0)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <KPICard
                title="Avg. Daily Revenue"
                value={fmtUGX(avgDaily)}
                iconId="banknote"
                full
              />
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                <div className={`flex items-center gap-1 ${growthRate >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {growthRate >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  <span className="text-lg font-bold">
                    {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500">Revenue Growth</p>
                <p className="text-xs text-slate-400">period over period</p>
              </div>
              <KPICard
                title="Cancellation Rate"
                value={`${(data?.cancellationRate ?? 0).toFixed(1)}%`}
                iconId="crossMark"
              />
              <KPICard
                title="Pending"
                value={String(data?.pendingCount ?? 0)}
                iconId="pending"
              />
            </div>
          </aside>

          {/* Charts */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* Row 1 – Doughnut + Line */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Section Revenue Doughnut */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <CircleDot size={16} className="module-accent-text" /> Revenue by Laboratory Section
                </h3>
                {(data?.sectionRevenue ?? []).length > 0 ? (
                  <div className="h-[280px]">
                    <LazyDoughnut data={sectionChartData} options={sectionOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No data available
                  </div>
                )}
              </div>

              {/* Daily Revenue Line */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="module-accent-text" /> Daily Revenue
                </h3>
                {(data?.dailyRevenue ?? []).length > 0 ? (
                  <div className="h-[280px]">
                    <LazyLine data={dailyChartData} options={dailyOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Row 2 – Hospital Unit Revenue bar */}
            {hospitalUnits.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Building2 size={16} className="module-accent-text" /> Hospital Unit Revenue
                </h3>
                <div className="h-[240px]">
                  <LazyBar data={unitChartData} options={unitOptions} />
                </div>
              </div>
            )}

            {/* Revenue by Test – horizontal bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TestTube size={16} className="module-accent-text" /> Revenue by Test
                </h3>
                {filters.testName && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    Filtering: &ldquo;{filters.testName}&rdquo;
                  </span>
                )}
              </div>
              {filteredTestRevenue.length > 0 ? (
                <div className="w-full" style={{ height: Math.max(300, filteredTestRevenue.length * 26) }}>
                  <LazyBar data={testChartData} options={testOptions} />
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No data available
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
