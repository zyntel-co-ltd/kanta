"use client";

import { useState } from "react";
import { useDashboardData } from "@/lib/DashboardDataContext";
import DailyScanChart from "@/components/dashboard/DailyScanChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import EquipmentStatusChart from "@/components/dashboard/EquipmentStatusChart";
import AssetValueChart from "@/components/dashboard/AssetValueChart";
import { BarChart3, ScanLine, Activity, Package } from "lucide-react";

export default function AnalyticsPage() {
  const { dashboard, loading } = useDashboardData();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");

  const dailyScans = dashboard?.daily_scans ?? [];
  const totalScans = dailyScans.reduce((s, d) => s + d.scans, 0);
  const avgScansPerDay =
    dailyScans.length > 0 ? Math.round(totalScans / dailyScans.length) : 0;
  const statusMonthly = dashboard?.equipment_status_monthly ?? [];
  const latestStatus =
    statusMonthly.length > 0 ? statusMonthly[statusMonthly.length - 1] : null;
  const totalEquipment = latestStatus
    ? latestStatus.operational + latestStatus.maintenance + latestStatus.retired
    : 0;
  const fleetHealth = dashboard?.kpi?.fleet_health_score ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Trends, performance metrics, and fleet insights.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? "bg-white text-emerald-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ScanLine size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? "—" : totalScans}</p>
              <p className="text-xs text-slate-500">Total scans ({period})</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BarChart3 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? "—" : avgScansPerDay}</p>
              <p className="text-xs text-slate-500">Avg scans/day</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Package size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? "—" : totalEquipment}</p>
              <p className="text-xs text-slate-500">Total equipment</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Activity size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? "—" : `${fleetHealth}%`}</p>
              <p className="text-xs text-slate-500">Fleet health</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <DailyScanChart />
        </div>
        <AssetValueChart />
        <CategoryDonut />
        <div className="lg:col-span-2">
          <EquipmentStatusChart />
        </div>
      </div>
    </div>
  );
}
