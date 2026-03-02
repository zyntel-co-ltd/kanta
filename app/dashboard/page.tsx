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

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex gap-5 items-start max-w-[1600px]">

      {/* ── LEFT / MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Page header */}
        <div className="flex items-end justify-between animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Assets Overview.
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Real-time equipment intelligence across your facility.
            </p>
          </div>
          {/* New Report — disabled with tooltip until feature is ready */}
          <div className="relative group">
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-slate-300 to-slate-400 text-white/70 text-sm font-medium rounded-xl cursor-not-allowed shadow-sm select-none"
            >
              <span className="text-base leading-none">+</span>
              New Report
            </button>
            <div className="absolute right-0 top-full mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
              Coming soon
              <span className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 rotate-45" />
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
  );
}
