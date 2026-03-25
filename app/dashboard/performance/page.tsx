"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import LabMetricsTabs from "@/components/dashboard/LabMetricsTabs";
import KpiTwemojiIcon, { type KpiTwemojiId } from "@/components/dashboard/KpiTwemojiIcon";
import "@/components/charts/registry";
import { Bar } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { Download, RefreshCw } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

// ── Constants ──────────────────────────────────────────────────────────────
const PERIODS = [
  { value: "today",      label: "Today"      },
  { value: "thisWeek",   label: "This Week"  },
  { value: "thisMonth",  label: "This Month" },
];

const SECTION_COLORS = [
  "#10b981", "#059669", "#34d399", "#6ee7b7",
  "#f59e0b", "#3b82f6", "#047857", "#ef4444",
];

// ── Types ──────────────────────────────────────────────────────────────────
type PerformanceData = {
  totalResulted: number;
  totalReceived: number;
  avgTatMinutes: number;
  breachCount: number;
  bySection: { section: string; count: number; avgTat: number }[];
};

type BreachItem = {
  id: string;
  breach_minutes: number;
  target_minutes: number;
  detected_at: string;
  request?: { lab_number?: string; test_name: string; section: string };
};

// ── CSV helper ─────────────────────────────────────────────────────────────
function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  sub,
  highlight,
  iconId,
}: {
  title: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  iconId?: KpiTwemojiId;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col gap-2 ${
        highlight ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"
      }`}
    >
      {iconId && <KpiTwemojiIcon id={iconId} size={40} />}
      <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-bold ${highlight ? "text-emerald-700" : "text-slate-800"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState<PerformanceData | null>(null);
  const [breaches, setBreaches] = useState<BreachItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [perfRes, breachRes] = await Promise.all([
        fetch(`/api/performance?facility_id=${DEFAULT_FACILITY_ID}&period=${period}`),
        fetch(`/api/tat/breaches?facility_id=${DEFAULT_FACILITY_ID}&limit=50`),
      ]);
      const [perfJson, breachJson] = await Promise.all([perfRes.json(), breachRes.json()]);
      if (perfJson.data) setData(perfJson.data);
      else setData(null);
      setBreaches(breachJson.data ?? []);
      setLastUpdated(new Date());
    } catch {
      setData(null);
      setBreaches([]);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const completionRate =
    data && data.totalReceived > 0
      ? ((data.totalResulted / data.totalReceived) * 100).toFixed(1)
      : "0.0";

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ["Section", "Completed Tests", "Avg TAT"];
    const rows = (data.bySection ?? []).map((r) => [
      r.section,
      r.count,
      fmtMinutes(r.avgTat),
    ]);
    downloadCSV([headers, ...rows], `Performance-${period}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const bySection = data?.bySection ?? [];
  const sectionLabels = bySection.map((s) => s.section);
  const countValues = bySection.map((s) => s.count);
  const avgTatValues = bySection.map((s) => s.avgTat);
  const sectionColors = sectionLabels.map((_, idx) => SECTION_COLORS[idx % SECTION_COLORS.length]);

  const countChartData: ChartData<"bar"> = {
    labels: sectionLabels,
    datasets: [
      {
        label: "Tests",
        data: countValues,
        backgroundColor: sectionColors,
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  };
  const countOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `Tests: ${Number(ctx.parsed.x ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const avgTatChartData: ChartData<"bar"> = {
    labels: sectionLabels,
    datasets: [
      {
        label: "Avg TAT (min)",
        data: avgTatValues,
        backgroundColor: "#f59e0b",
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  };
  const avgTatOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `Avg TAT: ${fmtMinutes(Number(ctx.parsed.x ?? 0))}`,
        },
      },
    },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
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
          <h1 className="text-xl font-bold text-slate-800 mr-2">Performance</h1>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {lastUpdated && (
              <span className="text-xs text-slate-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!data}
              className="flex items-center gap-2 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
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

      {!isLoading && (
        <main className="p-6 flex flex-col gap-6">
          {/* ── KPI Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Tests Resulted"
              value={(data?.totalResulted ?? 0).toLocaleString()}
              sub="Completed in period"
              highlight
              iconId="testsResulted"
            />
            <StatCard
              title="Tests Received"
              value={(data?.totalReceived ?? 0).toLocaleString()}
              sub="Including in-progress"
              iconId="testsReceived"
            />
            <StatCard
              title="Avg. TAT"
              value={fmtMinutes(data?.avgTatMinutes ?? 0)}
              sub="For resulted tests"
              iconId="avgTat"
            />
            <StatCard
              title="TAT Breaches"
              value={(data?.breachCount ?? 0).toLocaleString()}
              sub="SLA violations"
              iconId="breaches"
            />
          </div>

          {/* Completion rate strip */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-slate-700">Completion Rate</span>
              <span className="text-sm font-bold text-emerald-600">{completionRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{(data?.totalResulted ?? 0).toLocaleString()} resulted</span>
              <span>of {(data?.totalReceived ?? 0).toLocaleString()} received</span>
            </div>
          </div>

          {/* ── Main two-column layout ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="text-emerald-600">📊</span> Tests Resulted by Section
              </h3>
              {(data?.bySection ?? []).length > 0 ? (
                <div className="h-[260px]">
                  <Bar data={countChartData} options={countOptions} />
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No section data available
                </div>
              )}
            </div>

            {/* Avg TAT chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="text-emerald-600">⏱</span> Avg. TAT by Section (minutes)
              </h3>
              {(data?.bySection ?? []).length > 0 ? (
                <div className="h-[260px]">
                  <Bar data={avgTatChartData} options={avgTatOptions} />
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No TAT data available
                </div>
              )}
            </div>
          </div>

          {/* ── By-section table ──────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Performance by Section</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-5 py-3 font-semibold text-slate-600">Section</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Tests Resulted</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Avg. TAT</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">TAT Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.bySection ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                        No performance data for the selected period
                      </td>
                    </tr>
                  ) : (
                    (data!.bySection ?? [])
                      .sort((a, b) => b.count - a.count)
                      .map((row) => {
                        const ok = row.avgTat <= 60;
                        return (
                          <tr key={row.section} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-slate-800">{row.section}</td>
                            <td className="px-5 py-3 text-right text-slate-700">
                              {row.count.toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-700">
                              {fmtMinutes(row.avgTat)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <StatusBadge variant={ok ? "ok" : "bad"}>
                                {ok ? "On Target" : "Over Target"}
                              </StatusBadge>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── TAT Breaches ──────────────────────────────────────────── */}
          {breaches.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">
                  Recent TAT Breaches
                  <span className="ml-2 inline-flex">
                    <StatusBadge variant="bad">{breaches.length}</StatusBadge>
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-5 py-3 font-semibold text-slate-600">Test</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Section</th>
                      <th className="px-5 py-3 font-semibold text-slate-600 text-right">Breach</th>
                      <th className="px-5 py-3 font-semibold text-slate-600 text-right">Target</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Detected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breaches.slice(0, 25).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {b.request?.test_name ?? "—"}
                          {b.request?.lab_number && (
                            <span className="text-slate-400 text-xs ml-1">#{b.request.lab_number}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          <StatusBadge variant="neutral">{b.request?.section ?? "—"}</StatusBadge>
                        </td>
                        <td className="px-5 py-3 text-right text-red-600 font-medium">
                          {fmtMinutes(b.breach_minutes)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500">
                          {fmtMinutes(b.target_minutes)}
                        </td>
                        <td className="px-5 py-3 text-slate-600 text-xs">
                          {new Date(b.detected_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
