export function isProfessionalOrAbove(tier: string | null | undefined): boolean {
  const t = (tier ?? "").trim().toLowerCase();
  if (!t) return false;
  return (
    t === "professional" ||
    t === "pro" ||
    t === "enterprise" ||
    t === "premium" ||
    t === "advanced"
  );
}

export function isAdminAccount(input: {
  isSuperAdmin?: boolean | null;
  canAccessAdminPanel?: boolean | null;
  canAccessAdmin?: boolean | null;
}): boolean {
  return !!(input.isSuperAdmin || input.canAccessAdminPanel || input.canAccessAdmin);
}
