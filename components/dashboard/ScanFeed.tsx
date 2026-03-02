"use client";

import { ArrowUpRight, CheckCircle2, Clock, WifiOff } from "lucide-react";
import clsx from "clsx";
import { scanFeed, scheduleData } from "@/lib/data";

const statusConfig = {
  operational: {
    label: "Operational",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  maintenance: {
    label: "Maintenance",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  offline: {
    label: "Offline",
    icon: WifiOff,
    color: "text-red-400",
    bg: "bg-red-50",
  },
};

export default function ScanFeed() {
  const { nextMaintenance, days, activeDay, month, year } = scheduleData;

  return (
    <>
      {/* ── Next Maintenance Card ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        {/* Equipment info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-700 font-bold text-base">
              {nextMaintenance.equipment.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate leading-snug">
              {nextMaintenance.equipment}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{nextMaintenance.type}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-xs text-slate-500 truncate">
                {nextMaintenance.department} · {nextMaintenance.time}
              </span>
            </div>
          </div>
        </div>

        {/* Mini calendar */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-600">Schedule</p>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <button className="px-1 hover:text-slate-700 transition-colors">‹</button>
            <span>{month} {year}</span>
            <button className="px-1 hover:text-slate-700 transition-colors">›</button>
          </div>
        </div>
        <div className="flex gap-1">
          {days.map((d) => (
            <button
              key={d}
              className={clsx(
                "flex-1 h-7 rounded-lg text-xs font-semibold transition-all",
                d === activeDay
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Scan Feed ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Live Scan Feed</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400">Live</span>
            </div>
          </div>
          <button className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors">
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="space-y-1">
          {scanFeed.map((item) => {
            const config = statusConfig[item.status as keyof typeof statusConfig];
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div
                  className={clsx(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    config.bg
                  )}
                >
                  <Icon size={13} className={config.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors leading-snug">
                    {item.equipment}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {item.department} · {item.location}
                  </p>
                  <p className="text-xs text-slate-400 truncate">by {item.scannedBy}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5 whitespace-nowrap">
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
