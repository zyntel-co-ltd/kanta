"use client";

/**
 * Reusable TAT charts panel — pie chart, daily trend, hourly trend, KPIs + progress bars.
 * Mirrors zyntel-dashboard TAT.tsx layout exactly.
 * Used by both Patient Tracking and Test Tracking chart sub-tabs.
 */

import { LazyDoughnut, LazyLine } from "@/components/charts/LazyCharts";
import type { ChartData, ChartOptions } from "chart.js";

type PieData = {
  onTime: number;
  delayedLess15: number;
  overDelayed: number;
  notUploaded: number;
};

type DailyPoint = { date: string; delayed: number; onTime: number; notUploaded: number };
type HourlyPoint = { hour: number; delayed: number; onTime: number; notUploaded: number };

type Kpis = {
  totalRequests?: number;
  totalTests?: number;
  delayedRequests?: number;
  delayedTests?: number;
  onTimeRequests?: number;
  onTimeTests?: number;
  avgDailyDelayed: number;
  avgDailyOnTime: number;
  avgDailyNotUploaded: number;
  mostDelayedHour: string;
  mostDelayedDay: string;
};

type Props = {
  pieData: PieData;
  dailyTrend: DailyPoint[];
  hourlyTrend: HourlyPoint[];
  kpis: Kpis;
  granularity?: "daily" | "monthly";
  label?: string; // "requests" | "tests"
};

function formatLabel(date: string, granularity?: "daily" | "monthly") {
  if (granularity === "monthly" || (date.length === 7 && date[4] === "-")) {
    const [y, m] = date.split("-");
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ProgressBar({
  current,
  total,
  title,
  color,
}: {
  current: number;
  total: number;
  title: string;
  color: string;
}) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{title}</span>
        <span className="font-semibold" style={{ color }}>
          {current.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>{pct.toFixed(1)}%</span>
        <span>of {total.toLocaleString()} total</span>
      </div>
    </div>
  );
}

function KPITile({ title, value, icon }: { title: string; value: string | number; icon?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1">
      {icon && <span className="text-lg">{icon}</span>}
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-base font-bold text-slate-800 truncate">{value}</p>
    </div>
  );
}

export default function TatChartsPanel({
  pieData,
  dailyTrend,
  hourlyTrend,
  kpis,
  granularity,
  label = "requests",
}: Props) {
  const total =
    (pieData.onTime ?? 0) +
    (pieData.delayedLess15 ?? 0) +
    (pieData.overDelayed ?? 0) +
    (pieData.notUploaded ?? 0);

  const delayed = (pieData.delayedLess15 ?? 0) + (pieData.overDelayed ?? 0);
  const onTime = pieData.onTime ?? 0;

  // Doughnut chart
  const doughnutData: ChartData<"doughnut"> = {
    labels: ["On Time", "Delayed for <15 min", "Over Delayed", "Not Uploaded"],
    datasets: [
      {
        data: [
          pieData.onTime ?? 0,
          pieData.delayedLess15 ?? 0,
          pieData.overDelayed ?? 0,
          pieData.notUploaded ?? 0,
        ],
        backgroundColor: ["#4CAF50", "#FFC107", "#F44336", "#9E9E9E"],
        borderColor: "#fff",
        borderWidth: 2,
      },
    ],
  };
  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "55%",
    plugins: {
      legend: {
        position: "right",
        labels: { boxWidth: 14, padding: 12, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number(ctx.parsed ?? 0);
            const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0";
            return `${ctx.label}: ${v.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  // Daily trend line chart
  const dailyLineData: ChartData<"line"> = {
    labels: dailyTrend.map((d) => formatLabel(d.date, granularity)),
    datasets: [
      {
        label: "Delayed",
        data: dailyTrend.map((d) => d.delayed),
        borderColor: "#f44336",
        backgroundColor: "#f44336",
        fill: false,
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 0,
      },
      {
        label: "On Time",
        data: dailyTrend.map((d) => d.onTime),
        borderColor: "#4caf50",
        backgroundColor: "#4caf50",
        fill: false,
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 0,
      },
      {
        label: "Not Uploaded",
        data: dailyTrend.map((d) => d.notUploaded),
        borderColor: "#9E9E9E",
        backgroundColor: "#9E9E9E",
        fill: false,
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 0,
      },
    ],
  };
  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "bottom", labels: { usePointStyle: true, padding: 20 } },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { title: { display: true, text: "Date", color: "#666" }, grid: { display: false }, ticks: { color: "#666" } },
      y: {
        beginAtZero: true,
        title: { display: true, text: `Number of ${label}`, color: "#666" },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { color: "#666" },
      },
    },
  };

  // Hourly chart (with fill)
  const hourlyLineData: ChartData<"line"> = {
    labels: hourlyTrend.map((h) => `${h.hour}:00`),
    datasets: [
      {
        label: "Delayed",
        data: hourlyTrend.map((h) => h.delayed),
        borderColor: "#f44336",
        backgroundColor: "rgba(244,67,54,0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#f44336",
        pointBorderColor: "#fff",
        pointBorderWidth: 1,
      },
      {
        label: "On Time",
        data: hourlyTrend.map((h) => h.onTime),
        borderColor: "#4caf50",
        backgroundColor: "rgba(76,175,80,0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#4caf50",
        pointBorderColor: "#fff",
        pointBorderWidth: 1,
      },
      {
        label: "Not Uploaded",
        data: hourlyTrend.map((h) => h.notUploaded),
        borderColor: "#9E9E9E",
        backgroundColor: "rgba(158,158,158,0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#9E9E9E",
        pointBorderColor: "#fff",
        pointBorderWidth: 1,
      },
    ],
  };
  const hourlyOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "bottom", labels: { usePointStyle: true, padding: 20 } },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        title: { display: true, text: "Hour of Day", color: "#666" },
        grid: { display: false },
        ticks: { color: "#666" },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: `Number of ${label}`, color: "#666" },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { color: "#666" },
      },
    },
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left sidebar: progress bars + KPIs */}
      <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <ProgressBar
            current={delayed}
            total={total}
            title="Total Delayed"
            color="#f44336"
          />
          <ProgressBar
            current={onTime}
            total={total}
            title="Total On-Time"
            color="#4caf50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KPITile
            title="Avg Daily On-Time"
            value={kpis.avgDailyOnTime}
            icon="✅"
          />
          <KPITile
            title="Avg Daily Delays"
            value={kpis.avgDailyDelayed}
            icon="⏰"
          />
          <KPITile
            title="Avg Daily Not Uploaded"
            value={kpis.avgDailyNotUploaded}
            icon="⬆️"
          />
          <KPITile
            title="Most Delayed Hour"
            value={kpis.mostDelayedHour}
            icon="🕐"
          />
          <div className="col-span-2">
            <KPITile
              title="Most Delayed Day"
              value={kpis.mostDelayedDay}
              icon="📅"
            />
          </div>
        </div>
      </aside>

      {/* Right: charts */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Pie / Doughnut */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            TAT Performance Distribution
          </h3>
          {total > 0 ? (
            <div className="h-[300px]">
              <LazyDoughnut data={doughnutData} options={doughnutOptions} />
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">
              No data for the selected period
            </div>
          )}
        </div>

        {/* Daily trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {granularity === "monthly" ? "Monthly" : "Daily"} TAT Performance Trend
          </h3>
          {dailyTrend.length > 0 ? (
            <div className="h-[280px]">
              <LazyLine data={dailyLineData} options={lineOptions} />
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">
              No trend data available
            </div>
          )}
        </div>

        {/* Hourly trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Hourly TAT Performance Trend
          </h3>
          {hourlyTrend.some((h) => h.delayed + h.onTime + h.notUploaded > 0) ? (
            <div className="h-[280px]">
              <LazyLine data={hourlyLineData} options={hourlyOptions} />
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">
              No hourly data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
