"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";
import { queuedFetch } from "@/lib/sync-queue/queuedFetch";

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

type MonthlyTarget = { month: number; year: number; target: number };

export default function AdminConfigurationSection({
  facilityId,
  onToast,
}: {
  facilityId: string;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}) {
  const [sub, setSub] = useState<"sections" | "shifts" | "targets">("sections");
  const [sections, setSections] = useState<LabSection[]>([]);
  const [shifts, setShifts] = useState<LabShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSection, setNewSection] = useState({ name: "", abbreviation: "", code: "" });
  const [newShift, setNewShift] = useState({ name: "", start_time: "07:00", end_time: "15:00" });

  const now = new Date();
  const [revenueTarget, setRevenueTarget] = useState<MonthlyTarget>({ month: now.getMonth() + 1, year: now.getFullYear(), target: 0 });
  const [testsTarget, setTestsTarget] = useState<MonthlyTarget>({ month: now.getMonth() + 1, year: now.getFullYear(), target: 0 });
  const [numbersTarget, setNumbersTarget] = useState<MonthlyTarget>({ month: now.getMonth() + 1, year: now.getFullYear(), target: 0 });
  const [savingTarget, setSavingTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const [sRes, shRes] = await Promise.all([
        fetch(`/api/admin/config/sections?facility_id=${facilityId}`),
        fetch(`/api/admin/config/shifts?facility_id=${facilityId}`),
      ]);
      if (sRes.ok) setSections((await sRes.json()) as LabSection[]);
      if (shRes.ok) setShifts((await shRes.json()) as LabShift[]);
    } catch {
      onToast("Failed to load configuration", "error");
    } finally {
      setLoading(false);
    }
  }, [facilityId, onToast]);

  const fetchTargets = useCallback(async (rev: MonthlyTarget, tests: MonthlyTarget, numbers: MonthlyTarget) => {
    if (!facilityId) return;
    try {
      const [rRes, tRes, nRes] = await Promise.all([
        fetch(`/api/admin/targets/revenue?facility_id=${facilityId}&month=${rev.month}&year=${rev.year}`),
        fetch(`/api/admin/targets/tests?facility_id=${facilityId}&month=${tests.month}&year=${tests.year}`),
        fetch(`/api/admin/targets/numbers?facility_id=${facilityId}&month=${numbers.month}&year=${numbers.year}`),
      ]);
      if (rRes.ok) { const j = await rRes.json(); if (j?.target != null) setRevenueTarget((p) => ({ ...p, target: j.target })); }
      if (tRes.ok) { const j = await tRes.json(); if (j?.target != null) setTestsTarget((p) => ({ ...p, target: j.target })); }
      if (nRes.ok) { const j = await nRes.json(); if (j?.target != null) setNumbersTarget((p) => ({ ...p, target: j.target })); }
    } catch { /* ignore */ }
  }, [facilityId]);

  const saveMonthlyTarget = useCallback(async (type: "revenue" | "tests" | "numbers", payload: MonthlyTarget) => {
    setSavingTarget(type);
    try {
      const res = await fetch(`/api/admin/targets/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: facilityId, ...payload }),
      });
      if (!res.ok) throw new Error("Failed");
      onToast(`${type.charAt(0).toUpperCase() + type.slice(1)} target saved`, "success");
    } catch {
      onToast("Failed to save target", "error");
    } finally {
      setSavingTarget(null);
    }
  }, [facilityId, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sub === "targets") {
      void fetchTargets(revenueTarget, testsTarget, numbersTarget);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, facilityId]);

  const patchSection = async (id: string, body: Partial<LabSection>) => {
    try {
      const res = await queuedFetch(`/api/admin/config/sections/${id}`, {
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
      const res = await queuedFetch("/api/admin/config/sections", {
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
      const res = await queuedFetch("/api/admin/config/shifts", {
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
      const res = await queuedFetch(`/api/admin/config/shifts/${id}`, {
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
      const res = await queuedFetch(`/api/admin/config/shifts/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast("Shift deleted", "success");
      await load();
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };


  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
        Loading configuration…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold text-emerald-900 mb-1">Facility configuration</p>
        <p className="text-emerald-900/90">
          Sections and shifts apply to Lab Metrics tracking.{" "}
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
            ["targets", "Targets"],
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

      {sub === "targets" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-8">
          <h3 className="text-base font-semibold text-slate-800">Monthly Targets</h3>

          {/* Revenue */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Monthly Revenue Target (UGX)</h4>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Month</label>
                <select value={revenueTarget.month} onChange={(e) => setRevenueTarget((p) => ({ ...p, month: parseInt(e.target.value) }))} className="rounded border border-slate-200 px-3 py-2 text-sm">
                  {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Year</label>
                <input type="number" value={revenueTarget.year} onChange={(e) => setRevenueTarget((p) => ({ ...p, year: parseInt(e.target.value) }))} className="rounded border border-slate-200 px-3 py-2 text-sm w-24" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Target (UGX)</label>
                <input type="number" value={revenueTarget.target} onChange={(e) => setRevenueTarget((p) => ({ ...p, target: parseInt(e.target.value) || 0 }))} className="rounded border border-slate-200 px-3 py-2 text-sm w-44" />
              </div>
              <button
                type="button"
                disabled={savingTarget === "revenue"}
                onClick={() => void saveMonthlyTarget("revenue", revenueTarget)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save size={14} />
                {savingTarget === "revenue" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Tests */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Monthly Tests Target</h4>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Month</label>
                <select value={testsTarget.month} onChange={(e) => setTestsTarget((p) => ({ ...p, month: parseInt(e.target.value) }))} className="rounded border border-slate-200 px-3 py-2 text-sm">
                  {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Year</label>
                <input type="number" value={testsTarget.year} onChange={(e) => setTestsTarget((p) => ({ ...p, year: parseInt(e.target.value) }))} className="rounded border border-slate-200 px-3 py-2 text-sm w-24" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Target (Tests)</label>
                <input type="number" value={testsTarget.target} onChange={(e) => setTestsTarget((p) => ({ ...p, target: parseInt(e.target.value) || 0 }))} className="rounded border border-slate-200 px-3 py-2 text-sm w-36" />
              </div>
              <button
                type="button"
                disabled={savingTarget === "tests"}
                onClick={() => void saveMonthlyTarget("tests", testsTarget)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save size={14} />
                {savingTarget === "tests" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Numbers / Requests */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Monthly Numbers Target (Requests)</h4>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Month</label>
                <select value={numbersTarget.month} onChange={(e) => setNumbersTarget((p) => ({ ...p, month: parseInt(e.target.value) }))} className="rounded border border-slate-200 px-3 py-2 text-sm">
                  {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Year</label>
                <input type="number" value={numbersTarget.year} onChange={(e) => setNumbersTarget((p) => ({ ...p, year: parseInt(e.target.value) }))} className="rounded border border-slate-200 px-3 py-2 text-sm w-24" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Target (Requests)</label>
                <input type="number" value={numbersTarget.target} onChange={(e) => setNumbersTarget((p) => ({ ...p, target: parseInt(e.target.value) || 0 }))} className="rounded border border-slate-200 px-3 py-2 text-sm w-36" />
              </div>
              <button
                type="button"
                disabled={savingTarget === "numbers"}
                onClick={() => void saveMonthlyTarget("numbers", numbersTarget)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save size={14} />
                {savingTarget === "numbers" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
