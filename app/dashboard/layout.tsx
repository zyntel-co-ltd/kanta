import DashboardProviders from "@/components/dashboard/DashboardProviders";
import AuthGuard from "@/components/AuthGuard";
import { SidebarLayoutProvider } from "@/lib/SidebarLayoutContext";
import RecentVisitsTracker from "@/components/dashboard/RecentVisitsTracker";
import DashboardChrome from "@/components/dashboard/DashboardChrome";

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
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <DashboardChrome>{children}</DashboardChrome>
      </div>
    </SidebarLayoutProvider>
    </DashboardProviders>
    </AuthGuard>
  );
}
