"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, BarChart3, PieChart, XCircle } from "lucide-react";

const SEED_FACILITY_ID = "00000000-0000-0000-0000-000000000001";

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

function formatUgx(n: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/revenue?facility_id=${SEED_FACILITY_ID}&period=thisMonth`
        );
        const json = await res.json();
        setData(json.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-red-700">
        Failed to load revenue data
      </div>
    );
  }

  const growth =
    data.yesterday > 0
      ? ((data.today - data.yesterday) / data.yesterday) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Revenue</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Daily card, monthly trend, per-test table, cancellation analysis.
        </p>
      </div>

      {/* Daily card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <DollarSign size={14} />
            Today
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatUgx(data.today)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            Yesterday
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatUgx(data.yesterday)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <TrendingUp size={14} />
            Same day last week
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatUgx(data.sameDayLastWeek)}
          </p>
          {growth !== 0 && (
            <p
              className={`text-sm mt-1 ${
                growth > 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {growth > 0 ? "+" : ""}
              {growth.toFixed(1)}% vs yesterday
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <PieChart size={16} className="text-indigo-600" />
            <span className="font-semibold text-slate-800">By Section</span>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {data.sectionRevenue.length === 0 ? (
              <p className="text-sm text-slate-500">No data</p>
            ) : (
              <div className="space-y-2">
                {data.sectionRevenue.map((s) => (
                  <div
                    key={s.section}
                    className="flex justify-between py-2 border-b border-slate-50"
                  >
                    <span className="font-medium text-slate-800">{s.section}</span>
                    <span className="text-slate-600">{formatUgx(s.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cancellation analysis */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <XCircle size={16} className="text-red-600" />
            <span className="font-semibold text-slate-800">Cancellation</span>
          </div>
          <div className="p-6">
            <p className="text-3xl font-bold text-slate-900">
              {data.cancellationRate.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {data.cancelledCount} cancelled · {data.pendingCount} pending
            </p>
          </div>
        </div>
      </div>

      {/* Per-test table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <BarChart3 size={16} className="text-indigo-600" />
          <span className="font-semibold text-slate-800">Per-Test Revenue</span>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          {data.testRevenue.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No data</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Test</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.testRevenue.map((t) => (
                  <tr key={t.test_name} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.test_name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatUgx(t.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
