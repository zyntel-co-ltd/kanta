/**
 * Plan/tier configuration — maps to plan_config table.
 * Used by API for equipment limits, history retention, rate limits.
 *
 * tier: 'free' | 'starter' | 'pro' | 'enterprise'
 * equipment_limit: -1 = unlimited
 * history_days: -1 = unlimited
 * api_calls_per_day: -1 = unlimited
 */

export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export type PlanConfig = {
  tier: PlanTier;
  equipment_limit: number;
  history_days: number;
  api_calls_per_day: number;
  features: Record<string, boolean>;
};

// Defaults (match plan_config seed). Override from DB when enforcing.
export const DEFAULT_PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: "free",
    equipment_limit: 5,
    history_days: 1,
    api_calls_per_day: 0,
    features: {},
  },
  starter: {
    tier: "starter",
    equipment_limit: 50,
    history_days: 90,
    api_calls_per_day: 5000,
    features: { api_access: true },
  },
  pro: {
    tier: "pro",
    equipment_limit: 200,
    history_days: 365,
    api_calls_per_day: 50000,
    features: { api_access: true, webhooks: true },
  },
  enterprise: {
    tier: "enterprise",
    equipment_limit: -1,
    history_days: -1,
    api_calls_per_day: -1,
    features: { api_access: true, webhooks: true, custom_integrations: true },
  },
};

export function getPlanConfig(tier: PlanTier): PlanConfig {
  return DEFAULT_PLAN_CONFIGS[tier] ?? DEFAULT_PLAN_CONFIGS.free;
}
