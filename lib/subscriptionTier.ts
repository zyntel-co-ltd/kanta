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
