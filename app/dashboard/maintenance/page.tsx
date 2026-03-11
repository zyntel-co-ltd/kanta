"use client";

import { useEffect, useState } from "react";
import { fetchEquipment } from "@/lib/api";
import { useEquipmentStore } from "@/lib/EquipmentStore";
import type { Equipment } from "@/types";
import { Wrench, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

const SEED_HOSPITAL_ID = "00000000-0000-0000-0000-000000000001";

type Tab = "overdue" | "upcoming" | "in-progress";

const statusColors: Record<string, string> = {
  operational: "bg-emerald-100 text-emerald-700",
  maintenance: "bg-amber-100 text-amber-700",
  offline: "bg-red-100 text-red-700",
  retired: "bg-slate-100 text-slate-600",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getDaysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MaintenancePage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overdue");
  const { sessionEquipment, refreshKey } = useEquipmentStore();

  const loadEquipment = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchEquipment(SEED_HOSPITAL_ID);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setEquipment([]);
      return;
    }
    const fromApi = res.data ?? [];
    const apiIds = new Set(fromApi.map((e: Equipment) => e.id));
    const fromSession = sessionEquipment.filter((e) => !apiIds.has(e.id));
    setEquipment([...fromApi, ...fromSession].sort((a, b) => a.name.localeCompare(b.name)));
  };

  useEffect(() => {
    loadEquipment();
  }, [refreshKey, sessionEquipment]);

  useEffect(() => {
    const handler = () => loadEquipment();
    window.addEventListener("equipment-added", handler);
    return () => window.removeEventListener("equipment-added", handler);
  }, [sessionEquipment]);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const overdue = equipment.filter(
    (eq) => eq.next_maintenance_at && new Date(eq.next_maintenance_at) < now
  );
  const upcoming = equipment.filter(
    (eq) =>
      eq.next_maintenance_at &&
      new Date(eq.next_maintenance_at) >= now &&
      new Date(eq.next_maintenance_at) <= thirtyDaysFromNow
  );
  const inProgress = equipment.filter((eq) => eq.status === "maintenance");

  const tabConfig: { id: Tab; label: string; count: number; icon: typeof Wrench }[] = [
    { id: "overdue", label: "Overdue", count: overdue.length, icon: AlertTriangle },
    { id: "upcoming", label: "Upcoming", count: upcoming.length, icon: Clock },
    { id: "in-progress", label: "In Progress", count: inProgress.length, icon: Wrench },
  ];

  const getDisplayList = () => {
    if (tab === "overdue") return overdue;
    if (tab === "upcoming") return upcoming;
    return inProgress;
  };

  const displayList = getDisplayList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track scheduled maintenance and equipment in repair.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabConfig.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={16} />
            {label}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tab === id ? "bg-white/20" : "bg-slate-100 text-slate-600"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-500">
          Loading...
        </div>
      ) : displayList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">No items in this category</p>
          <p className="text-sm text-slate-400 mt-1">
            {tab === "overdue"
              ? "No overdue maintenance."
              : tab === "upcoming"
              ? "No upcoming maintenance in the next 30 days."
              : "No equipment currently in maintenance."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Equipment</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Department</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Due Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Days</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayList.map((eq) => {
                  const days = getDaysUntil(eq.next_maintenance_at);
                  return (
                    <tr
                      key={eq.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{eq.name}</span>
                        {eq.model && (
                          <span className="block text-xs text-slate-500">{eq.model}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {eq.department?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(eq.next_maintenance_at)}
                      </td>
                      <td className="px-4 py-3">
                        {days !== null ? (
                          days < 0 ? (
                            <span className="text-red-600 font-semibold">{Math.abs(days)} overdue</span>
                          ) : days === 0 ? (
                            <span className="text-amber-600 font-semibold">Today</span>
                          ) : (
                            <span className="text-slate-600">in {days} days</span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            statusColors[eq.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {eq.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
