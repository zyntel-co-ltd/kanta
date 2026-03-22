import TopBar from "@/components/dashboard/TopBar";
import AppTabBar from "@/components/dashboard/AppTabBar";
import DashboardProviders from "@/components/dashboard/DashboardProviders";
import AuthGuard from "@/components/AuthGuard";
import { SidebarLayoutProvider } from "@/lib/SidebarLayoutContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
    <DashboardProviders>
    <SidebarLayoutProvider>
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg, #f8fafc 0%, #ffffff 55%, #f1f5f9 100%)" }}
    >
      {/* Sticky top bar */}
      <TopBar />

      {/* Context-aware app tab bar (hidden on home) */}
      <AppTabBar />

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
    </SidebarLayoutProvider>
    </DashboardProviders>
    </AuthGuard>
  );
}
