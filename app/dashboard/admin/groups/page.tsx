"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { LoadingBars } from "@/components/ui/PageLoader";

type GroupRow = { id: string; name: string; slug: string; created_at: string };
type HospitalRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  tier: string | null;
  group_id: string | null;
  branch_name: string | null;
};

export default function AdminHospitalGroupsPage() {
  const router = useRouter();
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [pendingHospital, setPendingHospital] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.isSuperAdmin) {
      const t = setTimeout(() => router.replace("/dashboard/admin"), 400);
      return () => clearTimeout(t);
    }
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/groups");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setGroups(Array.isArray(data.groups) ? data.groups : []);
      setHospitals(Array.isArray(data.hospitals) ? data.hospitals : []);
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
      setGroups([]);
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!facilityAuthLoading && facilityAuth?.isSuperAdmin) void load();
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, load]);

  const createGroup = async () => {
    const name = newName.trim();
    if (!name) return;
    setSavingGroup(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create group");
      setNewName("");
      setToast({ type: "success", message: "Group created" });
      await load();
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setSavingGroup(false);
    }
  };

  const deleteGroup = async (id: string) => {
    if (!window.confirm("Delete this group? Hospitals in the group will be unassigned.")) return;
    setToast(null);
    try {
      const res = await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete");
      setToast({ type: "success", message: "Group removed" });
      await load();
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    }
  };

  const assignBranch = async (
    hospitalId: string,
    groupId: string | null,
    branchName: string | null
  ) => {
    setPendingHospital(hospitalId);
    setToast(null);
    try {
      const res = await fetch("/api/admin/hospitals/branch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_id: hospitalId,
          group_id: groupId,
          branch_name: branchName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setToast({ type: "success", message: "Assignment updated" });
      await load();
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setPendingHospital(null);
    }
  };

  if (facilityAuthLoading || !facilityAuth?.isSuperAdmin) {
    if (!facilityAuthLoading && !facilityAuth?.isSuperAdmin) {
      return (
        <div className="p-8 text-sm text-slate-500">
          Hospital groups are available to Zyntel platform admins only. Redirecting…
        </div>
      );
    }
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingBars />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="text-slate-700" size={26} />
          Hospital groups
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Create groups and assign facilities as branches. PostHog flags remain per{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">facility_id</code> (branch).
        </p>
      </div>

      {toast && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">New group</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Nakasero Hospital Group"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void createGroup()}
            disabled={savingGroup || !newName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {savingGroup ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add group
          </button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-800">Groups</h2>
        </div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading…
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">No groups yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {groups.map((g) => (
              <li
                key={g.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-900">{g.name}</span>
                  <code className="ml-2 text-xs text-slate-500">{g.slug}</code>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteGroup(g.id)}
                  className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 text-xs font-medium"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-800">Hospitals & branches</h2>
          <p className="text-xs text-slate-500 mt-1">
            Assign each facility to a group and set a branch label (shown in the app header).
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-2 font-medium">Hospital</th>
                  <th className="px-4 py-2 font-medium">Group</th>
                  <th className="px-4 py-2 font-medium">Branch name</th>
                  <th className="px-4 py-2 font-medium w-[100px]" />
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h) => (
                  <HospitalAssignRow
                    key={h.id}
                    h={h}
                    groups={groups}
                    busy={pendingHospital === h.id}
                    onSave={(gid, branch) => void assignBranch(h.id, gid, branch)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function HospitalAssignRow({
  h,
  groups,
  busy,
  onSave,
}: {
  h: HospitalRow;
  groups: GroupRow[];
  busy: boolean;
  onSave: (groupId: string | null, branchName: string | null) => void;
}) {
  const [groupId, setGroupId] = useState<string>(h.group_id ?? "");
  const [branch, setBranch] = useState(h.branch_name ?? "");

  useEffect(() => {
    setGroupId(h.group_id ?? "");
    setBranch(h.branch_name ?? "");
  }, [h.group_id, h.branch_name]);

  const selGid = groupId || null;
  const branchVal = branch.trim() || null;
  const unchanged =
    selGid === h.group_id &&
    branchVal === (h.branch_name?.trim() || null);
  const needsBranch = !!selGid && !branchVal;

  return (
    <tr className="border-b border-slate-50 align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{h.name}</div>
        <div className="text-xs text-slate-500">
          {[h.city, h.country].filter(Boolean).join(", ") || "—"}
        </div>
      </td>
      <td className="px-4 py-3">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="w-full max-w-[220px] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          disabled={busy}
        >
          <option value="">— Standalone —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder={selGid ? "e.g. Main Branch" : "—"}
          disabled={!selGid || busy}
          className="w-full max-w-[220px] rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50"
        />
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={busy || needsBranch || unchanged}
          onClick={() => onSave(selGid, selGid ? branchVal : null)}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-40"
        >
          {busy ? "…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
