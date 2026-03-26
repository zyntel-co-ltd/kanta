/**
 * Kanta design system — mirrors CSS variables in app/globals.css
 * (Plan §1 Foundations + §9 status semantics)
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

export const MODULE_THEMES = {
  neutral: {
    primary: "#475569",
    primaryDark: "#334155",
    primaryLight: "#e2e8f0",
    sidebarBg: "#334155",
    sidebarActiveBg: "#475569",
    sidebarActiveText: "#f8fafc",
    sidebarHoverBg: "#3f4d63",
  },
  labMetrics: {
    primary: BRAND.DEFAULT,
    primaryDark: BRAND.DARK,
    primaryLight: BRAND.LIGHT,
    sidebarBg: BRAND.DARKER,
    sidebarActiveBg: BRAND.DEFAULT,
    sidebarActiveText: "#ecfdf5",
    sidebarHoverBg: "#0f766e",
  },
  qualityManagement: {
    primary: "#2563eb",
    primaryDark: "#1e3a5f",
    primaryLight: "#dbeafe",
    sidebarBg: "#1e3a5f",
    sidebarActiveBg: "#2563eb",
    sidebarActiveText: "#eff6ff",
    sidebarHoverBg: "#274c7a",
  },
  assetManagement: {
    primary: "#dc2626",
    primaryDark: "#7f1d1d",
    primaryLight: "#fee2e2",
    sidebarBg: "#7f1d1d",
    sidebarActiveBg: "#dc2626",
    sidebarActiveText: "#fef2f2",
    sidebarHoverBg: "#8b2323",
  },
} as const;
