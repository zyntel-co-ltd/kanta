"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { DEFAULT_FACILITY_ID } from "@/lib/constants";

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
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
];

const PIE_COLORS = {
  onTime: "#22c55e",
  delayedLess15: "#eab308",
  overDelayed: "#ef4444",
  notUploaded: "#94a3b8",
};

export default function TATPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [breaches, setBreaches] = useState<BreachItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState("thisMonth");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, sRes, bRes, aRes] = await Promise.all([
        fetch(`/api/tat/queue?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/tat/summary?facility_id=${DEFAULT_FACILITY_ID}&days=7`),
        fetch(`/api/tat/breaches?facility_id=${DEFAULT_FACILITY_ID}&limit=20`),
        fetch(`/api/tat/analytics?facility_id=${DEFAULT_FACILITY_ID}&period=${period}`),
      ]);
      const qData = await qRes.json();
      const sData = await sRes.json();
      const bData = await bRes.json();
      const aData = await aRes.json();
      setQueue(qData.data ?? []);
      setSections(sData.data?.sections ?? []);
      setBreaches(bData.data ?? []);
      setAnalytics(aData.error ? null : aData);
    } catch {
      setQueue([]);
      setSections([]);
      setBreaches([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [period]);

  const pieData = analytics?.pieData
    ? [
        { name: "On Time", value: analytics.pieData.onTime, color: PIE_COLORS.onTime },
        {
          name: "Delayed <15 min",
          value: analytics.pieData.delayedLess15,
          color: PIE_COLORS.delayedLess15,
        },
        {
          name: "Over Delayed",
          value: analytics.pieData.overDelayed,
          color: PIE_COLORS.overDelayed,
        },
        {
          name: "Not Uploaded",
          value: analytics.pieData.notUploaded,
          color: PIE_COLORS.notUploaded,
        },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            TAT — Turnaround Time
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Performance distribution, daily/hourly trends, queue, breach log — full Nakasero parity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <Link
            href="/dashboard/lrids"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            LRIDS Display
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
          Loading...
        </div>
      ) : (
        <>
          {/* KPI cards + progress (Nakasero style) */}
          {analytics?.kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <XCircle size={12} />
                  Delayed
                </div>
                <p className="text-xl font-bold text-red-600">
                  {analytics.kpis.delayedRequests}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  of {analytics.kpis.totalRequests} total
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <CheckCircle2 size={12} />
                  On Time
                </div>
                <p className="text-xl font-bold text-emerald-600">
                  {analytics.kpis.onTimeRequests}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  Avg Daily On Time
                </div>
                <p className="text-xl font-bold text-slate-900">
                  {analytics.kpis.avgDailyOnTime}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  Avg Daily Delays
                </div>
                <p className="text-xl font-bold text-slate-900">
                  {analytics.kpis.avgDailyDelayed}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <Clock size={12} />
                  Most Delayed Hour
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {analytics.kpis.mostDelayedHour}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <Calendar size={12} />
                  Most Delayed Day
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {analytics.kpis.mostDelayedDay}
                </p>
              </div>
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TAT Performance Distribution (pie) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600" />
                <span className="font-semibold text-slate-800">
                  TAT Performance Distribution
                </span>
              </div>
              <div className="p-4" style={{ minHeight: 280 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260} minHeight={144}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Requests"]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <BarChart3 size={48} className="opacity-50 mb-2" />
                    <p>No TAT data for selected period</p>
                  </div>
                )}
              </div>
            </div>

            {/* Daily TAT Trend */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" />
                <span className="font-semibold text-slate-800">
                  {analytics?.granularity === "monthly" ? "Monthly" : "Daily"} TAT Performance Trend
                </span>
              </div>
              <div className="p-4" style={{ minHeight: 280 }}>
                {analytics?.dailyTrend && analytics.dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260} minHeight={144}>
                    <LineChart data={analytics.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v.length === 7
                            ? new Date(v + "-01").toLocaleDateString("en-US", {
                                month: "short",
                                year: "2-digit",
                              })
                            : new Date(v).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                        }
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="delayed"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        name="Delayed"
                      />
                      <Line
                        type="monotone"
                        dataKey="onTime"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                        name="On Time"
                      />
                      <Line
                        type="monotone"
                        dataKey="notUploaded"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        dot={false}
                        name="Not Uploaded"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <TrendingUp size={48} className="opacity-50 mb-2" />
                    <p>No trend data</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hourly TAT Trend */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              <span className="font-semibold text-slate-800">
                Hourly TAT Performance Trend
              </span>
            </div>
            <div className="p-4" style={{ minHeight: 280 }}>
              {analytics?.hourlyTrend && analytics.hourlyTrend.some((h) => h.delayed + h.onTime + h.notUploaded > 0) ? (
                <ResponsiveContainer width="100%" height={260} minHeight={144}>
                  <LineChart data={analytics.hourlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(h) => `${h}:00`}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="delayed"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Delayed"
                    />
                    <Line
                      type="monotone"
                      dataKey="onTime"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="On Time"
                    />
                    <Line
                      type="monotone"
                      dataKey="notUploaded"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Not Uploaded"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Clock size={48} className="opacity-50 mb-2" />
                  <p>No hourly data</p>
                </div>
              )}
            </div>
          </div>

          {/* Queue + Per-section + Breaches */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              <span className="font-semibold text-slate-800">In-Progress Queue</span>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              {queue.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No tests in progress
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Lab #</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Test</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Section</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Elapsed (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((r) => (
                      <tr
                        key={r.id}
                        className={`border-b border-slate-50 ${
                          r.elapsed_minutes != null && r.elapsed_minutes > 60 ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-4 py-2 font-mono">{r.lab_number ?? "—"}</td>
                        <td className="px-4 py-2">{r.test_name}</td>
                        <td className="px-4 py-2">{r.section}</td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              r.elapsed_minutes != null && r.elapsed_minutes > 60
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600" />
                <span className="font-semibold text-slate-800">Per-Section Summary (7d)</span>
              </div>
              <div className="p-4">
                {sections.length === 0 ? (
                  <p className="text-sm text-slate-500">No data</p>
                ) : (
                  <div className="space-y-2">
                    {sections.map((s) => (
                      <div
                        key={s.section}
                        className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                      >
                        <span className="font-medium text-slate-800">{s.section}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 text-sm">
                            {s.avg_tat} min avg (target: {s.target})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.on_target ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
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
                <AlertTriangle size={16} className="text-red-600" />
                <span className="font-semibold text-slate-800">Breach Log</span>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {breaches.length === 0 ? (
                  <p className="text-sm text-slate-500">No breaches</p>
                ) : (
                  <div className="space-y-2">
                    {breaches.map((b) => (
                      <div
                        key={b.id}
                        className="py-2 border-b border-slate-50 last:border-0 text-sm"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {b.request?.lab_number ?? "—"} · {b.request?.test_name}
                          </span>
                          <span className="text-red-600 font-semibold">
                            +{b.breach_minutes} min over target
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {b.request?.section} · {new Date(b.detected_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
