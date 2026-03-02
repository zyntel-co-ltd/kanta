"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, ScanLine, Wrench, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import clsx from "clsx";
import { kpiCards } from "@/lib/data";

const sparklines = {
  alerts:      [{ v: 8 }, { v: 11 }, { v: 9 }, { v: 13 }, { v: 10 }, { v: 12 }, { v: 14 }],
  scanned:     [{ v: 180 }, { v: 210 }, { v: 240 }, { v: 265 }, { v: 290 }, { v: 300 }, { v: 312 }],
  maintenance: [{ v: 82 }, { v: 79 }, { v: 85 }, { v: 80 }, { v: 76 }, { v: 78 }, { v: 74 }],
  health:      [{ v: 78 }, { v: 80 }, { v: 79 }, { v: 81 }, { v: 82 }, { v: 83 }, { v: 84 }],
};

const iconMap = {
  alerts: AlertTriangle,
  scanned: ScanLine,
  maintenance: Wrench,
  health: Activity,
};

const cardThemes = {
  red: {
    gradient: "from-red-500 to-rose-600",
    glow: "shadow-red-200",
    sparkColor: "#fca5a5",
    badge: "bg-white/20 text-white",
    iconBg: "bg-white/20",
    pulse: true,
  },
  indigo: {
    gradient: "from-indigo-500 to-violet-600",
    glow: "shadow-indigo-200",
    sparkColor: "#a5b4fc",
    badge: "bg-white/20 text-white",
    iconBg: "bg-white/20",
    pulse: false,
  },
  amber: {
    gradient: "from-amber-400 to-orange-500",
    glow: "shadow-amber-200",
    sparkColor: "#fde68a",
    badge: "bg-white/20 text-white",
    iconBg: "bg-white/20",
    pulse: false,
  },
  emerald: {
    gradient: "from-emerald-400 to-teal-500",
    glow: "shadow-emerald-200",
    sparkColor: "#6ee7b7",
    badge: "bg-white/20 text-white",
    iconBg: "bg-white/20",
    pulse: false,
  },
};

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return count;
}

function AnimatedValue({ value, unit }: { value: number; unit?: string }) {
  const count = useCountUp(value);
  return (
    <span className="animate-count-up">
      {count}
      {unit && <span className="text-xl font-semibold opacity-80 ml-0.5">{unit}</span>}
    </span>
  );
}

// Severity pill row shown inside the Critical Alerts card
function AlertSeverityBreakdown({
  severity,
}: {
  severity: { critical: number; warning: number; info: number };
}) {
  return (
    <div className="mt-2 flex items-center gap-1.5 relative z-10 flex-wrap">
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-900/40 text-red-200 border border-red-400/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse" />
        {severity.critical} critical
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-200 border border-orange-400/30">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />
        {severity.warning} warning
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        {severity.info} info
      </span>
    </div>
  );
}

// Compliance bar shown inside the Maintenance card
function ComplianceBar({
  compliance,
}: {
  compliance: { completed: number; total: number; overdue: number };
}) {
  const pct = Math.round((compliance.completed / compliance.total) * 100);
  return (
    <div className="mt-2 relative z-10">
      <div className="flex justify-between text-xs text-white/70 mb-1">
        <span>{compliance.completed} on time</span>
        <span className="text-red-200">{compliance.overdue} overdue</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-white transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function KpiCards() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {kpiCards.map((card, i) => {
        const Icon = iconMap[card.id as keyof typeof iconMap];
        const theme = cardThemes[card.color as keyof typeof cardThemes];
        const spark = sparklines[card.id as keyof typeof sparklines];
        const isUp = card.trend === "up";
        const stagger = `stagger-${i + 1}` as string;

        return (
          <div
            key={card.id}
            className={clsx(
              "relative rounded-2xl p-5 overflow-hidden animate-slide-up",
              `bg-gradient-to-br ${theme.gradient}`,
              `shadow-xl ${theme.glow}`,
              stagger
            )}
          >
            {/* Background orb */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

            {/* Top row */}
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", theme.iconBg)}>
                <Icon size={18} className="text-white" />
              </div>

              {/* Pulsing alert dot for critical */}
              {theme.pulse && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-semibold text-white/80">Live</span>
                </span>
              )}

              {/* Trend badge */}
              {!theme.pulse && (
                <span className={clsx("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", theme.badge)}>
                  {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isUp ? "+" : ""}{card.change}{card.unit ?? ""}
                </span>
              )}
            </div>

            {/* Value */}
            <p className="text-3xl font-bold text-white tracking-tight relative z-10">
              <AnimatedValue value={card.value as number} unit={card.unit} />
            </p>
            <p className="text-sm font-medium text-white/80 mt-1 relative z-10">{card.label}</p>
            <p className="text-xs text-white/60 mt-0.5 relative z-10">{card.changeLabel}</p>

            {/* Sparkline */}
            <div className="mt-3 h-10 relative z-10 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spark}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={theme.sparkColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1200}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Alert card: severity breakdown */}
            {"severity" in card && card.severity && (
              <AlertSeverityBreakdown severity={card.severity} />
            )}

            {/* Maintenance card: compliance progress bar */}
            {"compliance" in card && card.compliance && (
              <ComplianceBar compliance={card.compliance} />
            )}

            {/* Other cards: pulsing change badge */}
            {!("severity" in card) && !("compliance" in card) && theme.pulse && (
              <div className="mt-2 relative z-10">
                <span className={clsx("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full w-fit", theme.badge)}>
                  <TrendingUp size={11} />+{card.change} since yesterday
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
