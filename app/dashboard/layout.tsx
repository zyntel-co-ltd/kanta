import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import TickerBar from "@/components/dashboard/TickerBar";
import FloatingActionButton from "@/components/dashboard/FloatingActionButton";
import DashboardProviders from "@/components/dashboard/DashboardProviders";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-indigo-50/40 via-white to-slate-50">
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
    </DashboardProviders>
  );
}
