"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import KpiTwemojiIcon, { type KpiTwemojiId } from "@/components/dashboard/KpiTwemojiIcon";
import { LazyBar } from "@/components/charts/LazyCharts";
import type { ChartData, ChartOptions } from "chart.js";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { useFacilityConfig } from "@/lib/hooks/useFacilityConfig";
import LabMetricsConfigEmpty from "@/components/dashboard/LabMetricsConfigEmpty";
import LimsTestDataEmpty from "@/components/dashboard/LimsTestDataEmpty";
import { useTestRequestsEmpty } from "@/lib/hooks/useTestRequestsEmpty";
import PageLoader from "@/components/ui/PageLoader";
import Tooltip from "@/components/ui/Tooltip";
import { BarChart3, Clock3, Info, FlaskConical, TestTube } from "lucide-react";

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
  dailyTestVolume?: { date: string; count: number }[];
  hourlyRequestVolume: { hour: number; count: number }[];
  granularity?: "daily" | "monthly";
};

type TestsData = {
  totalTestsPerformed: number;
  targetTestsPerformed: number;
  percentage: number;
  avgDailyTests: number;
  testVolumeTrend: { date: string; count: number }[];
  topTestsBySection: { section: string; tests: { test: string; count: number }[] }[];
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
    <div className="mb-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {tooltip && (
            <Tooltip label={title} description={tooltip} side="top">
              <Info size={13} className="cursor-help flex-shrink-0 text-slate-400" />
            </Tooltip>
          )}
        </div>
        <span className="text-sm font-bold module-accent-text">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: "var(--module-primary)" }}
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
  iconId,
}: {
  title: string;
  value: string | number;
  tooltip?: string;
  full?: boolean;
  iconId?: KpiTwemojiId;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 ${full ? "col-span-2" : ""}`}>
      {iconId && <KpiTwemojiIcon id={iconId} size={40} />}
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-slate-500">{title}</p>
        {tooltip && (
          <Tooltip label={title} description={tooltip} side="top">
            <Info size={13} className="cursor-help flex-shrink-0 text-slate-400" />
          </Tooltip>
        )}
      </div>
      <p className="text-xl font-bold text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

function SectionDivider({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2 module-accent-text font-bold text-base">
        {icon}
        <span>{title}</span>
      </div>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function NumbersPage() {
  const { facilityAuth } = useAuth();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  const {
    loading: labConfigLoading,
    shiftFilterOptions,
    laboratoryFilterOptions,
    sectionFilterOptions,
    hasConfiguredSections,
  } = useFacilityConfig(facilityId);
  const { loading: testRequestsLoading, empty: testRequestsEmpty } = useTestRequestsEmpty(facilityId);

  const [activeTab, setActiveTab] = useState<"patients" | "tests">("patients");

  const [pFilters, setPFilters] = useState({ period: "thisMonth", shift: "all", hospitalUnit: "all", startDate: "", endDate: "" });
  const [tFilters, setTFilters] = useState({ period: "thisMonth", labSection: "all", startDate: "", endDate: "" });

  const [data, setData] = useState<NumbersData | null>(null);
  const [testsData, setTestsData] = useState<TestsData | null>(null);
  const [pLoading, setPLoading] = useState(true);
  const [tLoading, setTLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState("all");

  const fetchPatients = useCallback(async () => {
    setPLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: facilityId, period: pFilters.period });
      if (pFilters.shift !== "all") params.append("shift", pFilters.shift);
      if (pFilters.hospitalUnit !== "all") params.append("laboratory", pFilters.hospitalUnit);
      if (pFilters.startDate) params.append("startDate", pFilters.startDate);
      if (pFilters.endDate) params.append("endDate", pFilters.endDate);
      const res = await fetch(`/api/numbers?${params}`);
      if (res.ok) { const j = await res.json(); if (!j.error) setData(j); }
    } catch { setData(null); } finally { setPLoading(false); }
  }, [facilityId, pFilters]);

  const fetchTests = useCallback(async () => {
    setTLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: facilityId, period: tFilters.period });
      if (tFilters.labSection !== "all") params.append("section", tFilters.labSection);
      if (tFilters.startDate) params.append("startDate", tFilters.startDate);
      if (tFilters.endDate) params.append("endDate", tFilters.endDate);
      const res = await fetch(`/api/tests?${params}`);
      if (res.ok) { const j = await res.json(); if (!j.error) setTestsData(j); }
    } catch { setTestsData(null); } finally { setTLoading(false); }
  }, [facilityId, tFilters]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { fetchTests(); }, [fetchTests]);

  // ── Numbers chart data ────────────────────────────────────────────────────

  const hourlyData = (data?.hourlyRequestVolume ?? []).map((h) => ({
    hour: `${String(h.hour).padStart(2, "0")}:00`,
    count: h.count,
  }));

  const dailyLabels = (data?.dailyRequestVolume ?? []).map((d) => d.date);
  const dailyValues = (data?.dailyRequestVolume ?? []).map((d) => d.count);
  const dailyChartData: ChartData<"bar"> = {
    labels: dailyLabels,
    datasets: [{ label: "Requests", data: dailyValues, backgroundColor: "#21336a", borderRadius: 4 }],
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
    datasets: [{ label: "Requests", data: hourlyValues, backgroundColor: "#2d3f6e", borderRadius: 4 }],
  };
  const hourlyOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 } } },
      y: { ticks: { font: { size: 11 } }, grid: { color: "#f1f5f9" } },
    },
  };

  // ── Tests chart data ──────────────────────────────────────────────────────

  const testVolumeTrend = testsData?.testVolumeTrend ?? [];
  const testDailyLabels = testVolumeTrend.map((d) => d.date);
  const testDailyValues = testVolumeTrend.map((d) => d.count);
  const testDailyChartData: ChartData<"bar"> = {
    labels: testDailyLabels,
    datasets: [{ label: "Tests", data: testDailyValues, backgroundColor: "#3b5998", borderRadius: 4 }],
  };
  const testDailyOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `Tests: ${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          callback: (value, index) => {
            const raw = testDailyLabels[index] ?? "";
            return typeof raw === "string" ? raw.slice(5) : String(raw);
          },
        },
      },
      y: { ticks: { font: { size: 11 } }, grid: { color: "#f1f5f9" } },
    },
  };

  // Aggregate top tests across all sections or selected unit
  const availableUnits = useMemo(() => {
    const sections = (testsData?.topTestsBySection ?? []).map((s) => s.section);
    return ["all", ...sections];
  }, [testsData]);

  const topTests = useMemo(() => {
    if (!testsData?.topTestsBySection) return [];
    const secs = testsData.topTestsBySection;
    const src =
      selectedUnit === "all"
        ? secs.flatMap((s) => s.tests)
        : (secs.find((s) => s.section === selectedUnit)?.tests ?? []);
    const agg: Record<string, number> = {};
    for (const t of src) agg[t.test] = (agg[t.test] ?? 0) + t.count;
    return Object.entries(agg)
      .map(([test, count]) => ({ test, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }, [testsData, selectedUnit]);

  const topTestLabels = topTests.map((t) => t.test);
  const topTestValues = topTests.map((t) => t.count);
  const topTestChartData: ChartData<"bar"> = {
    labels: topTestLabels,
    datasets: [
      {
        label: "Count",
        data: topTestValues,
        backgroundColor: "#4c5f97",
        borderRadius: 3,
        barThickness: 14,
      },
    ],
  };
  const topTestOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Count: ${Number(ctx.parsed.x ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {!labConfigLoading && !hasConfiguredSections && (
        <LabMetricsConfigEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
      )}
      {!labConfigLoading && !testRequestsLoading && hasConfiguredSections && testRequestsEmpty && (
        <div className="px-6 pt-4">
          <LimsTestDataEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
        </div>
      )}

      {/* Header + Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4">
        <h1 className="text-xl font-bold text-slate-800 mb-3">Volume</h1>
        <div className="flex gap-0">
          {(["patients", "tests"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-[var(--module-primary)] text-[var(--module-primary)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab === "patients" ? "Patient Requests" : "Tests"}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Requests filter bar */}
      {activeTab === "patients" && (
        <div className="bg-white border-b border-slate-100 px-6 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Period</label>
              <select value={pFilters.period} onChange={(e) => setPFilters((p) => ({ ...p, period: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]">
                {PERIODS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Shift</label>
              <select value={pFilters.shift} onChange={(e) => setPFilters((p) => ({ ...p, shift: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]">
                {shiftFilterOptions.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Laboratory</label>
              <select value={pFilters.hospitalUnit} onChange={(e) => setPFilters((p) => ({ ...p, hospitalUnit: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]">
                {laboratoryFilterOptions.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Start Date</label>
              <input type="date" value={pFilters.startDate} onChange={(e) => setPFilters((p) => ({ ...p, startDate: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">End Date</label>
              <input type="date" value={pFilters.endDate} onChange={(e) => setPFilters((p) => ({ ...p, endDate: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]" />
            </div>
            <button onClick={() => setPFilters({ period: "thisMonth", shift: "all", hospitalUnit: "all", startDate: "", endDate: "" })} className="text-sm module-accent-text border rounded-lg px-3 py-1.5 transition-colors" style={{ borderColor: "var(--module-primary)" }}>Reset</button>
          </div>
        </div>
      )}

      {/* Tests filter bar */}
      {activeTab === "tests" && (
        <div className="bg-white border-b border-slate-100 px-6 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Period</label>
              <select value={tFilters.period} onChange={(e) => setTFilters((p) => ({ ...p, period: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]">
                {PERIODS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lab Section</label>
              <select value={tFilters.labSection} onChange={(e) => setTFilters((p) => ({ ...p, labSection: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]">
                {sectionFilterOptions.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Start Date</label>
              <input type="date" value={tFilters.startDate} onChange={(e) => setTFilters((p) => ({ ...p, startDate: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">End Date</label>
              <input type="date" value={tFilters.endDate} onChange={(e) => setTFilters((p) => ({ ...p, endDate: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]" />
            </div>
            <button onClick={() => setTFilters({ period: "thisMonth", labSection: "all", startDate: "", endDate: "" })} className="text-sm module-accent-text border rounded-lg px-3 py-1.5 transition-colors" style={{ borderColor: "var(--module-primary)" }}>Reset</button>
          </div>
        </div>
      )}

      {/* ── PATIENT REQUESTS tab ─── */}
      {activeTab === "patients" && (
        <>
          {pLoading && <PageLoader variant="inline" />}
          {!pLoading && (
        <div className="p-6 space-y-8">
          <section>
            <SectionDivider
              title="Patient Requests"
              icon={<BarChart3 size={18} />}
            />

            <div className="flex flex-col lg:flex-row gap-6 mt-4">
              {/* Sidebar */}
              <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
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
                    iconId="barChart"
                    full
                  />
                  <KPICard
                    title="Busiest Hour"
                    value={data?.busiestHour ?? (data ? "—" : "N/A")}
                    tooltip="For the selected date range"
                    iconId="delayed"
                  />
                  <KPICard
                    title="Busiest Day"
                    value={data?.busiestDay ?? (data ? "—" : "N/A")}
                    tooltip="For the selected date range"
                    iconId="calendar"
                    full
                  />
                </div>
              </aside>

              {/* Charts */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="module-accent-text" />
                    {data?.granularity === "monthly" ? "Monthly" : "Daily"} Request Volume
                  </h3>
                  {(data?.dailyRequestVolume ?? []).length > 0 ? (
                    <div className="h-[240px]">
                      <LazyBar data={dailyChartData} options={dailyOptions} />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                      No data available for the selected period
                    </div>
                  )}
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Clock3 size={16} className="module-accent-text" /> Hourly Request Volume
                  </h3>
                  {hourlyData.length > 0 ? (
                    <div className="h-[220px]">
                      <LazyBar data={hourlyChartData} options={hourlyOptions} />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                      No hourly data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
        )}
        </>
      )}

      {/* ── TESTS tab ─── */}
      {activeTab === "tests" && (
        <>
          {tLoading && <PageLoader variant="inline" />}
          {!tLoading && (
        <div className="p-6 space-y-8">
          <section>
            <SectionDivider
              title="Tests"
              icon={<FlaskConical size={18} />}
            />

            <div className="flex flex-col lg:flex-row gap-6 mt-4">
              {/* Sidebar */}
              <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  {testsData ? (
                    <TargetProgress
                      current={testsData.totalTestsPerformed}
                      target={testsData.targetTestsPerformed || 1}
                      title="Total Tests Performed"
                      tooltip="Target is prorated for the selected date range"
                    />
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No data</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <KPICard
                    title="Avg Daily Tests"
                    value={testsData?.avgDailyTests?.toFixed(1) ?? "0"}
                    tooltip="For the selected date range"
                    iconId="barChart"
                    full
                  />
                </div>
              </aside>

              {/* Charts */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                {/* Daily Test Volume */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="module-accent-text" />
                    {data?.granularity === "monthly" ? "Monthly" : "Daily"} Test Volume Trend
                  </h3>
                  {testVolumeTrend.length > 0 ? (
                    <div className="h-[240px]">
                      <LazyBar data={testDailyChartData} options={testDailyOptions} />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                      No test volume data available
                    </div>
                  )}
                </div>

                {/* Top Tests by Volume */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <TestTube size={16} className="module-accent-text" /> Top Tests by Volume
                    </h3>
                    <div className="flex items-center gap-2">
                      <label htmlFor="unitSelect" className="text-xs text-slate-500">Filter by section:</label>
                      <select
                        id="unitSelect"
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white min-w-[130px]"
                      >
                        <option value="all">All sections</option>
                        {availableUnits.filter((u) => u !== "all").map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {topTests.length > 0 ? (
                    <div style={{ height: Math.max(300, topTests.length * 28) }}>
                      <LazyBar data={topTestChartData} options={topTestOptions} />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                      No test data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
          )}
        </>
      )}
    </div>
  );
}
