"use client";

import { useEffect, useState } from "react";
import { fetchEquipment } from "@/lib/api";
import { useEquipmentStore } from "@/lib/EquipmentStore";
import type { Equipment } from "@/types";

const SEED_HOSPITAL_ID = "00000000-0000-0000-0000-000000000001";

const statusColors: Record<string, string> = {
  operational: "bg-emerald-100 text-emerald-700",
  maintenance: "bg-amber-100 text-amber-700",
  offline: "bg-red-100 text-red-700",
  retired: "bg-slate-100 text-slate-600",
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Equipment</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          All registered equipment. Add new equipment with the floating button.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-500">
          Loading equipment...
        </div>
      ) : equipment.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-500">No equipment yet.</p>
          <p className="text-sm text-slate-400 mt-1">
            Click the &quot;Add Equipment&quot; button to register your first item.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Serial</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Department</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">QR Code</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq) => (
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
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {eq.serial_number || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {eq.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{eq.category ?? "Other"}</td>
                    <td className="px-4 py-3 text-slate-600">{eq.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          statusColors[eq.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {eq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{eq.qr_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
