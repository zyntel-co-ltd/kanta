"use client";

import { TrendingUp, TrendingDown, AlertTriangle, ScanLine, Wrench, Activity } from "lucide-react";
import clsx from "clsx";
import { kpiCards } from "@/lib/data";

const iconMap = {
  alerts: AlertTriangle,
  scanned: ScanLine,
  maintenance: Wrench,
  health: Activity,
};

const colorMap = {
  red: {
    bg: "bg-red-50",
    icon: "text-red-500",
    badge: "bg-red-100 text-red-600",
    ring: "ring-red-100",
  },
  indigo: {
    bg: "bg-indigo-50",
    icon: "text-indigo-500",
    badge: "bg-indigo-100 text-indigo-600",
    ring: "ring-indigo-100",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "text-amber-500",
    badge: "bg-amber-100 text-amber-600",
    ring: "ring-amber-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    icon: "text-emerald-500",
    badge: "bg-emerald-100 text-emerald-600",
    ring: "ring-emerald-100",
  },
};

export default function KpiCards() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {kpiCards.map((card) => {
        const Icon = iconMap[card.id as keyof typeof iconMap];
        const colors = colorMap[card.color as keyof typeof colorMap];
        const isUp = card.trend === "up";

        return (
          <div
            key={card.id}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={clsx(
                  "w-10 h-10 rounded-xl flex items-center justify-center ring-4",
                  colors.bg,
                  colors.ring
                )}
              >
                <Icon size={18} className={colors.icon} />
              </div>
              <span
                className={clsx(
                  "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                  isUp && card.color === "red"
                    ? "bg-red-100 text-red-600"
                    : isUp
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-emerald-100 text-emerald-600"
                )}
              >
                {isUp ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
                {Math.abs(card.change)}
                {card.unit ?? ""}
              </span>
            </div>

            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              {card.value}
              {card.unit && (
                <span className="text-lg font-semibold text-slate-500">
                  {card.unit}
                </span>
              )}
            </p>
            <p className="text-sm font-medium text-slate-600 mt-1">
              {card.label}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{card.changeLabel}</p>
          </div>
        );
      })}
    </div>
  );
}
