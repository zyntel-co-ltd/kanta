"use client";

import { useEffect, useState } from "react";
import { Save, Building2 } from "lucide-react";
import Link from "next/link";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

export default function SettingsPage() {
  const [capability, setCapability] = useState<{
    has_tat: boolean;
    has_revenue: boolean;
    has_refrigerator_monitoring: boolean;
    has_qc: boolean;
    has_equipment: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch(`/api/capability?facility_id=${DEFAULT_FACILITY_ID}`)
      .then((res) => res.json())
      .then((json) => {
        const d = json.data ?? json;
        setCapability({
          has_tat: d.has_tat ?? true,
          has_revenue: d.has_revenue ?? true,
          has_refrigerator_monitoring: d.has_refrigerator_monitoring ?? false,
          has_qc: d.has_qc ?? false,
          has_equipment: d.has_equipment ?? true,
        });
      })
      .catch(() => setCapability(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!capability) return;
    setSaving(true);
    try {
      const res = await fetch("/api/capability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: DEFAULT_FACILITY_ID,
          ...capability,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setToast({ message: "Settings saved", type: "success" });
    } catch {
      setToast({ message: "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Facility capability and configuration.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Admin Panel →
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 size={20} className="text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">Facility Capability</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Enable or disable modules for this facility.
        </p>

        {capability && (
          <div className="space-y-4">
            {[
              { key: "has_tat", label: "TAT (Turnaround Time)" },
              { key: "has_revenue", label: "Revenue" },
              { key: "has_refrigerator_monitoring", label: "Refrigerator Monitoring" },
              { key: "has_qc", label: "QC (Quality Control)" },
              { key: "has_equipment", label: "Equipment" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <label className="text-sm font-medium text-slate-700">{label}</label>
                <input
                  type="checkbox"
                  checked={(capability as Record<string, boolean>)[key] ?? false}
                  onChange={(e) =>
                    setCapability((p) =>
                      p ? { ...p, [key]: e.target.checked } : p
                    )
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleSave}
            disabled={saving || !capability}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
