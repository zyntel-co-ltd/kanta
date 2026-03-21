"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { assetValueDataByPeriod } from "@/lib/data";
import { useDashboardData } from "@/lib/DashboardDataContext";

type Period = "7d" | "30d" | "90d";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
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
          <p key={p.name} className="text-slate-300">
            {p.name === "operational" ? "Operational" : "Maintenance"}:{" "}
            <span className="text-white font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AssetValueChart() {
  const [period, setPeriod] = useState<Period>("7d");
  const { dashboard, loading } = useDashboardData();
  const apiData = dashboard?.asset_value_by_period?.[period];
  const fallbackData = assetValueDataByPeriod[period];
  const data = apiData && apiData.length > 0 ? apiData : fallbackData;
  const peak = data.length > 0 ? Math.max(...data.map((d) => d.operational)) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Equipment Activity</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-indigo-500" />Operational
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-indigo-200" />Maintenance
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
          {loading ? "—" : peak} <span className="text-sm font-normal text-slate-400">peak this period</span>
        </p>
      </div>

      <div className="mt-4 h-36 min-h-[144px] min-w-[1px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={144}>
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradOperational" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradMaintenance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#a5b4fc" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e0e7ff", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="operational"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#gradOperational)"
              dot={false}
              activeDot={{ r: 4, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={600}
            />
            <Area
              type="monotone"
              dataKey="maintenance"
              stroke="#a5b4fc"
              strokeWidth={2}
              fill="url(#gradMaintenance)"
              dot={false}
              activeDot={{ r: 3, fill: "#a5b4fc", stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
