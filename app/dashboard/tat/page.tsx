"use client";

import "@/components/charts/registry";
import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import KpiTwemojiIcon, { type KpiTwemojiId } from "@/components/dashboard/KpiTwemojiIcon";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { useFacilityConfig } from "@/lib/hooks/useFacilityConfig";
import LabMetricsConfigEmpty from "@/components/dashboard/LabMetricsConfigEmpty";
import { useFlag } from "@/lib/featureFlags";
import PageLoader from "@/components/ui/PageLoader";
import { CHART_AXIS, CHART_TAT } from "@/lib/chart-theme";
import { STATUS } from "@/lib/design-tokens";
import { CircleDot, TrendingUp, Clock3 } from "lucide-react";

// REGRESSIVE DESIGN: Reception tab hidden by default. Show via PostHog flag 'show-reception-tab' when LIMS does not provide reception_time and result_time. Tests Level and Patient Level tabs stub pending LIMS connection (see ENG LIMS group).

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

type TatTab = "overview" | "performance" | "tests-level" | "patient-level" | "progress" | "lrids" | "reception";

type PerformanceData = {
  totalResulted: number;
  totalReceived: number;
  avgTatMinutes: number;
  breachCount: number;
  bySection: { section: string; count: number; avgTat: number }[];
};

type LRIDSItem = {
  id: string;
  lab_number?: string;
  test_name: string;
  section: string;
  status: string;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { facilityAuth } = useAuth();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  const {
    loading: labConfigLoading,
    shiftFilterOptions,
    laboratoryFilterOptions,
    resolveSectionLabel,
    hasConfiguredSections,
  } = useFacilityConfig(facilityId);
  const showReceptionTab = useFlag("show-reception-tab");
  const showLrids = useFlag("show-lrids");
  const requestedTab = (searchParams.get("tab") || "overview") as TatTab;

  const allowedTabs = new Set<TatTab>([
    "overview",
    "performance",
    "tests-level",
    "patient-level",
    "progress",
  ]);
  if (showLrids) allowedTabs.add("lrids");
  if (showReceptionTab) allowedTabs.add("reception");

  const activeTab: TatTab = allowedTabs.has(requestedTab) ? requestedTab : "overview";

  const [filters, setFilters] = useState({
    period: "thisMonth",
    shift: "all",
    hospitalUnit: "all",
    startDate: "",
    endDate: "",
  });
  const [data, setData] = useState<TATData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [lrids, setLrids] = useState<LRIDSItem[]>([]);

  const setTab = (tab: TatTab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const updateFilter = (key: string, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () =>
    setFilters({ period: "thisMonth", shift: "all", hospitalUnit: "all", startDate: "", endDate: "" });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: facilityId, period: filters.period });
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
  }, [filters, facilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab !== "performance") return;
    (async () => {
      try {
        const res = await fetch(`/api/performance?facility_id=${facilityId}&period=today`);
        const json = await res.json();
        setPerformanceData(json.data ?? null);
      } catch {
        setPerformanceData(null);
      }
    })();
  }, [activeTab, facilityId]);

  useEffect(() => {
    if (activeTab !== "lrids") return;
    (async () => {
      try {
        const res = await fetch(`/api/tat/lrids?facility_id=${facilityId}&limit=100`);
        const json = await res.json();
        setLrids(json.data ?? []);
      } catch {
        setLrids([]);
      }
    })();
  }, [activeTab, facilityId]);

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
        backgroundColor: pieLabels.map((_, idx) => CHART_TAT.pie[idx % CHART_TAT.pie.length]),
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
        borderColor: CHART_TAT.lineOnTime.border,
        backgroundColor: CHART_TAT.lineOnTime.fill,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35,
      },
      {
        label: "Delayed",
        data: (data?.dailyTrend ?? []).map((d) => d.delayed),
        borderColor: CHART_TAT.lineDelayed.border,
        backgroundColor: CHART_TAT.lineDelayed.fill,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35,
      },
      {
        label: "Not Uploaded",
        data: (data?.dailyTrend ?? []).map((d) => d.notUploaded),
        borderColor: CHART_TAT.lineNotUploaded.border,
        backgroundColor: CHART_TAT.lineNotUploaded.fill,
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
      y: { grid: { color: CHART_AXIS.grid }, ticks: { font: { size: 11 } } },
    },
  };

  const hourlyLabels = hourlyData.map((h) => h.hour);
  const hourlyChartData: ChartData<"bar"> = {
    labels: hourlyLabels,
    datasets: [
      {
        label: "On Time",
        data: hourlyData.map((h) => h.onTime),
        backgroundColor: CHART_TAT.barOnTime,
        stack: "a",
        borderWidth: 0,
      },
      {
        label: "Delayed",
        data: hourlyData.map((h) => h.delayed),
        backgroundColor: CHART_TAT.barDelayed,
        stack: "a",
        borderWidth: 0,
      },
      {
        label: "Not Uploaded",
        data: hourlyData.map((h) => h.notUploaded),
        backgroundColor: CHART_TAT.barNotUploaded,
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
      y: { stacked: true, grid: { color: CHART_AXIS.grid }, ticks: { font: { size: 11 } } },
    },
  };

  const perfSectionRows = useMemo(
    () => performanceData?.bySection ?? [],
    [performanceData?.bySection]
  );
  const perfSectionDisplayLabels = useMemo(
    () => perfSectionRows.map((s) => resolveSectionLabel(s.section)),
    [perfSectionRows, resolveSectionLabel]
  );
  const perfCountData: ChartData<"bar"> = {
    labels: perfSectionDisplayLabels,
    datasets: [
      {
        label: "Tests",
        data: perfSectionRows.map((s) => s.count),
        backgroundColor: "#21336a",
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  };
  const perfTatData: ChartData<"bar"> = {
    labels: perfSectionDisplayLabels,
    datasets: [
      {
        label: "Avg TAT (min)",
        data: perfSectionRows.map((s) => s.avgTat),
        backgroundColor: "#2d3f6e",
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  };
  const perfBarOpts: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { color: CHART_AXIS.grid } }, y: { grid: { display: false } } },
  };

  const tatTabs: { id: TatTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "tests-level", label: "Tests Level" },
    { id: "patient-level", label: "Patient Level" },
    { id: "progress", label: "Progress" },
    ...(showLrids ? [{ id: "lrids" as TatTab, label: "LRIDS" }] : []),
    ...(showReceptionTab ? [{ id: "reception" as TatTab, label: "Reception" }] : []),
  ];

  if (activeTab !== "overview") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex items-center border-b border-slate-200 overflow-x-auto bg-white px-6">
          {tatTabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === t.id ? "border-[var(--module-primary)] module-accent-text" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {!labConfigLoading && !hasConfiguredSections && (
            <LabMetricsConfigEmpty
              canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel}
            />
          )}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TAT Performance</h1>
                <p className="text-sm text-slate-500 mt-0.5">Performance indicators and section-level TAT analysis.</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Tests Resulted" value={(performanceData?.totalResulted ?? 0).toLocaleString()} iconId="testsResulted" />
                <KPICard title="Tests Received" value={(performanceData?.totalReceived ?? 0).toLocaleString()} iconId="testsReceived" />
                <KPICard title="Avg. TAT (min)" value={String(performanceData?.avgTatMinutes ?? 0)} iconId="avgTat" />
                <KPICard title="TAT Breaches" value={(performanceData?.breachCount ?? 0).toLocaleString()} iconId="breaches" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"><h3 className="text-sm font-semibold text-slate-700 mb-4">Tests Resulted by Section</h3><div className="h-[260px]">{perfSectionRows.length ? <Bar data={perfCountData} options={perfBarOpts} /> : <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>}</div></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"><h3 className="text-sm font-semibold text-slate-700 mb-4">Avg. TAT by Section</h3><div className="h-[260px]">{perfSectionRows.length ? <Bar data={perfTatData} options={perfBarOpts} /> : <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>}</div></div>
              </div>
            </div>
          )}
          {activeTab === "lrids" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">LRIDS</h1>
              <p className="text-sm text-slate-500">Laboratory Result Information Display board.</p>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold text-slate-600">Lab #</th><th className="px-4 py-3 text-left font-semibold text-slate-600">Test</th><th className="px-4 py-3 text-left font-semibold text-slate-600">Section</th><th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{lrids.map((r) => <tr key={r.id}><td className="px-4 py-3">{r.lab_number ?? "—"}</td><td className="px-4 py-3">{r.test_name}</td><td className="px-4 py-3">{resolveSectionLabel(r.section)}</td><td className="px-4 py-3">{r.status}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === "tests-level" && <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">Coming soon — requires LIMS data connection. Connect your LIMS in Admin → Data Connections.</div>}
          {activeTab === "patient-level" && <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">Coming soon — requires LIMS data connection. Connect your LIMS in Admin → Data Connections.</div>}
          {activeTab === "progress" && <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">Showing performance data from the Performance tab above while LIMS integration is pending.</div>}
          {activeTab === "reception" && <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">This tab appears when your LIMS does not supply reception timestamps automatically. Connect LIMS or enable manual reception logging.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center border-b border-slate-200 overflow-x-auto bg-white px-6">
        {tatTabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === t.id ? "border-[var(--module-primary)] module-accent-text" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}>
            {t.label}
          </button>
        ))}
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
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
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
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
            >
              {shiftFilterOptions.map((s) => (
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
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
            >
              {laboratoryFilterOptions.map((l) => (
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
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
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

      {!labConfigLoading && !hasConfiguredSections && (
        <LabMetricsConfigEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
      )}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {isLoading && <PageLoader variant="inline" />}

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
                    color={STATUS.BAD}
                  />
                  <ProgressBar
                    label="Total On-Time Requests"
                    value={data.kpis.onTimeRequests}
                    total={data.kpis.totalRequests}
                    color={STATUS.OK}
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
                  <CircleDot size={16} className="module-accent-text" /> TAT Performance Distribution
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
                  <TrendingUp size={16} className="module-accent-text" />{" "}
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
                <Clock3 size={16} className="module-accent-text" /> Hourly TAT Performance Trend
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
