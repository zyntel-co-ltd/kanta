/**
 * Kanta design system — mirrors CSS variables in app/globals.css
 * (Plan §1 Foundations + §9 status semantics)
 *
 * ENG-131: Canonical module accent colors (CEO-approved). Brand emerald stays for
 * Kanta identity, AI Insights, Admin/Settings — not for Lab Metrics module chrome.
 */

export const BRAND = {
  DEFAULT: "#059669",
  DARK: "#047857",
  DARKER: "#065f46",
  DEEPEST: "#042f2e",
  /** Matches --brand-light (muted bar / fill) */
  LIGHT: "#d1fae5",
  /** Matches --brand-muted (secondary series) */
  MUTED: "#6ee7b7",
} as const;

export const STATUS = {
  OK: "#059669",
  WARN: "#d97706",
  BAD: "#dc2626",
  INFO: "#2563eb",
} as const;

export const STRUCTURE = {
  TEXT: "#0f172a",
  TEXT_SECONDARY: "#475569",
  TEXT_HINT: "#94a3b8",
  BORDER: "#e2e8f0",
  SURFACE: "#ffffff",
  SURFACE_MUTED: "#f8fafc",
} as const;

/**
 * Canonical module map — Tailwind class tokens are static strings for Tailwind JIT.
 * @see globals.css [data-module="…"] for matching CSS variables.
 */
export const MODULE_COLORS = {
  labMetrics: {
    bg: "bg-teal-700",
    text: "text-teal-700",
    border: "border-teal-700",
    hex: "#0f766e",
  },
  assetManagement: {
    bg: "bg-sky-600",
    text: "text-sky-600",
    border: "border-sky-600",
    hex: "#0284c7",
  },
  qualitySamples: {
    bg: "bg-indigo-500",
    text: "text-indigo-500",
    border: "border-indigo-500",
    hex: "#6366f1",
  },
  aiInsights: {
    bg: "bg-emerald-600",
    text: "text-emerald-600",
    border: "border-emerald-600",
    hex: "#059669",
  },
  adminSettings: {
    bg: "bg-emerald-600",
    text: "text-emerald-600",
    border: "border-emerald-600",
    hex: "#059669",
  },
} as const;

/** @deprecated Prefer MODULE_COLORS + CSS variables; kept for gradual migration */
export const MODULE_THEMES = {
  neutral: {
    primary: "#64748b",
    primaryDark: "#475569",
    primaryLight: "#e2e8f0",
    sidebarBg: "#ffffff",
    sidebarActiveBg: "#e2e8f0",
    sidebarActiveText: "#0f172a",
    sidebarHoverBg: "#f1f5f9",
  },
  labMetrics: {
    primary: MODULE_COLORS.labMetrics.hex,
    primaryDark: "#0d9488",
    primaryLight: "#ccfbf1",
    sidebarBg: "#ffffff",
    sidebarActiveBg: MODULE_COLORS.labMetrics.hex,
    sidebarActiveText: "#ffffff",
    sidebarHoverBg: "#f1f5f9",
  },
  qualityManagement: {
    primary: MODULE_COLORS.qualitySamples.hex,
    primaryDark: "#4f46e5",
    primaryLight: "#e0e7ff",
    sidebarBg: "#ffffff",
    sidebarActiveBg: MODULE_COLORS.qualitySamples.hex,
    sidebarActiveText: "#ffffff",
    sidebarHoverBg: "#f1f5f9",
  },
  assetManagement: {
    primary: MODULE_COLORS.assetManagement.hex,
    primaryDark: "#0369a1",
    primaryLight: "#e0f2fe",
    sidebarBg: "#ffffff",
    sidebarActiveBg: MODULE_COLORS.assetManagement.hex,
    sidebarActiveText: "#ffffff",
    sidebarHoverBg: "#f1f5f9",
  },
  aiInsights: {
    primary: MODULE_COLORS.aiInsights.hex,
    primaryDark: BRAND.DARK,
    primaryLight: BRAND.LIGHT,
    sidebarBg: "#ffffff",
    sidebarActiveBg: MODULE_COLORS.aiInsights.hex,
    sidebarActiveText: "#ffffff",
    sidebarHoverBg: "#f1f5f9",
  },
  adminSettings: {
    primary: MODULE_COLORS.adminSettings.hex,
    primaryDark: BRAND.DARK,
    primaryLight: BRAND.LIGHT,
    sidebarBg: "#ffffff",
    sidebarActiveBg: MODULE_COLORS.adminSettings.hex,
    sidebarActiveText: "#ffffff",
    sidebarHoverBg: "#f1f5f9",
  },
} as const;
