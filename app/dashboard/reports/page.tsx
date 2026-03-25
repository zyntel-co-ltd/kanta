"use client";

import { useState } from "react";
import { fetchEquipment, fetchDashboard } from "@/lib/api";
import { useEquipmentStore } from "@/lib/EquipmentStore";
import type { Equipment } from "@/types";
import { FileText, Download, Loader2, CheckCircle2 } from "lucide-react";

import { DEFAULT_HOSPITAL_ID } from "@/lib/constants";

type ReportType = "inventory" | "maintenance" | "scans" | "health";

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

export default function ReportsPage() {
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { sessionEquipment } = useEquipmentStore();

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
          ...equipment.map((e) => [
            e.name,
            e.model ?? "",
            e.serial_number ?? "",
            e.department?.name ?? "",
            e.category ?? "Other",
            e.status,
            e.location ?? "",
            e.qr_code,
          ]),
        ];
        downloadCsv(`equipment-inventory-${now.toISOString().slice(0, 10)}.csv`, rows);
      } else if (selected === "maintenance") {
        const overdue = equipment.filter(
          (e) => e.next_maintenance_at && new Date(e.next_maintenance_at) < now
        );
        const upcoming = equipment.filter(
          (e) =>
            e.next_maintenance_at &&
            new Date(e.next_maintenance_at) >= now
        );
        const rows: string[][] = [
          ["Type", "Equipment", "Department", "Due Date", "Status"],
          ...overdue.map((e) => [
            "Overdue",
            e.name,
            e.department?.name ?? "",
            e.next_maintenance_at ?? "",
            e.status,
          ]),
          ...upcoming.map((e) => [
            "Upcoming",
            e.name,
            e.department?.name ?? "",
            e.next_maintenance_at ?? "",
            e.status,
          ]),
        ];
        downloadCsv(`maintenance-summary-${now.toISOString().slice(0, 10)}.csv`, rows);
      } else if (selected === "scans") {
        const dashboard = dashRes.data;
        const dailyScans = dashboard?.daily_scans ?? [];
        const rows: string[][] = [
          ["Day", "Scans"],
          ...dailyScans.map((d: { day: string; scans: number }) => [d.day, String(d.scans)]),
        ];
        downloadCsv(`scan-activity-${dateFrom}-to-${dateTo}.csv`, rows);
      } else if (selected === "health") {
        const dashboard = dashRes.data;
        const byCategory = dashboard?.equipment_by_category ?? [];
        const statusMonthly = dashboard?.equipment_status_monthly ?? [];
        const rows: string[][] = [
          ["Report Type", "Category/Period", "Value"],
          ...byCategory.map((c: { name: string; value: number }) => ["By Category", c.name, String(c.value)]),
          ...statusMonthly.flatMap((m: { month: string; operational: number; maintenance: number; retired: number }) => [
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Generate and download CSV reports.
        </p>
      </div>

      <div className="space-y-4">
        {reportTemplates.map((t) => (
          <div
            key={t.id}
            className={`bg-white rounded-2xl border shadow-sm p-4 transition-all cursor-pointer ${
              selected === t.id
                ? "border-emerald-500 ring-2 ring-emerald-500/20"
                : "border-slate-100 hover:border-slate-200"
            }`}
            onClick={() => setSelected(t.id)}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{t.label}</p>
                <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>
              </div>
              {selected === t.id && (
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {(selected === "scans") && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Date range</p>
          <div className="flex gap-3 flex-wrap">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </label>
          </div>
        </div>
      )}

      <button
        onClick={generateReport}
        disabled={!selected || generating}
        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-emerald-600 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {generating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        {generating ? "Generating..." : "Download CSV"}
      </button>
    </div>
  );
}
