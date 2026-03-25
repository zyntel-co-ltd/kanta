import { Suspense } from "react";
import TopBar from "@/components/dashboard/TopBar";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardProviders from "@/components/dashboard/DashboardProviders";
import AuthGuard from "@/components/AuthGuard";
import { SidebarLayoutProvider } from "@/lib/SidebarLayoutContext";
import RecentVisitsTracker from "@/components/dashboard/RecentVisitsTracker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
    <DashboardProviders>
    <SidebarLayoutProvider>
      <RecentVisitsTracker />
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F8F9FB" }}>
        {/* Collapsible sidebar */}
        <Suspense
          fallback={
            <aside
              className="relative flex flex-col h-screen flex-shrink-0 w-[260px] overflow-visible"
              style={{ backgroundColor: "#065f46", borderRadius: "0 28px 28px 0" }}
              aria-hidden
            />
          }
        >
          <Sidebar />
        </Suspense>

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarLayoutProvider>
    </DashboardProviders>
    </AuthGuard>
  );
}
