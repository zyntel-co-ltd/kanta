"use client";

import { ArrowUpRight, CheckCircle2, Clock, WifiOff, Download } from "lucide-react";
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

const CURRENT_YEAR = 2026;

function getAgeBadge(purchaseYear: number) {
  const age = CURRENT_YEAR - purchaseYear;
  if (age < 3) return { label: `${age}y`, color: "text-emerald-600 bg-emerald-50", title: "New" };
  if (age < 7) return { label: `${age}y`, color: "text-amber-600 bg-amber-50", title: "Aging" };
  return { label: `${age}y`, color: "text-red-500 bg-red-50", title: "Old — higher risk" };
}

function exportToCSV() {
  const headers = ["Equipment", "Department", "Location", "Status", "Scanned By", "Time", "Age (years)"];
  const rows = scanFeed.map((item) => [
    item.equipment,
    item.department,
    item.location,
    item.status,
    item.scannedBy,
    item.time,
    String(CURRENT_YEAR - item.purchaseYear),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scan-feed-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

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
          <div className="flex items-center gap-1.5">
            {/* CSV Export */}
            <button
              onClick={exportToCSV}
              title="Export to CSV"
              className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
            >
              <Download size={13} />
            </button>
            <button className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors">
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {scanFeed.map((item) => {
            const config = statusConfig[item.status as keyof typeof statusConfig];
            const Icon = config.icon;
            const age = getAgeBadge(item.purchaseYear);
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
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors leading-snug">
                      {item.equipment}
                    </p>
                    {/* Age badge */}
                    <span
                      title={age.title}
                      className={clsx("text-xs font-bold px-1.5 py-0 rounded-full flex-shrink-0", age.color)}
                    >
                      {age.label}
                    </span>
                  </div>
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
