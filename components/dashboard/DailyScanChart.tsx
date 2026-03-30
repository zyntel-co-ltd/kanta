"use client";

import { LazyBar } from "@/components/charts/LazyCharts";
import type { ChartData, ChartOptions } from "chart.js";
import { CHART_AXIS, CHART_STATUS } from "@/lib/chart-theme";
import { BRAND } from "@/lib/design-tokens";
import { useDashboardData } from "@/lib/DashboardDataContext";

export default function DailyScanChart() {
  const { dashboard, loading } = useDashboardData();
  const data = dashboard?.daily_scans ?? [];
  const maxDay = data.length > 0 ? data.reduce((max, d) => (d.scans > max.scans ? d : max)) : { day: "—", scans: 0 };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="h-56 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const labels = (data.length ? data : [{ day: "—", scans: 0 }]).map((d) => d.day);
  const values = (data.length ? data : [{ day: "—", scans: 0 }]).map((d) => d.scans);

  const chartData: ChartData<"bar"> = {
    labels,
    datasets: [
      {
        label: "Scans",
        data: values,
        backgroundColor: labels.map((day) =>
          day === maxDay.day ? CHART_STATUS.ok.border : BRAND.LIGHT
        ),
        borderColor: labels.map((day) =>
          day === maxDay.day ? CHART_STATUS.ok.border : BRAND.LIGHT
        ),
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 18,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => `Scans: ${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
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
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-800">
          Daily Scan Activity
        </h3>
      </div>

      <div className="mt-1">
        <p className="text-2xl font-bold text-slate-900">
          {maxDay.scans.toLocaleString()}{" "}
          <span className="text-sm font-normal text-slate-400">
            peak scans
          </span>
        </p>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full mt-1">
          +41% avg admissions
        </span>
      </div>

      <div className="mt-4 h-36 min-h-[144px] min-w-[1px]">
        <LazyBar data={chartData} options={options} />
      </div>
    </div>
  );
}
