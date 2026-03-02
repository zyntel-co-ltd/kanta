"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { dailyScanData } from "@/lib/data";

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
        <p className="font-semibold">{label}</p>
        <p className="text-slate-300">
          Scans:{" "}
          <span className="text-white font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function DailyScanChart() {
  const maxDay = dailyScanData.reduce((max, d) =>
    d.scans > max.scans ? d : max
  );

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-800">
          Daily Scan Activity
        </h3>
        <button className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          This Week <ChevronDown size={12} />
        </button>
      </div>

      <div className="mt-1">
        <p className="text-2xl font-bold text-slate-900">
          {maxDay.scans}{" "}
          <span className="text-sm font-normal text-slate-400">
            peak scans
          </span>
        </p>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
          +41% avg admissions
        </span>
      </div>

      <div className="mt-4 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyScanData} barSize={18}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="scans" radius={[5, 5, 0, 0]}>
              {dailyScanData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.day === maxDay.day ? "#6366f1" : "#e0e7ff"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
