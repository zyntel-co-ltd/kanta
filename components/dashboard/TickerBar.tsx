"use client";

import { CheckCircle2, Clock, WifiOff } from "lucide-react";
import clsx from "clsx";
import { scanFeed } from "@/lib/data";

const statusConfig = {
  operational: { icon: CheckCircle2, color: "text-emerald-400" },
  maintenance:  { icon: Clock,         color: "text-amber-400"   },
  offline:      { icon: WifiOff,       color: "text-red-400"     },
};

// Duplicate items so the scroll loops seamlessly
const items = [...scanFeed, ...scanFeed, ...scanFeed];

export default function TickerBar() {
  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 overflow-hidden flex items-center h-8 select-none">
      {/* Label */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-slate-700 h-full bg-indigo-600">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
          Live Feed
        </span>
      </div>

      {/* Scrolling strip */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center animate-ticker whitespace-nowrap">
          {items.map((item, i) => {
            const config = statusConfig[item.status as keyof typeof statusConfig];
            const Icon = config.icon;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-5 text-xs text-slate-300"
              >
                <Icon size={11} className={clsx(config.color, "flex-shrink-0")} />
                <span className="font-medium text-white">{item.equipment}</span>
                <span className="text-slate-500">·</span>
                <span>{item.department}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{item.time}</span>
                <span className="ml-3 text-slate-700">|</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
