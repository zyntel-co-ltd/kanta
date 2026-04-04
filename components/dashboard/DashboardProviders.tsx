"use client";

import { EquipmentStoreProvider } from "@/lib/EquipmentStore";
import { DashboardDataProvider } from "@/lib/DashboardDataContext";
import { usePathname } from "next/navigation";
export default function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ENG-169: Settings should not pay the cost of dashboard-home/analytics prefetch.
  // `DashboardDataProvider` triggers multiple API calls and is only needed on pages
  // that render KPI/scan/departments dashboard data (e.g. `/dashboard`, `/dashboard/analytics`).
  const shouldLoadDashboardData =
    pathname === "/dashboard" || pathname?.startsWith("/dashboard/analytics");

  return (
    <EquipmentStoreProvider>
      {shouldLoadDashboardData ? (
        <DashboardDataProvider>{children}</DashboardDataProvider>
      ) : (
        children
      )}
    </EquipmentStoreProvider>
  );
}
