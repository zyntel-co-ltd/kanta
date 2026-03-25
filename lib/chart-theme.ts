/**
 * Chart.js — neutral structure + semantic status series (Plan §6 Charts)
 * Import defaults in components/charts/registry.ts
 */

import { STATUS, STRUCTURE, BRAND } from "@/lib/design-tokens";

/** Default series for non-semantic trends (volume, counts) */
export const CHART_NEUTRAL = {
  border: "#64748b",
  background: "rgba(100, 116, 139, 0.12)",
};

export const CHART_STATUS = {
  ok: { border: STATUS.OK, background: "rgba(5, 150, 105, 0.15)" },
  warn: { border: STATUS.WARN, background: "rgba(217, 119, 6, 0.12)" },
  bad: { border: STATUS.BAD, background: "rgba(220, 38, 38, 0.12)" },
  info: { border: STATUS.INFO, background: "rgba(37, 99, 235, 0.1)" },
} as const;

/** Shared axis styling for Chart.js scales */
export const CHART_AXIS = {
  tick: STRUCTURE.TEXT_HINT,
  grid: "#f1f5f9",
} as const;

/** TAT / lab metrics — semantic pie, line, and stacked bar colors */
export const CHART_TAT = {
  pie: [STATUS.OK, STATUS.WARN, STATUS.BAD, CHART_NEUTRAL.border] as const,
  lineOnTime: { border: STATUS.OK, fill: CHART_STATUS.ok.background },
  lineDelayed: { border: STATUS.BAD, fill: CHART_STATUS.bad.background },
  lineNotUploaded: { border: CHART_NEUTRAL.border, fill: CHART_NEUTRAL.background },
  barOnTime: STATUS.OK,
  barDelayed: STATUS.BAD,
  barNotUploaded: CHART_NEUTRAL.border,
} as const;

/** Equipment stacked bars — operational (ok), maintenance (warn), retired (neutral) */
export const CHART_EQUIPMENT_STACK = {
  operational: STATUS.OK,
  maintenance: STATUS.WARN,
  retired: STRUCTURE.BORDER,
} as const;

/** Second series on dual-line charts (e.g. maintenance vs operational) */
export const CHART_BRAND_SECONDARY = {
  border: BRAND.MUTED,
  background: "rgba(110, 231, 183, 0.1)",
} as const;

/** Optional merge for per-chart options.plugins */
export const kantaChartTooltipPlugin = {
  tooltip: {
    backgroundColor: STRUCTURE.TEXT,
    titleColor: "#f8fafc",
    bodyColor: "#e2e8f0",
    borderColor: STRUCTURE.BORDER,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
  },
};
