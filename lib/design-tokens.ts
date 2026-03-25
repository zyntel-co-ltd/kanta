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
