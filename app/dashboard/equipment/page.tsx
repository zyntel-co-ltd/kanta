"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchEquipment, updateEquipmentStatus } from "@/lib/api";
import { useEquipmentStore } from "@/lib/EquipmentStore";
import type { Equipment } from "@/types";
import type { EquipmentStatus } from "@/types";
import EquipmentStatusSelect from "@/components/dashboard/EquipmentStatusSelect";

import { DEFAULT_HOSPITAL_ID } from "@/lib/constants";

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sessionEquipment, refreshKey, updateSessionEquipment } = useEquipmentStore();

  const handleStatusChange = async (eq: Equipment, newStatus: EquipmentStatus) => {
    if (eq.status === newStatus) return;
    const isSessionOnly = eq.id.startsWith("mock-");
    if (isSessionOnly) {
      updateSessionEquipment(eq.id, { status: newStatus });
      window.dispatchEvent(new CustomEvent("equipment-updated"));
      return;
    }
    const res = await updateEquipmentStatus(eq.id, newStatus);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEquipment((prev) =>
      prev.map((e) => (e.id === eq.id ? { ...e, status: newStatus } : e))
    );
    window.dispatchEvent(new CustomEvent("equipment-updated"));
  };

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchEquipment(DEFAULT_HOSPITAL_ID);
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
  }, [sessionEquipment]);

  useEffect(() => {
    void loadEquipment();
  }, [refreshKey, loadEquipment]);

  useEffect(() => {
    const handler = () => void loadEquipment();
    window.addEventListener("equipment-added", handler);
    return () => window.removeEventListener("equipment-added", handler);
  }, [loadEquipment]);

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
                      <EquipmentStatusSelect
                        value={eq.status}
                        onChange={(status) => handleStatusChange(eq, status)}
                      />
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
