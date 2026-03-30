"use client";

import { Timer } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/AuthContext";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useFlag } from "@/lib/featureFlags";
import { isAdminAccount, isProfessionalOrAbove } from "@/lib/subscriptionTier";
import { useFacilityConfig } from "@/lib/hooks/useFacilityConfig";
import LabMetricsConfigEmpty from "@/components/dashboard/LabMetricsConfigEmpty";
import TatPatientLevelTab from "@/components/tat/TatPatientLevelTab";

export default function TatPatientLevelPage() {
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  const showTatPatientLevel = useFlag("show-tat-patient-level");
  const professional = isProfessionalOrAbove(facilityAuth?.subscriptionTier);
  const adminAccount = isAdminAccount({
    isSuperAdmin: facilityAuth?.isSuperAdmin,
    canAccessAdminPanel: facilityAuth?.canAccessAdminPanel,
    canAccessAdmin: facilityAuth?.canAccessAdmin,
  });
  const unlocked = (professional && showTatPatientLevel) || adminAccount;
  const {
    loading: labConfigLoading,
    sectionFilterOptions,
    resolveSectionLabel,
    hasConfiguredSections,
  } = useFacilityConfig(facilityId);

  if (facilityAuthLoading) {
    return (
      <div className="min-h-[40vh] space-y-4 p-6" aria-busy="true">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!facilityId) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-6">
        <Timer size={32} className="text-slate-300 mb-3" />
        <p className="text-slate-700 font-medium">No facility assigned</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-6 max-w-lg mx-auto">
        <Timer size={32} className="text-slate-300 mb-3" />
        <p className="text-slate-700 font-medium">Patient-level TAT is locked</p>
        <p className="text-sm text-slate-500 mt-1">
          This view is available for Professional facilities.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Tracking</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Live progress table with 60-second status recompute and urgent-first ordering.
        </p>
      </div>

      {!labConfigLoading && !hasConfiguredSections && (
        <LabMetricsConfigEmpty canAccessAdminPanel={!!facilityAuth?.canAccessAdminPanel} />
      )}

      <TatPatientLevelTab
        facilityId={facilityId}
        sectionFilterOptions={sectionFilterOptions}
        resolveSectionLabel={resolveSectionLabel}
      />
    </div>
  );
}
