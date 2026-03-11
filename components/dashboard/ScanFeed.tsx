"use client";

import { ArrowUpRight, CheckCircle2, Clock, WifiOff, Download } from "lucide-react";
import clsx from "clsx";
import { useDashboardData } from "@/lib/DashboardDataContext";
import type { ScanEvent } from "@/types";

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

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function exportToCSV(scans: ScanEvent[]) {
  const headers = ["Equipment", "Department", "Location", "Status", "Scanned By", "Time"];
  const rows = scans.map((s) => [
    s.equipment?.name ?? "—",
    s.equipment?.department?.name ?? "—",
    s.location ?? "—",
    s.status_at_scan,
    s.scanned_by,
    formatTime(s.created_at),
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
  const { scans, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="h-48 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Live Scan Feed */}
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
            <button
              onClick={() => exportToCSV(scans)}
              title="Export to CSV"
              disabled={scans.length === 0}
              className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors disabled:opacity-50"
            >
              <Download size={13} />
            </button>
            <button className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors">
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {scans.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No recent scans</p>
          ) : (
            scans.map((item) => {
              const config = statusConfig[item.status_at_scan as keyof typeof statusConfig] ?? statusConfig.operational;
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
                      {item.equipment?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {item.equipment?.department?.name ?? "—"} · {item.location ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">by {item.scanned_by}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5 whitespace-nowrap">
                    {formatTime(item.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
