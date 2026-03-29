"use client";

import Link from "next/link";

/**
 * ENG-86: Shown when a facility has no active lab sections in configuration.
 */
export default function LabMetricsConfigEmpty({
  canAccessAdminPanel,
}: {
  canAccessAdminPanel: boolean;
}) {
  return (
    <div className="mx-6 my-8 rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-6 text-sm text-amber-950">
      <p className="font-semibold text-amber-900 mb-2">No sections configured</p>
      <p className="text-amber-900/90 mb-3">
        Ask your Facility Admin to set up lab sections in{" "}
        <span className="font-medium">Admin → Configuration</span> before Lab Metrics filters and
        charts can use your hospital&apos;s layout.
      </p>
      {canAccessAdminPanel && (
        <Link
          href="/dashboard/admin"
          className="inline-flex font-medium text-emerald-800 underline decoration-emerald-600/50 hover:decoration-emerald-700"
        >
          Open Admin → Configuration
        </Link>
      )}
    </div>
  );
}
