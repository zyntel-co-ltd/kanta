"use client";

import { useState } from "react";
import { LazyLine } from "@/components/charts/LazyCharts";
import type { ChartData, ChartOptions } from "chart.js";
import { CHART_AXIS, CHART_BRAND_SECONDARY, CHART_STATUS } from "@/lib/chart-theme";
import { assetValueDataByPeriod } from "@/lib/data";
import { useDashboardData } from "@/lib/DashboardDataContext";

type Period = "7d" | "30d" | "90d";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export default function AssetValueChart() {
  const [period, setPeriod] = useState<Period>("7d");
  const { dashboard, loading } = useDashboardData();
  const apiData = dashboard?.asset_value_by_period?.[period];
  const fallbackData = assetValueDataByPeriod[period];
  const data = apiData && apiData.length > 0 ? apiData : fallbackData;
  const peak = data.length > 0 ? Math.max(...data.map((d) => d.operational)) : 0;

  const labels = data.map((d) => d.day);
  const chartData: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Operational",
        data: data.map((d) => d.operational),
        borderColor: CHART_STATUS.ok.border,
        backgroundColor: CHART_STATUS.ok.background,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        fill: true,
      },
      {
        label: "Maintenance",
        data: data.map((d) => d.maintenance),
        borderColor: CHART_BRAND_SECONDARY.border,
        backgroundColor: CHART_BRAND_SECONDARY.background,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: CHART_AXIS.tick },
      },
      y: {
        display: false,
        grid: { display: false },
      },
    },
    elements: {
      point: { hitRadius: 10 },
    },
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Equipment Activity</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />Operational
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-200" />Maintenance
            </span>
          </div>
        </div>
        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${
                period === key
                  ? "bg-white text-slate-700 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1">
        <p className="text-2xl font-bold text-slate-900">
          {loading ? "—" : peak} <span className="text-sm font-normal text-slate-400">peak this period</span>
        </p>
      </div>

      <div className="mt-4 h-36 min-h-[144px] min-w-[1px]">
        <LazyLine data={chartData} options={options} />
      </div>
    </div>
  );
}
