import Link from "next/link";
import AssetsSearchBar from "@/components/dashboard/AssetsSearchBar";
import KpiCards from "@/components/dashboard/KpiCards";
import AssetValueChart from "@/components/dashboard/AssetValueChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import DailyScanChart from "@/components/dashboard/DailyScanChart";
import EquipmentStatusChart from "@/components/dashboard/EquipmentStatusChart";
import InventoryOverview from "@/components/dashboard/InventoryOverview";
import ScanFeed from "@/components/dashboard/ScanFeed";
import DepartmentsPanel from "@/components/dashboard/DepartmentsPanel";
import ClientOnly from "@/components/dashboard/ClientOnly";
import RightPanelDrawer from "@/components/dashboard/RightPanelDrawer";
import TickerBar from "@/components/dashboard/TickerBar";
import FloatingActionButton from "@/components/dashboard/FloatingActionButton";

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-0 max-w-[1600px]">

      {/* Live scan feed — Assets tab only */}
      <ClientOnly>
        <div className="-mx-6 -mt-6 mb-5">
          <TickerBar />
        </div>
      </ClientOnly>

      <div className="flex gap-5 items-start">

      {/* ── LEFT / MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* ── Medicare-style hero header ── */}
        <div
          className="rounded-2xl overflow-hidden animate-slide-up"
          style={{ background: "linear-gradient(135deg, #0369a1 0%, #0284c7 45%, #06b6d4 100%)" }}
        >
          <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-sky-100 mb-0.5">
                Asset Management
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight" style={{ letterSpacing: "-0.025em" }}>
                Assets Overview
              </h1>
              <p className="text-xs sm:text-sm text-sky-100/95 mt-0.5">
                Real-time equipment intelligence across your facility.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <AssetsSearchBar variant="light" />
              <Link
                href="/dashboard/reports"
                className="flex items-center gap-2 h-8 px-3 bg-white text-sky-800 text-sm font-semibold rounded-lg transition-all hover:bg-sky-50 shadow-sm"
              >
                <span className="text-base leading-none">+</span>
                New Report
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <ClientOnly>
          <KpiCards />
        </ClientOnly>

        {/* Section divider */}
        <SectionDivider label="Performance" />

        {/* Row 2: 3 charts */}
        <ClientOnly>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up stagger-2">
            <AssetValueChart />
            <CategoryDonut />
            <DailyScanChart />
          </div>
        </ClientOnly>

        {/* Section divider */}
        <SectionDivider label="Fleet Status" />

        {/* Row 3: Equipment Status + Inventory */}
        <ClientOnly>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up stagger-3">
            <div className="md:col-span-2">
              <EquipmentStatusChart />
            </div>
            <InventoryOverview />
          </div>
        </ClientOnly>

      </div>

      {/* ── RIGHT PANEL — sticky, desktop only ── */}
      <div className="hidden xl:flex flex-col gap-4 w-72 2xl:w-80 flex-shrink-0 sticky top-0 animate-slide-up stagger-4">
        <ScanFeed />
        <DepartmentsPanel />
      </div>

      {/* ── RIGHT PANEL — drawer, tablet/mobile ── */}
      <ClientOnly>
        <RightPanelDrawer />
      </ClientOnly>

    </div>

      {/* Add Equipment FAB — Assets tab only */}
      <ClientOnly>
        <FloatingActionButton />
      </ClientOnly>

    </div>
  );
}
