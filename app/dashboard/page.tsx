import KpiCards from "@/components/dashboard/KpiCards";
import AssetValueChart from "@/components/dashboard/AssetValueChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import DailyScanChart from "@/components/dashboard/DailyScanChart";
import EquipmentStatusChart from "@/components/dashboard/EquipmentStatusChart";
import InventoryOverview from "@/components/dashboard/InventoryOverview";
import ScanFeed from "@/components/dashboard/ScanFeed";
import DepartmentsPanel from "@/components/dashboard/DepartmentsPanel";
import ClientOnly from "@/components/dashboard/ClientOnly";

export default function DashboardPage() {
  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Medical Overview.
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time equipment intelligence across your facility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
            <span className="text-base leading-none">+</span>
            New Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards />

      {/* Row 2: Charts */}
      <ClientOnly>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AssetValueChart />
          <CategoryDonut />
          <DailyScanChart />
        </div>
      </ClientOnly>

      {/* Row 3: Status + Inventory + Right panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Equipment status — spans 2 cols on xl */}
        <ClientOnly>
          <div className="lg:col-span-2">
            <EquipmentStatusChart />
          </div>
        </ClientOnly>

        {/* Inventory */}
        <div>
          <InventoryOverview />
        </div>

        {/* Right panel — Scan feed + Departments */}
        <div className="lg:col-span-3 xl:col-span-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
          <ScanFeed />
          <DepartmentsPanel />
        </div>
      </div>
    </div>
  );
}
