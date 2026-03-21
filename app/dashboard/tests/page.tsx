"use client";

import { useEffect, useState } from "react";
import {
  Beaker,
  Target,
  TrendingUp,
  BarChart3,
  Calendar,
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

type TestsData = {
  totalTestsPerformed: number;
  targetTestsPerformed: number;
  percentage: number;
  avgDailyTests: number;
  testVolumeTrend: { date: string; count: number }[];
  topTestsBySection: { section: string; tests: { test: string; count: number }[] }[];
};

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
];

const SECTIONS = [
  "all",
  "CHEMISTRY",
  "HAEMATOLOGY",
  "MICROBIOLOGY",
  "REFERRAL",
  "SEROLOGY",
  "N/A",
];

export default function TestsPage() {
  const [data, setData] = useState<TestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("thisMonth");
  const [section, setSection] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          facility_id: DEFAULT_FACILITY_ID,
          period,
          section,
        });
        const res = await fetch(`/api/tests?${params}`);
        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period, section]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
        Loading...
      </div>
    );
  }

  const d = data ?? {
    totalTestsPerformed: 0,
    targetTestsPerformed: 0,
    percentage: 0,
    avgDailyTests: 0,
    testVolumeTrend: [],
    topTestsBySection: [],
  };

  const flatTopTests = d.topTestsBySection.flatMap((s) =>
    s.tests.map((t) => ({ ...t, section: s.section }))
  ).sort((a, b) => b.count - a.count).slice(0, 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Tests
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Volume vs target, daily trend, top tests by section.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Period
          </label>
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
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Section
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "all" ? "All" : sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Beaker size={14} />
            Total Tests
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {d.totalTestsPerformed.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Target size={14} />
            Target
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {d.targetTestsPerformed.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            Progress
          </div>
          <p className="text-2xl font-bold text-slate-900">{d.percentage}%</p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, d.percentage)}%`,
              }}
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <TrendingUp size={14} />
            Avg Daily
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {d.avgDailyTests.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Volume trend chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Calendar size={16} className="text-indigo-600" />
          <span className="font-semibold text-slate-800">
            Daily Test Volume Trend
          </span>
        </div>
        <div className="p-4" style={{ minHeight: 280 }}>
          {d.testVolumeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260} minHeight={144}>
              <AreaChart data={d.testVolumeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [value ?? 0, "Tests"]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString()
                  }
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <BarChart3 size={48} className="opacity-50 mb-2" />
              <p>No test volume data for the selected period</p>
            </div>
          )}
        </div>
      </div>

      {/* Top tests by volume */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <BarChart3 size={16} className="text-indigo-600" />
          <span className="font-semibold text-slate-800">
            Top Tests by Volume
          </span>
        </div>
        <div className="p-4" style={{ minHeight: 280 }}>
          {flatTopTests.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(280, flatTopTests.length * 24)} minHeight={160}>
              <BarChart
                data={flatTopTests}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="test"
                  width={90}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (v?.length > 25 ? v.slice(0, 22) + "…" : v)}
                />
                <Tooltip
                  formatter={(value, _name, props) => [
                    value ?? 0,
                    (props?.payload as { section?: string })?.section
                      ? `Section: ${(props?.payload as { section: string }).section}`
                      : "Tests",
                  ]}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Beaker size={48} className="opacity-50 mb-2" />
              <p>No test data for the selected filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
