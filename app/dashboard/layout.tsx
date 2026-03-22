import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import TickerBar from "@/components/dashboard/TickerBar";
import FloatingActionButton from "@/components/dashboard/FloatingActionButton";
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
    <div className="flex h-screen overflow-hidden" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ffffff 50%, #eff6ff 100%)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Bloomberg-style live ticker */}
        <TickerBar />
        {/* Sticky blurred top bar */}
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <FloatingActionButton />
    </div>
    </SidebarLayoutProvider>
    </DashboardProviders>
    </AuthGuard>
  );
}
