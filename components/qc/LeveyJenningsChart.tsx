"use client";

import { useMemo } from "react";
import { BRAND, STATUS, STRUCTURE } from "@/lib/design-tokens";

export type LJPoint = {
  runNumber: number;
  date: string;
  value: number;
  zScore: number;
  status: "ok" | "warning" | "rejection";
};

type LeveyJenningsChartProps = {
  data: LJPoint[];
  mean: number;
  sd: number;
  units?: string;
  width?: number;
  height?: number;
};

export default function LeveyJenningsChart({
  data,
  mean,
  sd,
  width = 600,
  height = 300,
}: LeveyJenningsChartProps) {
  const { points, minVal, maxVal, padding } = useMemo(() => {
    const p = { top: 20, right: 20, bottom: 40, left: 50 };
    const vals = data.map((d) => d.value);
    const min = Math.min(mean - 3 * sd, ...vals, mean - 3 * sd - 0.5);
    const max = Math.max(mean + 3 * sd, ...vals, mean + 3 * sd + 0.5);
    return {
      points: data,
      minVal: min,
      maxVal: max,
      padding: p,
    };
  }, [data, mean, sd]);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const toY = (v: number) =>
    padding.top + chartHeight - ((v - minVal) / (maxVal - minVal || 1)) * chartHeight;
  const toX = (i: number) =>
    padding.left + (i / Math.max(1, points.length - 1)) * chartWidth;

  const lines = [
    { y: mean, label: "Mean", color: BRAND.DEFAULT },
    { y: mean + sd, label: "+1s", color: STRUCTURE.TEXT_HINT },
    { y: mean - sd, label: "-1s", color: STRUCTURE.TEXT_HINT },
    { y: mean + 2 * sd, label: "+2s", color: STATUS.WARN },
    { y: mean - 2 * sd, label: "-2s", color: STATUS.WARN },
    { y: mean + 3 * sd, label: "+3s", color: STATUS.BAD },
    { y: mean - 3 * sd, label: "-3s", color: STATUS.BAD },
  ];

  return (
    <svg width={width} height={height} className="overflow-visible">
      {lines.map((l, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={toY(l.y)}
          x2={width - padding.right}
          y2={toY(l.y)}
          stroke={l.color}
          strokeWidth={l.label === "Mean" ? 2 : 1}
          strokeDasharray={l.label === "Mean" ? "none" : "4 2"}
        />
      ))}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(p.value)}
          r={5}
          fill={
            p.status === "rejection"
              ? STATUS.BAD
              : p.status === "warning"
              ? STATUS.WARN
              : STATUS.OK
          }
          stroke="#fff"
          strokeWidth={1}
        />
      ))}
      {points.length > 1 &&
        points.slice(0, -1).map((_, i) => (
          <line
            key={i}
            x1={toX(i)}
            y1={toY(points[i].value)}
            x2={toX(i + 1)}
            y2={toY(points[i + 1].value)}
            stroke={STRUCTURE.TEXT_HINT}
            strokeWidth={1}
            opacity={0.6}
          />
        ))}
      <text x={padding.left - 5} y={toY(mean)} textAnchor="end" fontSize={10} fill={STRUCTURE.TEXT_SECONDARY}>
        {mean.toFixed(2)}
      </text>
      <text x={width - padding.right + 5} y={height - padding.bottom} textAnchor="start" fontSize={10} fill={STRUCTURE.TEXT_SECONDARY}>
        Run #
      </text>
    </svg>
  );
}
