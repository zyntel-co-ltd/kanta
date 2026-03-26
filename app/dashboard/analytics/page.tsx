"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDashboardData } from "@/lib/DashboardDataContext";
import { fetchEquipment, fetchDashboard } from "@/lib/api";
import { useEquipmentStore } from "@/lib/EquipmentStore";
import type { Equipment } from "@/types";
import DailyScanChart from "@/components/dashboard/DailyScanChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import EquipmentStatusChart from "@/components/dashboard/EquipmentStatusChart";
import AssetValueChart from "@/components/dashboard/AssetValueChart";
import { BarChart3, ScanLine, Activity, Package, FileText, Download, Loader2, CheckCircle2 } from "lucide-react";
import { DEFAULT_HOSPITAL_ID } from "@/lib/constants";

type ReportType = "inventory" | "maintenance" | "scans" | "health";
type AnalyticsTab = "overview" | "reports";

const reportTemplates: { id: ReportType; label: string; description: string }[] = [
  { id: "inventory", label: "Equipment Inventory", description: "All equipment by department" },
  { id: "maintenance", label: "Maintenance Summary", description: "Upcoming and overdue maintenance" },
  { id: "scans", label: "Scan Activity", description: "Scan counts over time" },
  { id: "health", label: "Fleet Health", description: "Equipment status distribution" },
];

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { dashboard, loading } = useDashboardData();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { sessionEquipment } = useEquipmentStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab: AnalyticsTab = searchParams.get("tab") === "reports" ? "reports" : "overview";

  const setTab = (tab: AnalyticsTab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const dailyScans = dashboard?.daily_scans ?? [];
  const totalScans = dailyScans.reduce((s, d) => s + d.scans, 0);
  const avgScansPerDay = dailyScans.length > 0 ? Math.round(totalScans / dailyScans.length) : 0;
  const statusMonthly = dashboard?.equipment_status_monthly ?? [];
  const latestStatus = statusMonthly.length > 0 ? statusMonthly[statusMonthly.length - 1] : null;
  const totalEquipment = latestStatus ? latestStatus.operational + latestStatus.maintenance + latestStatus.retired : 0;
  const fleetHealth = dashboard?.kpi?.fleet_health_score ?? 0;

  const tabClasses = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${active ? "border-[var(--module-primary)] module-accent-text" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`;

  const generateReport = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const [equipRes, dashRes] = await Promise.all([
        fetchEquipment(DEFAULT_HOSPITAL_ID),
        fetchDashboard(DEFAULT_HOSPITAL_ID),
      ]);
      const fromApi = (equipRes.data ?? []) as Equipment[];
      const apiIds = new Set(fromApi.map((e) => e.id));
      const fromSession = sessionEquipment.filter((e) => !apiIds.has(e.id));
      const equipment = [...fromApi, ...fromSession];
      const now = new Date();

      if (selected === "inventory") {
        const rows: string[][] = [
          ["Name", "Model", "Serial", "Department", "Category", "Status", "Location", "QR Code"],
          ...equipment.map((e) => [e.name, e.model ?? "", e.serial_number ?? "", e.department?.name ?? "", e.category ?? "Other", e.status, e.location ?? "", e.qr_code]),
        ];
        downloadCsv(`equipment-inventory-${now.toISOString().slice(0, 10)}.csv`, rows);
      } else if (selected === "maintenance") {
        const overdue = equipment.filter((e) => e.next_maintenance_at && new Date(e.next_maintenance_at) < now);
        const upcoming = equipment.filter((e) => e.next_maintenance_at && new Date(e.next_maintenance_at) >= now);
        const rows: string[][] = [
          ["Type", "Equipment", "Department", "Due Date", "Status"],
          ...overdue.map((e) => ["Overdue", e.name, e.department?.name ?? "", e.next_maintenance_at ?? "", e.status]),
          ...upcoming.map((e) => ["Upcoming", e.name, e.department?.name ?? "", e.next_maintenance_at ?? "", e.status]),
        ];
        downloadCsv(`maintenance-summary-${now.toISOString().slice(0, 10)}.csv`, rows);
      } else if (selected === "scans") {
        const daily = dashRes.data?.daily_scans ?? [];
        const rows: string[][] = [["Day", "Scans"], ...daily.map((d: { day: string; scans: number }) => [d.day, String(d.scans)])];
        downloadCsv(`scan-activity-${dateFrom}-to-${dateTo}.csv`, rows);
      } else {
        const byCategory = dashRes.data?.equipment_by_category ?? [];
        const monthly = dashRes.data?.equipment_status_monthly ?? [];
        const rows: string[][] = [
          ["Report Type", "Category/Period", "Value"],
          ...byCategory.map((c: { name: string; value: number }) => ["By Category", c.name, String(c.value)]),
          ...monthly.flatMap((m: { month: string; operational: number; maintenance: number; retired: number }) => [
            ["Monthly Status", m.month, `Operational: ${m.operational}`],
            ["Monthly Status", m.month, `Maintenance: ${m.maintenance}`],
            ["Monthly Status", m.month, `Retired: ${m.retired}`],
          ]),
        ];
        downloadCsv(`fleet-health-${now.toISOString().slice(0, 10)}.csv`, rows);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center border-b border-slate-200 overflow-x-auto">
        <button type="button" onClick={() => setTab("overview")} className={tabClasses(activeTab === "overview")}>Overview</button>
        <button type="button" onClick={() => setTab("reports")} className={tabClasses(activeTab === "reports")}>Reports</button>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
              <p className="text-sm text-slate-500 mt-0.5">Trends, performance metrics, and fleet insights.</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p ? "bg-white module-accent-text shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>{p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl module-accent-bg/20 flex items-center justify-center"><ScanLine size={20} className="module-accent-text" /></div><div><p className="text-2xl font-bold text-slate-900">{loading ? "—" : totalScans}</p><p className="text-xs text-slate-500">Total scans ({period})</p></div></div></div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl module-accent-bg/20 flex items-center justify-center"><BarChart3 size={20} className="module-accent-text" /></div><div><p className="text-2xl font-bold text-slate-900">{loading ? "—" : avgScansPerDay}</p><p className="text-xs text-slate-500">Avg scans/day</p></div></div></div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Package size={20} className="text-amber-600" /></div><div><p className="text-2xl font-bold text-slate-900">{loading ? "—" : totalEquipment}</p><p className="text-xs text-slate-500">Total equipment</p></div></div></div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl module-accent-bg/20 flex items-center justify-center"><Activity size={20} className="module-accent-text" /></div><div><p className="text-2xl font-bold text-slate-900">{loading ? "—" : `${fleetHealth}%`}</p><p className="text-xs text-slate-500">Fleet health</p></div></div></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2"><DailyScanChart /></div>
            <AssetValueChart />
            <CategoryDonut />
            <div className="lg:col-span-2"><EquipmentStatusChart /></div>
          </div>
        </>
      ) : (
        <div className="space-y-6 max-w-3xl">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
            <p className="text-sm text-slate-500 mt-0.5">Generate and download CSV reports.</p>
          </div>
          <div className="space-y-4">
            {reportTemplates.map((t) => (
              <div key={t.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all cursor-pointer ${selected === t.id ? "border-[var(--module-primary)] ring-2 ring-[var(--module-primary)]/20" : "border-slate-100 hover:border-slate-200"}`} onClick={() => setSelected(t.id)}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl module-accent-bg/20 flex items-center justify-center flex-shrink-0"><FileText size={20} className="module-accent-text" /></div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-slate-800">{t.label}</p><p className="text-sm text-slate-500 mt-0.5">{t.description}</p></div>
                  {selected === t.id && <CheckCircle2 size={20} className="module-accent-text flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
          {selected === "scans" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Date range</p>
              <div className="flex gap-3 flex-wrap">
                <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">From</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>
                <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">To</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>
              </div>
            </div>
          )}
          <button onClick={generateReport} disabled={!selected || generating} className="flex items-center gap-2 px-5 py-3 module-accent-bg text-white font-medium rounded-xl shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {generating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {generating ? "Generating..." : "Download CSV"}
          </button>
        </div>
      )}
    </div>
  );
}
