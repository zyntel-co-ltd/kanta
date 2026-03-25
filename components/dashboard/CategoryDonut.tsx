"use client";

import { useState } from "react";
import "@/components/charts/registry";
import { Doughnut } from "react-chartjs-2";
import type { ActiveElement, ChartData, ChartEvent, ChartOptions } from "chart.js";
import { ChevronDown } from "lucide-react";
import { useDashboardData } from "@/lib/DashboardDataContext";

export default function CategoryDonut() {
  const { dashboard, loading } = useDashboardData();
  const data = dashboard?.equipment_by_category ?? [];
  const total = data.reduce((s, d) => s + d.value, 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="h-48 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Equipment by Category</h3>
        <button className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          All Time <ChevronDown size={12} />
        </button>
      </div>

      <div className="relative flex items-center justify-center h-36 min-h-[144px] min-w-[1px]">
        {(() => {
          const safe = data.length ? data : [{ name: "No data", value: 1, color: "#e2e8f0" }];
          const labels = safe.map((d) => d.name);
          const values = safe.map((d) => d.value);
          const colors = safe.map((d, idx) => {
            if (activeIndex === null) return d.color;
            return idx === activeIndex ? d.color : `${d.color}80`;
          });

          const chartData: ChartData<"doughnut"> = {
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 6,
              },
            ],
          };

          const options: ChartOptions<"doughnut"> = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "64%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: (items) => items[0]?.label ?? "",
                  label: (ctx) => {
                    const v = Number(ctx.parsed ?? 0);
                    const denom = data.length ? total : v || 1;
                    const pct = denom > 0 ? Math.round((v / denom) * 100) : 0;
                    return `${v} items · ${pct}%`;
                  },
                },
              },
            },
            onHover: (_event: ChartEvent, elements: ActiveElement[]) => {
              const idx = elements?.[0]?.index;
              setActiveIndex(typeof idx === "number" ? idx : null);
            },
          };

          return (
            <div
              className="w-full h-full"
              onMouseLeave={() => setActiveIndex(null)}
            >
              <Doughnut
                data={chartData}
                options={options}
              />
            </div>
          );
        })()}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-400">Total Items</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-2">
        {(data.length ? data : []).map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-600">{item.name}</span>
            </div>
            <span className="text-xs font-semibold text-slate-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
