"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { equipmentStatusData } from "@/lib/data";

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-white/10">
        <p className="font-semibold mb-1 text-slate-300">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-slate-300 capitalize">
            {p.name}: <span className="text-white font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function EquipmentStatusChart() {
  const latest = equipmentStatusData[equipmentStatusData.length - 1];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Equipment Status</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-indigo-500" />Operational
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />Maintenance
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-slate-300" />Retired
            </span>
          </div>
        </div>
        <button className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          Monthly <ChevronDown size={12} />
        </button>
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

      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={equipmentStatusData} barSize={10} barGap={1} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="operational" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={800} />
            <Bar dataKey="maintenance" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={900} />
            <Bar dataKey="retired"     stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
