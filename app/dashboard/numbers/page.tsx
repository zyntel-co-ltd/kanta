"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Beaker,
  TrendingUp,
  BarChart3,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import ModuleTabBar from "@/components/dashboard/ModuleTabBar";
import { Clock, Activity, Calendar } from "lucide-react";

const MODULE_TABS = [
  { label: "Overview",    href: "/dashboard/tat",         icon: Clock     },
  { label: "Tests",       href: "/dashboard/tests",       icon: Activity  },
  { label: "Numbers",     href: "/dashboard/numbers",     icon: Users     },
  { label: "Revenue",     href: "/dashboard/revenue",     icon: Calendar  },
  { label: "Performance", href: "/dashboard/performance", icon: TrendingUp },
];

type NumbersData = {
  totalRequests: number;
  targetRequests: number;
  requestsPercentage: number;
  totalTests: number;
  targetTests: number;
  testsPercentage: number;
  avgDailyRequests: number;
  avgDailyTests: number;
  busiestHour: string | null;
  busiestDay: string | null;
  dailyRequestVolume: { date: string; count: number }[];
  dailyTestVolume: { date: string; count: number }[];
  hourlyRequestVolume: { hour: number; count: number }[];
  granularity: string;
};

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
];

export default function NumbersPage() {
  const [data, setData] = useState<NumbersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("thisMonth");
  const [view, setView] = useState<"requests" | "tests" | "both">("both");

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/numbers?facility_id=${DEFAULT_FACILITY_ID}&period=${period}`
    )
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
        Loading...
      </div>
    );
  }

  const d = data ?? {
    totalRequests: 0,
    targetRequests: 0,
    requestsPercentage: 0,
    totalTests: 0,
    targetTests: 0,
    testsPercentage: 0,
    avgDailyRequests: 0,
    avgDailyTests: 0,
    busiestHour: null,
    busiestDay: null,
    dailyRequestVolume: [],
    dailyTestVolume: [],
    hourlyRequestVolume: [],
    granularity: "daily",
  };

  return (
    <div className="flex flex-col min-h-0">
      <ModuleTabBar tabs={MODULE_TABS} />
      <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Numbers
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Patient-level (requests) and test-level volume vs targets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("both")}
              className={`px-3 py-2 text-sm font-medium ${
                view === "both" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setView("requests")}
              className={`px-3 py-2 text-sm font-medium ${
                view === "requests" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setView("tests")}
              className={`px-3 py-2 text-sm font-medium ${
                view === "tests" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              Tests
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {(view === "both" || view === "requests") && (
          <>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Users size={16} />
                Total Requests
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {d.totalRequests.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                of {d.targetRequests.toLocaleString()} target (
                {d.requestsPercentage.toFixed(0)}%)
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingUp size={16} />
                Avg Daily Requests
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {d.avgDailyRequests.toFixed(1)}
              </div>
            </div>
          </>
        )}
        {(view === "both" || view === "tests") && (
          <>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Beaker size={16} />
                Total Tests
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {d.totalTests.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                of {d.targetTests.toLocaleString()} target (
                {d.testsPercentage.toFixed(0)}%)
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingUp size={16} />
                Avg Daily Tests
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {d.avgDailyTests.toFixed(1)}
              </div>
            </div>
          </>
        )}
        {(view === "both" || view === "requests") && (
          <>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="text-slate-500 text-sm mb-1">Busiest Hour</div>
              <div className="text-lg font-bold text-slate-900">
                {d.busiestHour ?? "—"}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="text-slate-500 text-sm mb-1">Busiest Day</div>
              <div className="text-sm font-bold text-slate-900 truncate" title={d.busiestDay ?? ""}>
                {d.busiestDay ?? "—"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Target progress bars */}
      {(view === "both" || view === "requests") && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Target size={18} />
            Requests vs Target
          </h3>
          <div className="h-8 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, d.requestsPercentage)}%`,
              }}
            />
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {d.totalRequests.toLocaleString()} / {d.targetRequests.toLocaleString()} requests
          </p>
        </div>
      )}

      {(view === "both" || view === "tests") && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Target size={18} />
            Tests vs Target
          </h3>
          <div className="h-8 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, d.testsPercentage)}%`,
              }}
            />
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {d.totalTests.toLocaleString()} / {d.targetTests.toLocaleString()} tests
          </p>
        </div>
      )}

      {/* Daily volume charts */}
      {(view === "both" || view === "requests") && d.dailyRequestVolume.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-600" />
            <span className="font-semibold text-slate-800">
              Daily Request Volume (patient-level)
            </span>
          </div>
          <div className="p-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.dailyRequestVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  fill="#818cf8"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(view === "both" || view === "tests") && d.dailyTestVolume.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-600" />
            <span className="font-semibold text-slate-800">
              Daily Test Volume (test-level)
            </span>
          </div>
          <div className="p-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.dailyTestVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0d9488"
                  fill="#2dd4bf"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Hourly volume (requests) */}
      {(view === "both" || view === "requests") && d.hourlyRequestVolume.some((h) => h.count > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-600" />
            <span className="font-semibold text-slate-800">
              Hourly Request Volume
            </span>
          </div>
          <div className="p-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={d.hourlyRequestVolume.map((h) => ({
                  ...h,
                  label: `${h.hour}:00`,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!data && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-red-700">
          Failed to load numbers data
        </div>
      )}
      </div>
    </div>
  );
}
