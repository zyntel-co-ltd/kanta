"use client";

import "@/components/charts/registry";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
  Target,
  Activity,
  Monitor,
} from "lucide-react";
import { Doughnut, Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import AnomalyPanel from "@/components/ai/AnomalyPanel";
import ModuleTabBar from "@/components/dashboard/ModuleTabBar";

const MODULE_TABS = [
  { label: "Overview",     href: "/dashboard/tat",         icon: BarChart3   },
  { label: "Performance",  href: "/dashboard/performance", icon: TrendingUp  },
  { label: "Tests",        href: "/dashboard/tests",       icon: Activity    },
  { label: "Numbers",      href: "/dashboard/numbers",     icon: Target      },
  { label: "Revenue",      href: "/dashboard/revenue",     icon: Calendar    },
  { label: "LRIDS",        href: "/dashboard/lrids",       icon: Monitor     },
];

type QueueItem = {
  id: string;
  lab_number?: string;
  test_name: string;
  section: string;
  received_at: string | null;
  elapsed_minutes: number | null;
  status: string;
};

type SectionSummary = {
  section: string;
  avg_tat: number;
  count: number;
  target: number;
  on_target: boolean;
};

type BreachItem = {
  id: string;
  breach_minutes: number;
  target_minutes: number;
  detected_at: string;
  request?: { lab_number?: string; test_name: string; section: string };
};

type AnalyticsData = {
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
    avgDailyDelayed: string;
    avgDailyOnTime: string;
    avgDailyNotUploaded: string;
    mostDelayedHour: string;
    mostDelayedDay: string;
  };
};

const PERIODS = [
  { value: "today",     label: "Today"      },
  { value: "thisWeek",  label: "This Week"  },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
];

/* ── Doughnut chart options (data labels fully inside container) ── */
const doughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "60%",
  layout: { padding: 28 },
  plugins: {
    legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12, boxWidth: 12 } },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}` } },
    datalabels: {
      display: true,
      color: "#fff",
      font: { size: 11, weight: "bold" },
      formatter: (value: number, ctx) => {
        const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
        if (total === 0 || value === 0) return "";
        return `${((value / total) * 100).toFixed(0)}%`;
      },
      anchor: "center",
      align: "center",
      clip: false,
    },
  },
};

const lineOptions = (title: string): ChartOptions<"line"> => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12, boxWidth: 12 } },
    title: { display: false, text: title },
    datalabels: { display: false },
  },
  scales: {
    x: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 10 } } },
    y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } }, beginAtZero: true },
  },
});

export default function TATPage() {
  const [queue, setQueue]       = useState<QueueItem[]>([]);
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [breaches, setBreaches] = useState<BreachItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod]     = useState("thisMonth");
  const [loading, setLoading]   = useState(true);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, sRes, bRes, aRes] = await Promise.all([
        fetch(`/api/tat/queue?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/tat/summary?facility_id=${DEFAULT_FACILITY_ID}&days=7`),
        fetch(`/api/tat/breaches?facility_id=${DEFAULT_FACILITY_ID}&limit=20`),
        fetch(`/api/tat/analytics?facility_id=${DEFAULT_FACILITY_ID}&period=${period}`),
      ]);
      const [qData, sData, bData, aData] = await Promise.all([qRes.json(), sRes.json(), bRes.json(), aRes.json()]);
      setQueue(qData.data ?? []);
      setSections(sData.data?.sections ?? []);
      setBreaches(bData.data ?? []);
      setAnalytics(aData.error ? null : aData);
    } catch {
      setQueue([]); setSections([]); setBreaches([]); setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  /* ── Doughnut dataset ── */
  const doughnutData = analytics?.pieData
    ? {
        labels: ["On Time", "Delayed <15 min", "Over Delayed", "Not Uploaded"],
        datasets: [{
          data: [
            analytics.pieData.onTime,
            analytics.pieData.delayedLess15,
            analytics.pieData.overDelayed,
            analytics.pieData.notUploaded,
          ],
          backgroundColor: ["#22c55e", "#eab308", "#ef4444", "#94a3b8"],
          borderWidth: 2,
          borderColor: "#fff",
        }],
      }
    : null;

  /* ── Daily trend dataset ── */
  const trendLabels = (analytics?.dailyTrend ?? []).map((d) =>
    d.date.length === 7
      ? new Date(d.date + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      : new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );
  const dailyDataset = analytics?.dailyTrend?.length
    ? {
        labels: trendLabels,
        datasets: [
          { label: "On Time",      data: analytics.dailyTrend.map((d) => d.onTime),      borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)",  tension: 0.3, fill: true,  pointRadius: 2, borderWidth: 2 },
          { label: "Delayed",      data: analytics.dailyTrend.map((d) => d.delayed),     borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.08)",   tension: 0.3, fill: false, pointRadius: 2, borderWidth: 2 },
          { label: "Not Uploaded", data: analytics.dailyTrend.map((d) => d.notUploaded), borderColor: "#94a3b8", backgroundColor: "rgba(148,163,184,0.08)", tension: 0.3, fill: false, pointRadius: 2, borderWidth: 2 },
        ],
      }
    : null;

  /* ── Hourly trend dataset ── */
  const hourlyDataset = analytics?.hourlyTrend?.some((h) => h.delayed + h.onTime + h.notUploaded > 0)
    ? {
        labels: analytics.hourlyTrend.map((h) => `${h.hour}:00`),
        datasets: [
          { label: "On Time",      data: analytics.hourlyTrend.map((h) => h.onTime),      borderColor: "#22c55e", tension: 0.3, fill: false, pointRadius: 3, borderWidth: 2 },
          { label: "Delayed",      data: analytics.hourlyTrend.map((h) => h.delayed),     borderColor: "#ef4444", tension: 0.3, fill: false, pointRadius: 3, borderWidth: 2 },
          { label: "Not Uploaded", data: analytics.hourlyTrend.map((h) => h.notUploaded), borderColor: "#94a3b8", tension: 0.3, fill: false, pointRadius: 3, borderWidth: 2 },
        ],
      }
    : null;

  return (
    <div className="flex flex-col min-h-0">
      {/* Module tab bar */}
      <ModuleTabBar tabs={MODULE_TABS} />

      <div className="space-y-6 p-6">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TAT — Turnaround Time</h1>
            <p className="text-sm text-slate-500 mt-0.5">Performance distribution, daily/hourly trends, queue, breach log</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <Link
              href="/dashboard/lrids"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              LRIDS Display
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : (
          <>
            {/* KPI cards */}
            {analytics?.kpis && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { icon: XCircle,     label: "Delayed",           value: analytics.kpis.delayedRequests, sub: `of ${analytics.kpis.totalRequests} total`, color: "text-red-600" },
                  { icon: CheckCircle2,label: "On Time",           value: analytics.kpis.onTimeRequests,  sub: "",                                          color: "text-emerald-600" },
                  { icon: null,        label: "Avg Daily On Time", value: analytics.kpis.avgDailyOnTime,  sub: "",                                          color: "text-slate-900" },
                  { icon: null,        label: "Avg Daily Delays",  value: analytics.kpis.avgDailyDelayed, sub: "",                                          color: "text-slate-900" },
                  { icon: Clock,       label: "Peak Delay Hour",   value: analytics.kpis.mostDelayedHour, sub: "",                                          color: "text-slate-900" },
                  { icon: Calendar,    label: "Peak Delay Day",    value: analytics.kpis.mostDelayedDay,  sub: "",                                          color: "text-slate-900" },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                      {card.icon && <card.icon size={12} />}
                      {card.label}
                    </div>
                    <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                    {card.sub && <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Doughnut — TAT Performance Distribution */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-600" />
                  <span className="font-semibold text-slate-800 text-sm">TAT Performance Distribution</span>
                </div>
                <div className="p-4" style={{ height: 300 }}>
                  {doughnutData ? (
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <BarChart3 size={40} className="opacity-40 mb-2" />
                      <p className="text-sm">No TAT data for selected period</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Line — Daily / Monthly trend */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <span className="font-semibold text-slate-800 text-sm">
                    {analytics?.granularity === "monthly" ? "Monthly" : "Daily"} TAT Performance Trend
                  </span>
                </div>
                <div className="p-4" style={{ height: 300 }}>
                  {dailyDataset ? (
                    <Line data={dailyDataset} options={lineOptions("Daily TAT")} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <TrendingUp size={40} className="opacity-40 mb-2" />
                      <p className="text-sm">No trend data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hourly trend */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Clock size={16} className="text-emerald-600" />
                <span className="font-semibold text-slate-800 text-sm">Hourly TAT Performance Trend</span>
              </div>
              <div className="p-4" style={{ height: 260 }}>
                {hourlyDataset ? (
                  <Line data={hourlyDataset} options={lineOptions("Hourly TAT")} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Clock size={40} className="opacity-40 mb-2" />
                    <p className="text-sm">No hourly data</p>
                  </div>
                )}
              </div>
            </div>

            {/* Queue */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Clock size={16} className="text-emerald-600" />
                <span className="font-semibold text-slate-800 text-sm">In-Progress Queue</span>
                {queue.length > 0 && (
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{queue.length}</span>
                )}
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                {queue.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No tests in progress</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-slate-100">
                      <tr>
                        {["Lab #", "Test", "Section", "Elapsed (min)"].map((h) => (
                          <th key={h} className="text-left px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((r) => (
                        <tr key={r.id} className={`border-b border-slate-50 ${r.elapsed_minutes != null && r.elapsed_minutes > 60 ? "bg-red-50" : ""}`}>
                          <td className="px-4 py-2 font-mono text-slate-700">{r.lab_number ?? "—"}</td>
                          <td className="px-4 py-2 text-slate-700">{r.test_name}</td>
                          <td className="px-4 py-2 text-slate-500">{r.section}</td>
                          <td className="px-4 py-2">
                            <span className={r.elapsed_minutes != null && r.elapsed_minutes > 60 ? "text-red-600 font-semibold" : "text-slate-700"}>
                              {r.elapsed_minutes ?? "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Section summary + Breach log */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-600" />
                  <span className="font-semibold text-slate-800 text-sm">Per-Section Summary (7d)</span>
                </div>
                <div className="p-4">
                  {sections.length === 0 ? (
                    <p className="text-sm text-slate-400">No data</p>
                  ) : (
                    <div className="space-y-2">
                      {sections.map((s) => (
                        <div key={s.section} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <span className="font-medium text-slate-800 text-sm">{s.section}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 text-xs">{s.avg_tat} min avg (target: {s.target})</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.on_target ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {s.on_target ? "On target" : "Over"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="font-semibold text-slate-800 text-sm">Breach Log</span>
                  {breaches.length > 0 && (
                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">{breaches.length}</span>
                  )}
                </div>
                <div className="p-4 max-h-64 overflow-y-auto">
                  {breaches.length === 0 ? (
                    <p className="text-sm text-slate-400">No breaches</p>
                  ) : (
                    <div className="space-y-2">
                      {breaches.map((b) => (
                        <div key={b.id} className="py-2 border-b border-slate-50 last:border-0 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-800">{b.request?.lab_number ?? "—"} · {b.request?.test_name}</span>
                            <span className="text-red-600 font-semibold">+{b.breach_minutes} min</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{b.request?.section} · {new Date(b.detected_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Anomaly Detection — inline */}
            <AnomalyPanel facilityId={DEFAULT_FACILITY_ID} days={7} />
          </>
        )}
      </div>
    </div>
  );
}
