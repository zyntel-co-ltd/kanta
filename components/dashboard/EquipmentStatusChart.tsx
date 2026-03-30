"use client";

import { LazyBar } from "@/components/charts/LazyCharts";
import type { ChartData, ChartOptions } from "chart.js";
import { CHART_AXIS, CHART_EQUIPMENT_STACK } from "@/lib/chart-theme";
import { useDashboardData } from "@/lib/DashboardDataContext";

export default function EquipmentStatusChart() {
  const { dashboard, loading } = useDashboardData();
  const data = dashboard?.equipment_status_monthly ?? [];
  const latest = data.length > 0 ? data[data.length - 1] : { month: "", operational: 0, maintenance: 0, retired: 0 };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm h-full">
        <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const safe = data.length ? data : [{ month: "—", operational: 0, maintenance: 0, retired: 0 }];
  const labels = safe.map((d) => d.month);

  const chartData: ChartData<"bar"> = {
    labels,
    datasets: [
      {
        label: "Operational",
        data: safe.map((d) => d.operational),
        backgroundColor: CHART_EQUIPMENT_STACK.operational,
        borderWidth: 0,
        stack: "stack1",
        barThickness: 10,
      },
      {
        label: "Maintenance",
        data: safe.map((d) => d.maintenance),
        backgroundColor: CHART_EQUIPMENT_STACK.maintenance,
        borderWidth: 0,
        stack: "stack1",
        barThickness: 10,
      },
      {
        label: "Retired",
        data: safe.map((d) => d.retired),
        backgroundColor: CHART_EQUIPMENT_STACK.retired,
        borderWidth: 0,
        stack: "stack1",
        barThickness: 10,
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
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 10 }, color: CHART_AXIS.tick },
      },
      y: {
        stacked: true,
        display: false,
        grid: { display: false },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Equipment Status</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />Operational
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />Maintenance
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-slate-300" />Retired
            </span>
          </div>
        </div>
      </div>

      <div className="mt-1">
        <p className="text-2xl font-bold text-slate-900">
          {latest.operational.toLocaleString()}{" "}
          <span className="text-sm font-normal text-slate-400">operational</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            {latest.maintenance} in maintenance
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {latest.retired} retired
          </span>
        </div>
      </div>

      <div className="mt-4 h-40 min-h-[160px] min-w-[1px]">
        <LazyBar data={chartData} options={options} />
      </div>
    </div>
  );
}
