"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";
import { equipmentCategoryData } from "@/lib/data";

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-slate-300">
          Items:{" "}
          <span className="text-white font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function CategoryDonut() {
  const total = equipmentCategoryData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Equipment by Category
        </h3>
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
              innerRadius={48}
              outerRadius={68}
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {equipmentCategoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-400">Total Items</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-2">
        {equipmentCategoryData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-slate-600">{item.name}</span>
            </div>
            <span className="text-xs font-semibold text-slate-800">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
