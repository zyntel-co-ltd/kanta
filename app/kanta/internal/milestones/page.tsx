"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Save } from "lucide-react";

type Milestone = {
  id: string;
  label: string;
  done: boolean;
  notes: string;
};

const PRESEED_MILESTONES: { id: string; label: string }[] = [
  { id: "m1", label: "Multi-tenant data foundation (facility_id, RLS)" },
  { id: "m2", label: "facility_capability_profile table" },
  { id: "m3", label: "RBAC (facility_users, roles)" },
  { id: "m4", label: "Audit log + triggers" },
  { id: "m5", label: "Equipment categories A/B/C + maintenance schedule" },
  { id: "m6", label: "Offline sync + sync status indicator" },
  { id: "m7", label: "TAT module (test_requests, queue, breaches)" },
  { id: "m8", label: "Revenue module + role gating" },
  { id: "m9", label: "Refrigerator monitoring + telemetry" },
  { id: "m10", label: "QC module (Westgard, L-J, import)" },
];

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("kanta_milestones");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Milestone[];
        const merged = PRESEED_MILESTONES.map((p) => {
          const found = parsed.find((m) => m.id === p.id);
          return found ?? { id: p.id, label: p.label, done: false, notes: "" };
        });
        setMilestones(merged);
        return;
      } catch {
        /* ignore */
      }
    }
    setMilestones(
      PRESEED_MILESTONES.map((p) => ({ id: p.id, label: p.label, done: false, notes: "" }))
    );
  }, []);

  const toggle = (id: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, done: !m.done } : m))
    );
  };

  const updateNotes = (id: string, notes: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, notes } : m))
    );
  };

  const save = () => {
    setSaving(true);
    localStorage.setItem("kanta_milestones", JSON.stringify(milestones));
    setTimeout(() => setSaving(false), 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Pre-seed Milestones (Internal)
        </h1>
        <p className="text-sm text-slate-500 mt-0.5 mb-6">
          Checklist for internal tracking. Not part of the facility-facing product.
        </p>

        <div className="space-y-3">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3"
            >
              <button
                onClick={() => toggle(m.id)}
                className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-emerald-600"
              >
                {m.done ? (
                  <CheckCircle2 size={22} className="text-emerald-500" />
                ) : (
                  <Circle size={22} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    m.done ? "text-slate-500 line-through" : "text-slate-900"
                  }`}
                >
                  {m.label}
                </p>
                <input
                  type="text"
                  placeholder="Notes..."
                  value={m.notes}
                  onChange={(e) => updateNotes(m.id, e.target.value)}
                  className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Saved" : "Save to localStorage"}
        </button>
      </div>
    </div>
  );
}
