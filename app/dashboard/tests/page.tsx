"use client";

import { useEffect, useState, useCallback } from "react";
import LabMetricsTabs from "@/components/dashboard/LabMetricsTabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

const LAB_SECTIONS = [
  { value: "all",           label: "All Sections"  },
  { value: "CHEMISTRY",     label: "Chemistry"     },
  { value: "HEAMATOLOGY",   label: "Haematology"   },
  { value: "MICROBIOLOGY",  label: "Microbiology"  },
  { value: "SEROLOGY",      label: "Serology"      },
  { value: "REFERRAL",      label: "Referral"      },
  { value: "N/A",           label: "N/A"           },
];

const LABORATORIES = [
  { value: "all",             label: "All Laboratories" },
  { value: "Main Laboratory", label: "Main Laboratory"  },
  { value: "Annex",           label: "Annex"            },
];

// ── Types ──────────────────────────────────────────────────────────────────
type TestsData = {
  totalTestsPerformed: number;
  targetTestsPerformed: number;
  percentage: number;
  avgDailyTests: number;
  testVolumeTrend: { date: string; count: number }[];
  topTestsBySection: { section: string; tests: { test: string; count: number }[] }[];
  granularity?: "daily" | "monthly";
};

// ── Flatten top tests ──────────────────────────────────────────────────────
function flattenTopTests(
  rawData: TestsData | null,
  selectedSection: string
): { test: string; count: number }[] {
  if (!rawData) return [];
  if (selectedSection === "all") {
    const merged: Record<string, number> = {};
    for (const sec of rawData.topTestsBySection ?? []) {
      for (const t of sec.tests ?? []) {
        merged[t.test] = (merged[t.test] ?? 0) + t.count;
      }
    }
    return Object.entries(merged)
      .map(([test, count]) => ({ test, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }
  const sec = (rawData.topTestsBySection ?? []).find(
    (s) => s.section.toUpperCase() === selectedSection.toUpperCase()
  );
  return (sec?.tests ?? []).slice(0, 30);
}

// ── Sub-components ─────────────────────────────────────────────────────────
function TargetProgress({
  current,
  target,
  title,
}: {
  current: number;
  target: number;
  title: string;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className="mb-4">
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

function KPICard({ title, value, icon, full }: { title: string; value: string | number; icon?: string; full?: boolean }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 ${full ? "col-span-2" : ""}`}>
      {icon && <span className="text-2xl block mb-1">{icon}</span>}
      <p className="text-xs text-slate-500 mb-1">{title}</p>
      <p className="text-xl font-bold text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1 truncate max-w-xs">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function TestsPage() {
  const [filters, setFilters] = useState({
    period: "thisMonth",
    labSection: "all",
    shift: "all",
    hospitalUnit: "all",
    testName: "",
    startDate: "",
    endDate: "",
  });
  const [selectedSection, setSelectedSection] = useState("all");
  const [data, setData] = useState<TestsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateFilter = (key: string, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () => {
    setFilters({
      period: "thisMonth",
      labSection: "all",
      shift: "all",
      hospitalUnit: "all",
      testName: "",
      startDate: "",
      endDate: "",
    });
    setSelectedSection("all");
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: DEFAULT_FACILITY_ID, period: filters.period });
      if (filters.labSection && filters.labSection !== "all") params.append("section", filters.labSection);
      if (filters.shift && filters.shift !== "all") params.append("shift", filters.shift);
      if (filters.hospitalUnit && filters.hospitalUnit !== "all")
        params.append("laboratory", filters.hospitalUnit);
      if (filters.testName?.trim()) params.append("testName", filters.testName.trim());
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/tests?${params}`);
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

  const topTests = flattenTopTests(data, selectedSection);
  const availableSections = ["all", ...(data?.topTestsBySection ?? []).map((s) => s.section)];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Lab Metrics Tab Navigation ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <LabMetricsTabs />
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <h1 className="text-xl font-bold text-slate-800 mr-2">Tests</h1>

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
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lab Section</label>
            <select
              value={filters.labSection}
              onChange={(e) => updateFilter("labSection", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {LAB_SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
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
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Test Name</label>
            <input
              type="text"
              value={filters.testName}
              onChange={(e) => updateFilter("testName", e.target.value)}
              placeholder="Filter by test..."
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40"
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
                  current={data.totalTestsPerformed}
                  target={data.targetTestsPerformed || 1}
                  title="Total Tests Performed"
                />
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No data</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <KPICard
                title="Avg. Daily Tests"
                value={data?.avgDailyTests?.toFixed(1) ?? "0"}
                icon="📈"
                full
              />
            </div>
          </aside>

          {/* Charts */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* Daily Volume */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="text-emerald-600">📅</span>{" "}
                {data?.granularity === "monthly" ? "Monthly" : "Daily"} Test Volume Trend
              </h3>
              {(data?.testVolumeTrend ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data!.testVolumeTrend} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Tests" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No test volume data available for the selected period
                </div>
              )}
            </div>

            {/* Top Tests by Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="text-emerald-600">📊</span> Top Tests by Volume
                </h3>
                {availableSections.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Filter by Section:</label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {availableSections.map((s) => (
                        <option key={s} value={s}>{s === "all" ? "All" : s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {topTests.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(300, topTests.length * 26)}
                >
                  <BarChart
                    data={topTests}
                    layout="vertical"
                    margin={{ left: 160, right: 30, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="test"
                      tick={{ fontSize: 11 }}
                      width={155}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Tests" fill="#059669" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No test volume data available for the selected unit
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
