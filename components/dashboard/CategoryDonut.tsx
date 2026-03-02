"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { equipmentCategoryData } from "@/lib/data";

const trends = [
  { arrow: "up",   pct: "+8%" },
  { arrow: "up",   pct: "+3%" },
  { arrow: "down", pct: "-2%" },
  { arrow: "up",   pct: "+5%" },
];

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}) => {
  if (active && payload && payload.length) {
    const total = equipmentCategoryData.reduce((s, d) => s + d.value, 0);
    const pct = Math.round((payload[0].value / total) * 100);
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-white/10">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-slate-300 mt-0.5">
          {payload[0].value} items · <span className="text-white font-bold">{pct}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function CategoryDonut() {
  const total = equipmentCategoryData.reduce((s, d) => s + d.value, 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Equipment by Category</h3>
        <button className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          All Time <ChevronDown size={12} />
        </button>
      </div>

      <div className="relative flex items-center justify-center h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={equipmentCategoryData}
              cx="50%"
              cy="50%"
              innerRadius={46}
              outerRadius={activeIndex !== null ? 72 : 68}
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationBegin={200}
              animationDuration={900}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {equipmentCategoryData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="none"
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                  style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-400">Total Items</span>
        </div>
      </div>

      {/* Legend with trend arrows */}
      <div className="mt-3 space-y-2">
        {equipmentCategoryData.map((item, i) => {
          const t = trends[i];
          const isUp = t.arrow === "up";
          return (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-600">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? "text-emerald-500" : "text-red-400"}`}>
                  {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {t.pct}
                </span>
                <span className="text-xs font-semibold text-slate-800">{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
