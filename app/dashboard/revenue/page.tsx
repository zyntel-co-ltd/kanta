"use client";

import { useEffect, useState, useCallback } from "react";
import LabMetricsTabs from "@/components/dashboard/LabMetricsTabs";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

const LAB_SECTIONS = [
  { value: "all",          label: "All Sections" },
  { value: "CHEMISTRY",    label: "Chemistry"    },
  { value: "HEAMATOLOGY",  label: "Haematology"  },
  { value: "MICROBIOLOGY", label: "Microbiology" },
  { value: "SEROLOGY",     label: "Serology"     },
  { value: "REFERRAL",     label: "Referral"     },
  { value: "N/A",          label: "N/A"          },
];

const SHIFTS = [
  { value: "all",         label: "All Shifts"  },
  { value: "day shift",   label: "Day Shift"   },
  { value: "night shift", label: "Night Shift" },
];

const SECTION_COLORS = [
  "#10b981", "#059669", "#34d399", "#6ee7b7",
  "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444",
];

// ── Types ──────────────────────────────────────────────────────────────────
type RevenueData = {
  today: number;
  yesterday: number;
  sameDayLastWeek: number;
  dailyRevenue: { date: string; revenue: number }[];
  sectionRevenue: { section: string; revenue: number }[];
  testRevenue: { test_name: string; revenue: number }[];
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
}: {
  title: string;
  value: string;
  sub?: string;
  full?: boolean;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 ${full ? "col-span-2" : ""}`}>
      <p className="text-xs text-slate-500 mb-1">{title}</p>
      <p className="text-lg font-bold text-slate-800 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
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
          {p.name}: <strong>{fmtUGX(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function RevenuePage() {
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
      const params = new URLSearchParams({ facility_id: DEFAULT_FACILITY_ID, period: filters.period });
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
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalRevenue = (data?.dailyRevenue ?? []).reduce((s, d) => s + d.revenue, 0);
  const avgDaily =
    (data?.dailyRevenue ?? []).length > 0
      ? totalRevenue / data!.dailyRevenue.length
      : 0;

  // Filter test revenue by test name if provided
  const filteredTestRevenue = filters.testName.trim()
    ? (data?.testRevenue ?? []).filter((t) =>
        t.test_name.toLowerCase().includes(filters.testName.trim().toLowerCase())
      )
    : (data?.testRevenue ?? []).slice(0, 30);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Lab Metrics Tab Navigation ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <LabMetricsTabs />
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <h1 className="text-xl font-bold text-slate-800 mr-2">Revenue</h1>

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
            {/* Total Revenue Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">{fmtUGX(totalRevenue)}</p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
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
                value={fmtUGX(Math.round(avgDaily))}
                full
              />
              <KPICard
                title="Cancellation Rate"
                value={`${(data?.cancellationRate ?? 0).toFixed(1)}%`}
              />
              <KPICard
                title="Pending"
                value={String(data?.pendingCount ?? 0)}
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
                  <span className="text-emerald-600">◕</span> Revenue by Laboratory Section
                </h3>
                {(data?.sectionRevenue ?? []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data!.sectionRevenue}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="revenue"
                        nameKey="section"
                        label={({ percent }: { percent?: number }) =>
                          (percent ?? 0) > 0.04 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ""
                        }
                        labelLine={false}
                      >
                        {data!.sectionRevenue.map((_, idx) => (
                          <Cell key={idx} fill={SECTION_COLORS[idx % SECTION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | string | undefined) => fmtUGX(typeof v === "number" ? v : 0)} />
                      <Legend iconSize={12} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No data available
                  </div>
                )}
              </div>

              {/* Daily Revenue Line */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="text-emerald-600">📈</span> Daily Revenue
                </h3>
                {(data?.dailyRevenue ?? []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data!.dailyRevenue} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number | string | undefined) => fmtUGX(typeof v === "number" ? v : 0)} />
                      <Legend iconSize={12} wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Test – horizontal bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="text-emerald-600">🧪</span> Revenue by Test
              </h3>
              {filteredTestRevenue.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(300, filteredTestRevenue.length * 26)}
                >
                  <BarChart
                    data={filteredTestRevenue}
                    layout="vertical"
                    margin={{ left: 160, right: 40, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis type="category" dataKey="test_name" tick={{ fontSize: 11 }} width={155} />
                    <Tooltip formatter={(v: number | string | undefined) => fmtUGX(typeof v === "number" ? v : 0)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#059669" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
