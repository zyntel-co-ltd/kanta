"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

type PerfData = {
  totalResulted: number;
  totalReceived: number;
  avgTatMinutes: number;
  breachCount: number;
  bySection: { section: string; count: number; avgTat: number }[];
};

export default function PerformancePage() {
  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/performance?facility_id=${DEFAULT_FACILITY_ID}&period=${period}`
    )
      .then((res) => res.json())
      .then((json) => setData(json.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Performance</h1>
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Performance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Throughput, TAT compliance, and section metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tat"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← TAT
          </Link>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
          </select>
        </div>
      </div>

      {!data ? (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-red-700">
          Failed to load performance data
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingUp size={16} />
                Resulted
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {data.totalResulted}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                Received
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {data.totalReceived}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                Avg TAT
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {data.avgTatMinutes} min
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <AlertTriangle size={16} />
                Breaches
              </div>
              <div className="text-2xl font-bold text-red-600">
                {data.breachCount}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600" />
              <span className="font-semibold text-slate-800">By Section</span>
            </div>
            {data.bySection.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No section data for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Section</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Count</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Avg TAT (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySection.map((s) => (
                      <tr key={s.section} className="border-b border-slate-50">
                        <td className="px-4 py-3 font-medium">{s.section}</td>
                        <td className="px-4 py-3 text-right">{s.count}</td>
                        <td className="px-4 py-3 text-right">{s.avgTat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
