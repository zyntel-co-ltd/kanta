"use client";

import { EquipmentStoreProvider } from "@/lib/EquipmentStore";
import { DashboardDataProvider } from "@/lib/DashboardDataContext";
export default function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EquipmentStoreProvider>
      <DashboardDataProvider>{children}</DashboardDataProvider>
    </EquipmentStoreProvider>
  );
}
