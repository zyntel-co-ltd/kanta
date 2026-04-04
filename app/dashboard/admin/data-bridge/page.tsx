"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Cable, FileUp } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useFlag } from "@/lib/featureFlags";
import { LoadingBars } from "@/components/ui/PageLoader";
import { DataConnectionsSection } from "@/components/dashboard/admin/DataConnectionsSection";
import { DataImportSection } from "@/components/dashboard/admin/DataImportSection";

type BridgeTab = "import" | "connection";

export default function DataBridgePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const showBridge = useFlag("show-data-bridge");
  const allowed = !!facilityAuth?.isSuperAdmin || showBridge;

  const tabParam = searchParams.get("tab");
  const activeTab: BridgeTab = tabParam === "connection" ? "connection" : "import";

  const setTab = (tab: BridgeTab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`/dashboard/admin/data-bridge?${next.toString()}`);
  };

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.canAccessAdminPanel) {
      router.replace("/dashboard/home");
      return;
    }
    if (!allowed) {
      router.replace("/dashboard/admin");
    }
  }, [facilityAuthLoading, facilityAuth, router, allowed]);

  if (facilityAuthLoading || !facilityAuth?.canAccessAdminPanel || !allowed) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingBars />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--module-primary)] mb-2"
        >
          <ArrowLeft size={14} />
          Admin
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Bridge</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Import historical data or connect a live LIMS source. Use only when onboarding or actively maintaining a bridge.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-slate-50 px-5 py-4 text-sm text-slate-800 shadow-sm ring-1 ring-amber-100/80">
        <p className="font-semibold text-amber-950">Before you continue</p>
        <p className="mt-1.5 text-slate-700 leading-relaxed">
          This section is for importing or connecting your existing lab data. If your data is already in Kanta, you
          don&apos;t need anything here.
        </p>
      </div>

      <div className="flex items-center border-b border-slate-200 overflow-x-auto bg-white rounded-t-2xl px-2 -mb-px">
        <button
          type="button"
          onClick={() => setTab("import")}
          className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all inline-flex items-center gap-2 ${
            activeTab === "import"
              ? "border-[var(--module-primary)] text-[var(--module-primary)]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileUp size={14} />
          File import
        </button>
        <button
          type="button"
          onClick={() => setTab("connection")}
          className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all inline-flex items-center gap-2 ${
            activeTab === "connection"
              ? "border-[var(--module-primary)] text-[var(--module-primary)]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Cable size={14} />
          Live connection
        </button>
      </div>

      <div className="bg-slate-50/50 rounded-b-2xl pb-2">
        {activeTab === "import" ? <DataImportSection embedded /> : <DataConnectionsSection embedded />}
      </div>
    </div>
  );
}
