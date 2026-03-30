import { redirect } from "next/navigation";

/** Legacy URL — LRIDS lives at `/lrids/[facilityId]?token=...` (opened from the sidebar). */
export default function LRIDSLegacyRedirectPage() {
  redirect("/dashboard/home");
}
