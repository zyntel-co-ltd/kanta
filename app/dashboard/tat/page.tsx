"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { useFacilityConfig } from "@/lib/hooks/useFacilityConfig";
import LabMetricsConfigEmpty from "@/components/dashboard/LabMetricsConfigEmpty";
import LimsTestDataEmpty from "@/components/dashboard/LimsTestDataEmpty";
import { useTestRequestsEmpty } from "@/lib/hooks/useTestRequestsEmpty";
import TatPatientLevelTab from "@/components/tat/TatPatientLevelTab";
import TatTestsLevelTab from "@/components/tat/TatTestsLevelTab";
import TatReceptionTab from "@/components/tat/TatReceptionTab";
import TatScanTab from "@/components/tat/TatScanTab";
import { useFlag } from "@/lib/featureFlags";
import { isAdminAccount, isProfessionalOrAbove } from "@/lib/subscriptionTier";

type TatTab = "patients" | "tests" | "reception" | "scan" | "volume";

const TAT_TABS_BASE: { id: TatTab; label: string }[] = [
  { id: "patients", label: "Patient Tracking" },
  { id: "tests", label: "Test Tracker" },
  { id: "scan", label: "Scan Results" },
  { id: "reception", label: "Section Capture" },
];

export default function TATPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { facilityAuth } = useAuth();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  const {
    loading: labConfigLoading,
    sectionFilterOptions,
    resolveSectionLabel,
    hasConfiguredSections,
  } = useFacilityConfig(facilityId);
  const { loading: testRequestsLoading, empty: testRequestsEmpty } = useTestRequestsEmpty(facilityId);
  const showTatTestLevel = useFlag("show-tat-test-level");
  const showTatPatientLevel = useFlag("show-tat-patient-level");
  const showReceptionTab = useFlag("show-reception-tab");
  const showSampleScan = useFlag("show-sample-scan");
  const professional = isProfessionalOrAbove(facilityAuth?.subscriptionTier);
  const adminAccount = isAdminAccount({
    isSuperAdmin: facilityAuth?.isSuperAdmin,
    canAccessAdminPanel: facilityAuth?.canAccessAdminPanel,
    canAccessAdmin: facilityAuth?.canAccessAdmin,
  });
  const canUsePatientTracking = (professional && showTatPatientLevel) || adminAccount;
  const canUseTestTracking = (professional && showTatTestLevel) || adminAccount;

  const tatTabs = useMemo(
    () => (showReceptionTab ? TAT_TABS_BASE : TAT_TABS_BASE.filter((t) => t.id !== "reception")),
    [showReceptionTab]
  );
  const requested = (searchParams.get("tab") || "patients") as TatTab;
  const activeTab: TatTab = tatTabs.some((t) => t.id === requested) ? requested : "patients";

  const setTab = (tab: TatTab) => {
    if (tab === "volume") {
      router.push("/dashboard/numbers");
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const headerNote = useMemo(() => {
    if (activeTab === "patients") return "Visit-grouped tracking of patient journeys.";
    if (activeTab === "tests") return "Per-test operational tracker with section filters.";
    if (activeTab === "scan") return "Scan a patient barcode or QR code to check test results and TAT status.";
    if (activeTab === "reception") return "Manual section capture when LIMS timestamps are unavailable.";
    return "Switch to Volume dashboard.";
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center border-b border-slate-200 overflow-x-auto bg-white px-6">
        {tatTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              activeTab === t.id
                ? "border-[var(--module-primary)] module-accent-text"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        {(activeTab === "reception" || activeTab === "scan") && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {activeTab === "scan" ? "Scan Results" : "Section Capture"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{headerNote}</p>
          </div>
        )}

        {!labConfigLoading && !hasConfiguredSections && (
          <LabMetricsConfigEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
        )}

        {!labConfigLoading &&
          !testRequestsLoading &&
          hasConfiguredSections &&
          testRequestsEmpty && (
            <LimsTestDataEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
          )}

        {activeTab === "patients" && (
          canUsePatientTracking ? (
            <TatPatientLevelTab
              facilityId={facilityId}
              sectionFilterOptions={sectionFilterOptions}
              resolveSectionLabel={resolveSectionLabel}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Patient Tracking is available for Professional facilities.
            </div>
          )
        )}

        {activeTab === "tests" && (
          <div className="space-y-4">
            {canUseTestTracking ? (
              <TatTestsLevelTab
                facilityId={facilityId}
                sectionFilterOptions={sectionFilterOptions}
                resolveSectionLabel={resolveSectionLabel}
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Test Tracker is available for Professional facilities.
              </div>
            )}
            {canUseTestTracking && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Professional tracker: </span>
                <Link href="/dashboard/lab-metrics/tat/tests" className="font-semibold text-[#21336a] hover:underline">
                  Open section time-in/out board →
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === "scan" && <TatScanTab />}

        {activeTab === "reception" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-slate-600 flex flex-wrap gap-2">
              <Link
                href="/dashboard/lab-metrics/tat/scan"
                className="inline-flex items-center rounded-xl bg-[#21336a] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Open Scan Results
              </Link>
              {showSampleScan && (
                <Link
                  href="/dashboard/scan?scanPurpose=sample"
                  className="inline-flex items-center rounded-xl border border-[#21336a] px-4 py-2 text-sm font-semibold text-[#21336a] hover:bg-slate-50"
                >
                  QR Sample Lookup (Results)
                </Link>
              )}
            </div>
            <TatReceptionTab
              facilityId={facilityId}
              sectionFilterOptions={sectionFilterOptions}
              resolveSectionLabel={resolveSectionLabel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
