"use client";

import { useEffect, useState } from "react";
import { fetchMaintenanceDue, markMaintained } from "@/lib/api";
import { useEquipmentStore } from "@/lib/EquipmentStore";
import type { Equipment } from "@/types";
import { Wrench, AlertTriangle, Clock, CheckCircle2, Check } from "lucide-react";

const SEED_HOSPITAL_ID = "00000000-0000-0000-0000-000000000001";

type Tab = "overdue" | "upcoming" | "in-progress";

type MaintenanceItem = Equipment & {
  last_maintained_at: string | null;
  next_due_at: string | null;
  interval_days: number;
  notes: string | null;
};

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
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overdue");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const { sessionEquipment, refreshKey } = useEquipmentStore();

  const loadMaintenanceDue = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchMaintenanceDue(SEED_HOSPITAL_ID);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setItems([]);
      return;
    }
    const fromApi = (res.data ?? []) as MaintenanceItem[];
    const fromSession = sessionEquipment
      .filter((e) => !fromApi.some((a) => a.id === e.id))
      .map((e) => ({
        ...e,
        next_maintenance_at: e.next_maintenance_at,
        last_maintained_at: null,
        next_due_at: e.next_maintenance_at,
        interval_days: 90,
        notes: null,
      })) as MaintenanceItem[];
    const merged = [...fromApi, ...fromSession].sort((a, b) => {
      const aDue = a.next_due_at ?? a.next_maintenance_at;
      const bDue = b.next_due_at ?? b.next_maintenance_at;
      if (!aDue) return 1;
      if (!bDue) return -1;
      return new Date(aDue).getTime() - new Date(bDue).getTime();
    });
    setItems(merged);
  };

  useEffect(() => {
    loadMaintenanceDue();
  }, [refreshKey, sessionEquipment]);

  useEffect(() => {
    const handler = () => loadMaintenanceDue();
    window.addEventListener("equipment-added", handler);
    return () => window.removeEventListener("equipment-added", handler);
  }, [sessionEquipment]);

  const handleMarkMaintained = async (eq: MaintenanceItem) => {
    setMarkingId(eq.id);
    const res = await markMaintained({
      equipment_id: eq.id,
      facility_id: SEED_HOSPITAL_ID,
    });
    setMarkingId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    loadMaintenanceDue();
  };

  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const getDueDate = (item: MaintenanceItem) =>
    item.next_due_at ?? item.next_maintenance_at;

  const overdue = items.filter(
    (eq) => getDueDate(eq) && new Date(getDueDate(eq)!) < now
  );
  const upcoming = items.filter(
    (eq) =>
      getDueDate(eq) &&
      new Date(getDueDate(eq)!) >= now &&
      new Date(getDueDate(eq)!) <= thirtyDaysFromNow
  );
  const inProgress = items.filter((eq) => eq.status === "maintenance");

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
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayList.map((eq) => {
                  const dueDate = getDueDate(eq);
                  const days = getDaysUntil(dueDate);
                  const isMarking = markingId === eq.id;
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
                        {formatDate(dueDate)}
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
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleMarkMaintained(eq)}
                          disabled={isMarking}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                        >
                          <Check size={14} />
                          {isMarking ? "Saving…" : "Mark maintained"}
                        </button>
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
