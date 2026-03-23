"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { getRecentVisits, formatTimeAgo } from "@/lib/recentVisits";

/**
 * Displays recently visited dashboard pages on the home screen.
 */
export default function RecentlyVisited() {
  const [visits, setVisits] = useState<ReturnType<typeof getRecentVisits>>([]);

  useEffect(() => {
    setVisits(getRecentVisits().slice(0, 3));
    const interval = setInterval(() => {
      setVisits(getRecentVisits().slice(0, 3));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (visits.length === 0) return null;

  return (
    <div className="animate-slide-up stagger-2">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-slate-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Recently visited
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {visits.map((v) => (
          <Link
            key={`${v.path}-${v.timestamp}`}
            href={v.path}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-800 transition-colors"
          >
            {v.label}
            <span className="text-[10px] text-slate-400 font-normal">{formatTimeAgo(v.timestamp)}</span>
            <ArrowRight size={12} className="text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
