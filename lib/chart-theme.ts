/**
 * Chart.js — neutral structure + semantic status series (Plan §6 Charts)
 * ENG-131: Lab module accents use teal; asset equipment stacks use sky/cyan.
 */

import { STATUS, STRUCTURE, MODULE_COLORS } from "@/lib/design-tokens";

/** Lab Metrics — TAT / operational trend accent (teal, not brand emerald) */
const LAB_TEAL = MODULE_COLORS.labMetrics.hex;
const LAB_TEAL_FILL = "rgba(15, 118, 110, 0.12)";
const SKY = MODULE_COLORS.assetManagement.hex;

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

export const CHART_AXIS = {
  tick: STRUCTURE.TEXT_HINT,
  grid: "#f1f5f9",
} as const;

/** TAT / lab metrics — pie, line, bar (module teal + semantic status) */
export const CHART_TAT = {
  pie: [LAB_TEAL, STATUS.WARN, STATUS.BAD, CHART_NEUTRAL.border] as const,
  lineOnTime: { border: LAB_TEAL, fill: LAB_TEAL_FILL },
  lineDelayed: { border: STATUS.BAD, fill: CHART_STATUS.bad.background },
  lineNotUploaded: { border: CHART_NEUTRAL.border, fill: CHART_NEUTRAL.background },
  barOnTime: LAB_TEAL,
  barDelayed: STATUS.BAD,
  barNotUploaded: CHART_NEUTRAL.border,
} as const;

/** Equipment stacked bars — operational (sky), maintenance (warn), retired (neutral) */
export const CHART_EQUIPMENT_STACK = {
  operational: SKY,
  maintenance: STATUS.WARN,
  retired: STRUCTURE.BORDER,
} as const;

export const CHART_BRAND_SECONDARY = {
  border: "#2dd4bf",
  background: LAB_TEAL_FILL,
} as const;

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
