"use client";

import { EquipmentStoreProvider } from "@/lib/EquipmentStore";
import { DashboardDataProvider } from "@/lib/DashboardDataContext";
import { SyncStatusProvider } from "@/lib/SyncStatusContext";

export default function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EquipmentStoreProvider>
      <SyncStatusProvider>
        <DashboardDataProvider>{children}</DashboardDataProvider>
      </SyncStatusProvider>
    </EquipmentStoreProvider>
  );
}
