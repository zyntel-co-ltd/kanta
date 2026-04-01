import Link from "next/link";

/**
 * Shown when lab sections are configured but `test_requests` is still empty (ENG-89).
 */
export default function LimsTestDataEmpty({ canAccessAdminPanel }: { canAccessAdminPanel: boolean }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-sm text-slate-800 shadow-sm">
      <p className="font-semibold text-slate-900">No data yet.</p>
      <p className="mt-2 text-slate-700 leading-relaxed">
        Connect your LIMS in{" "}
        {canAccessAdminPanel ? (
          <Link
            href="/dashboard/admin/data-connections"
            className="font-semibold text-[#21336a] underline underline-offset-2 hover:text-slate-900"
          >
            Admin → Data Connections
          </Link>
        ) : (
          <span className="font-semibold">Admin → Data Connections</span>
        )}{" "}
        to start seeing TAT intelligence.
      </p>
    </div>
  );
}
