"use client";

import DashboardProviders from "@/components/dashboard/DashboardProviders";
import AuthGuard from "@/components/AuthGuard";
import { SidebarLayoutProvider } from "@/lib/SidebarLayoutContext";
import RecentVisitsTracker from "@/components/dashboard/RecentVisitsTracker";
import DashboardChrome from "@/components/dashboard/DashboardChrome";
import { usePathname } from "next/navigation";

/** Matches [data-module] selectors in app/globals.css (ENG-131). */
export type DashboardModuleKey =
  | "neutral"
  | "home"
  | "labMetrics"
  | "qualityQc"
  | "qualityManagement"
  | "assetManagement"
  | "aiInsights"
  | "adminSettings";

function detectModule(pathname: string): DashboardModuleKey {
  const p = (pathname || "").replace(/\/$/, "") || "/";

  /** Start hub — emerald active nav + brand-aligned chrome */
  if (p === "/dashboard/home") return "home";

  if (p.startsWith("/dashboard/intelligence")) return "aiInsights";

  if (p.startsWith("/dashboard/console")) return "adminSettings";

  if (
    p.startsWith("/dashboard/admin") ||
    p.startsWith("/dashboard/settings") ||
    p.startsWith("/dashboard/departments")
  ) {
    return "adminSettings";
  }

  if (p === "/dashboard") return "assetManagement";

  const labMetrics = [
    "/dashboard/tat",
    "/dashboard/lab-metrics",
    "/dashboard/tests",
    "/dashboard/numbers",
    "/dashboard/revenue",
    "/dashboard/meta",
    "/dashboard/lab-analytics",
  ];
  if (labMetrics.some((x) => p === x || p.startsWith(x + "/"))) return "labMetrics";

  /** QC workspace — neutral slate chrome (distinct from Samples hub blue). */
  if (p === "/dashboard/qc" || p.startsWith("/dashboard/qc/")) return "qualityQc";

  const qualitySamples = ["/dashboard/samples", "/dashboard/quality-samples"];
  if (qualitySamples.some((x) => p === x || p.startsWith(x + "/"))) return "qualityManagement";

  const asset = [
    "/dashboard/equipment",
    "/dashboard/scan",
    "/dashboard/maintenance",
    "/dashboard/refrigerator",
    "/dashboard/analytics",
    "/dashboard/reports",
    "/dashboard/assets",
  ];
  if (asset.some((x) => p === x || p.startsWith(x + "/"))) return "assetManagement";

  return "labMetrics";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const moduleKey = detectModule(pathname);
  return (
    <AuthGuard>
      <DashboardProviders>
        <SidebarLayoutProvider>
          <RecentVisitsTracker />
          <div className="flex h-screen overflow-hidden bg-slate-50" data-module={moduleKey}>
            <DashboardChrome>{children}</DashboardChrome>
          </div>
        </SidebarLayoutProvider>
      </DashboardProviders>
    </AuthGuard>
  );
}
