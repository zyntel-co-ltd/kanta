"use client";

import { CheckCircle2, Clock, WifiOff } from "lucide-react";
import clsx from "clsx";
import { scanFeed } from "@/lib/data";
import { useDashboardData } from "@/lib/DashboardDataContext";

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  operational: { icon: CheckCircle2, color: "text-emerald-400" },
  maintenance:  { icon: Clock,         color: "text-amber-400"   },
  offline:      { icon: WifiOff,       color: "text-red-400"     },
  retired:      { icon: Clock,         color: "text-slate-400"   },
};

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TickerBar() {
  const { scans } = useDashboardData();
  const liveItems = scans.map((s) => ({
    equipment: s.equipment?.name ?? "Equipment",
    department: (s.equipment as { department?: { name?: string } })?.department?.name ?? "—",
    status: s.status_at_scan,
    time: formatTimeAgo(s.created_at),
  }));
  const items = liveItems.length > 0 ? [...liveItems, ...liveItems, ...liveItems] : [...scanFeed, ...scanFeed, ...scanFeed];
  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 overflow-hidden flex items-center h-8 select-none">
      {/* Label */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-slate-700 h-full bg-slate-600">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
          Live Feed
        </span>
      </div>

      {/* Scrolling strip */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center animate-ticker whitespace-nowrap">
          {items.map((item, i) => {
            const status = "status" in item ? (item.status as string) : "operational";
            const config = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.operational;
            const Icon = config.icon;
            const equipment = "equipment" in item ? String(item.equipment) : "Equipment";
            const department = "department" in item ? String(item.department) : "—";
            const time = "time" in item ? String(item.time) : "";
            return (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-5 text-xs text-slate-300"
              >
                <Icon size={11} className={clsx(config.color, "flex-shrink-0")} />
                <span className="font-medium text-white">{equipment}</span>
                <span className="text-slate-500">·</span>
                <span>{department}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{time}</span>
                <span className="ml-3 text-slate-700">|</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
