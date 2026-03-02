"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { equipmentStatusDataByPeriod } from "@/lib/data";

type Period = "3m" | "6m" | "12m";

const PERIODS: { key: Period; label: string }[] = [
  { key: "3m", label: "3 mo" },
  { key: "6m", label: "6 mo" },
  { key: "12m", label: "12 mo" },
];

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
  const [period, setPeriod] = useState<Period>("12m");
  const data = equipmentStatusDataByPeriod[period];
  const latest = data[data.length - 1];

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
        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${
                period === key
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
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
          <BarChart data={data} barSize={10} barGap={1} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="operational" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={500} />
            <Bar dataKey="maintenance" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={600} />
            <Bar dataKey="retired"     stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
