"use client";

import { Building2 } from "lucide-react";

/**
 * Legacy public URL — LRIDS is now opened from the dashboard with a signed token:
 * `/lrids/[facilityId]?token=...`
 */
export default function LegacyKantaLridsPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-white"
      style={{ background: "linear-gradient(160deg, #042f2e 0%, #065f46 50%, #0f172a 100%)" }}
    >
      <Building2 size={40} className="text-emerald-300/80 mb-4" />
      <h1 className="text-xl font-semibold">Display URL has moved</h1>
      <p className="mt-3 text-sm text-emerald-100/80 max-w-md leading-relaxed">
        Sign in to Kanta, enable LRIDS for your facility, then use{" "}
        <strong className="text-white">Lab Metrics → LRIDS</strong> in the sidebar. That opens the
        waiting-area board in a new tab with a secure link.
      </p>
    </div>
  );
}
