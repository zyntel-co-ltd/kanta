"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";

type LabSection = {
  id: string;
  name: string;
  abbreviation: string;
  code: string;
  is_active: boolean;
  sort_order: number;
};

type LabShift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type TatRow = { section_id: string; target_minutes: number };

export default function AdminConfigurationSection({
  facilityId,
  onToast,
}: {
  facilityId: string;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}) {
  const [sub, setSub] = useState<"sections" | "shifts" | "tat">("sections");
  const [sections, setSections] = useState<LabSection[]>([]);
  const [shifts, setShifts] = useState<LabShift[]>([]);
  const [tatDraft, setTatDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingTat, setSavingTat] = useState(false);
  const [newSection, setNewSection] = useState({ name: "", abbreviation: "", code: "" });
  const [newShift, setNewShift] = useState({ name: "", start_time: "07:00", end_time: "15:00" });

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const [sRes, shRes, tRes] = await Promise.all([
        fetch(`/api/admin/config/sections?facility_id=${facilityId}`),
        fetch(`/api/admin/config/shifts?facility_id=${facilityId}`),
        fetch(`/api/admin/config/tat-targets?facility_id=${facilityId}`),
      ]);
      if (sRes.ok) setSections((await sRes.json()) as LabSection[]);
      if (shRes.ok) setShifts((await shRes.json()) as LabShift[]);
      if (tRes.ok) {
        const tJson = (await tRes.json()) as {
          sections: LabSection[];
          targets: { section_id: string | null; target_minutes: number }[];
        };
        const map: Record<string, number> = {};
        for (const sec of tJson.sections ?? []) {
          const row = tJson.targets?.find((x) => x.section_id === sec.id);
          map[sec.id] = row?.target_minutes ?? 60;
        }
        setTatDraft(map);
      }
    } catch {
      onToast("Failed to load configuration", "error");
    } finally {
      setLoading(false);
    }
  }, [facilityId, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchSection = async (id: string, body: Partial<LabSection>) => {
    try {
      const res = await fetch(`/api/admin/config/sections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast("Section updated", "success");
      await load();
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };

  const addSection = async () => {
    const name = newSection.name.trim();
    const abbreviation = newSection.abbreviation.trim();
    const code = newSection.code.trim().toUpperCase().replace(/\s+/g, "_");
    if (!name || !abbreviation || !code) {
      onToast("Fill name, abbreviation, and code", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/config/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: facilityId, name, abbreviation, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast("Section added", "success");
      setNewSection({ name: "", abbreviation: "", code: "" });
      await load();
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };

  const addShift = async () => {
    const name = newShift.name.trim();
    if (!name) {
      onToast("Shift name required", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/config/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facilityId,
          name,
          start_time: newShift.start_time,
          end_time: newShift.end_time,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast("Shift added", "success");
      setNewShift({ name: "", start_time: "07:00", end_time: "15:00" });
      await load();
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };

  const patchShift = async (id: string, body: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/config/shifts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast("Shift updated", "success");
      await load();
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };

  const deleteShift = async (id: string) => {
    if (!confirm("Delete this shift? At least one shift must remain.")) return;
    try {
      const res = await fetch(`/api/admin/config/shifts/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast("Shift deleted", "success");
      await load();
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };

  const saveTatTargets = async () => {
    const activeSections = sections.filter((s) => s.is_active);
    const targets: TatRow[] = activeSections.map((s) => ({
      section_id: s.id,
      target_minutes: Math.max(1, Math.floor(Number(tatDraft[s.id]) || 60)),
    }));
    setSavingTat(true);
    try {
      const res = await fetch("/api/admin/config/tat-targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: facilityId, targets }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast("TAT targets saved", "success");
      await load();
    } catch (e) {
      onToast((e as Error).message, "error");
    } finally {
      setSavingTat(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
        Loading configuration…
      </div>
    );
  }

  const activeSections = sections.filter((s) => s.is_active);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold text-emerald-900 mb-1">Facility configuration</p>
        <p className="text-emerald-900/90">
          Sections, shifts, and TAT targets apply to Lab Metrics (TAT charts and breach logic).{" "}
          <Link href="/dashboard/admin/hospital" className="underline font-medium text-emerald-800">
            Hospital settings
          </Link>{" "}
          (logo, contact) are on a separate page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(
          [
            ["sections", "Lab sections"],
            ["shifts", "Shifts"],
            ["tat", "TAT targets"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSub(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              sub === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "sections" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 font-semibold text-slate-800">
            Lab sections
          </div>
          <div className="p-4 space-y-4">
            <div className="grid sm:grid-cols-4 gap-2 items-end">
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <input
                  value={newSection.name}
                  onChange={(e) => setNewSection((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  placeholder="Haematology"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Abbreviation</label>
                <input
                  value={newSection.abbreviation}
                  onChange={(e) => setNewSection((p) => ({ ...p, abbreviation: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  placeholder="HAEM"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Code (pipeline key)</label>
                <input
                  value={newSection.code}
                  onChange={(e) => setNewSection((p) => ({ ...p, code: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono"
                  placeholder="HAEMATOLOGY"
                />
              </div>
              <button
                type="button"
                onClick={() => void addSection()}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white text-sm font-medium py-2 hover:bg-emerald-700"
              >
                <Plus size={16} /> Add section
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Abbrev</th>
                    <th className="text-left px-3 py-2">Code</th>
                    <th className="text-left px-3 py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="px-3 py-2">
                        <input
                          defaultValue={s.name}
                          key={s.name + s.id}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== s.name) void patchSection(s.id, { name: v });
                          }}
                          className="w-full max-w-[200px] rounded border border-slate-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          defaultValue={s.abbreviation}
                          key={s.abbreviation + s.id}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== s.abbreviation) void patchSection(s.id, { abbreviation: v });
                          }}
                          className="w-24 rounded border border-slate-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.code}</td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.is_active}
                            onChange={(e) => void patchSection(s.id, { is_active: e.target.checked })}
                          />
                          <span className="text-slate-600">{s.is_active ? "Active" : "Inactive"}</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {sub === "shifts" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 font-semibold text-slate-800">
            Shifts
          </div>
          <div className="p-4 space-y-4">
            <div className="grid sm:grid-cols-4 gap-2 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500">Name</label>
                <input
                  value={newShift.name}
                  onChange={(e) => setNewShift((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  placeholder="Morning"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Start</label>
                <input
                  type="time"
                  value={newShift.start_time}
                  onChange={(e) => setNewShift((p) => ({ ...p, start_time: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">End</label>
                <input
                  type="time"
                  value={newShift.end_time}
                  onChange={(e) => setNewShift((p) => ({ ...p, end_time: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="sm:col-span-4">
                <button
                  type="button"
                  onClick={() => void addShift()}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-2 hover:bg-emerald-700"
                >
                  <Plus size={16} /> Add shift
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Start</th>
                    <th className="text-left px-3 py-2">End</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((sh) => (
                    <tr key={sh.id} className="border-b border-slate-50">
                      <td className="px-3 py-2">
                        <input
                          defaultValue={sh.name}
                          key={sh.name + sh.id}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== sh.name) void patchShift(sh.id, { name: v });
                          }}
                          className="rounded border border-slate-200 px-2 py-1 w-40"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          defaultValue={sh.start_time?.slice(0, 5) ?? ""}
                          key={`st-${sh.id}`}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v) void patchShift(sh.id, { start_time: v });
                          }}
                          className="rounded border border-slate-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          defaultValue={sh.end_time?.slice(0, 5) ?? ""}
                          key={`en-${sh.id}`}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v) void patchShift(sh.id, { end_time: v });
                          }}
                          className="rounded border border-slate-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void deleteShift(sh.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          aria-label="Delete shift"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {sub === "tat" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-800">TAT targets (minutes)</span>
            <button
              type="button"
              disabled={savingTat}
              onClick={() => void saveTatTargets()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save size={16} />
              {savingTat ? "Saving…" : "Save all targets"}
            </button>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-3 py-2">Section</th>
                  <th className="text-left px-3 py-2">Target (minutes)</th>
                </tr>
              </thead>
              <tbody>
                {activeSections.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="px-3 py-2">
                      {s.name}{" "}
                      <span className="text-slate-400 text-xs">({s.code})</span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={tatDraft[s.id] ?? 60}
                        onChange={(e) =>
                          setTatDraft((p) => ({
                            ...p,
                            [s.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                          }))
                        }
                        className="w-28 rounded border border-slate-200 px-2 py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activeSections.length === 0 && (
              <p className="text-slate-500 text-sm py-4">Activate at least one lab section first.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
