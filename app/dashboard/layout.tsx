 "use client";

import DashboardProviders from "@/components/dashboard/DashboardProviders";
import AuthGuard from "@/components/AuthGuard";
import { SidebarLayoutProvider } from "@/lib/SidebarLayoutContext";
import RecentVisitsTracker from "@/components/dashboard/RecentVisitsTracker";
import DashboardChrome from "@/components/dashboard/DashboardChrome";
import { usePathname } from "next/navigation";

type ModuleKey = "labMetrics" | "qualityManagement" | "assetManagement";

function detectModule(pathname: string): ModuleKey {
  const p = (pathname || "").replace(/\/$/, "") || "/";

  const labMetrics = [
    "/dashboard/tat",
    "/dashboard/tests",
    "/dashboard/numbers",
    "/dashboard/revenue",
    "/dashboard/meta",
    "/dashboard/performance",
    "/dashboard/lab-analytics",
  ];
  if (labMetrics.some((x) => p === x || p.startsWith(x + "/"))) return "labMetrics";

  const quality = ["/dashboard/qc", "/dashboard/samples", "/dashboard/quality-samples"];
  if (quality.some((x) => p === x || p.startsWith(x + "/"))) return "qualityManagement";

  const asset = [
    "/dashboard",
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
