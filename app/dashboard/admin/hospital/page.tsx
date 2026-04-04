"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Upload, Save, AlertCircle, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { LoadingBars } from "@/components/ui/PageLoader";

type HospitalForm = {
  name: string;
  logo_url: string | null;
  address: string;
  phone: string;
  tier: string | null;
  city: string;
  country: string;
  /** ENG-107 — parent link for sibling list; not editable here */
  parent_hospital_id: string | null;
  /** ENG-91 — read-only; set by Zyntel platform admin */
  group_id: string | null;
  group_name: string | null;
  branch_name: string;
  /** ENG-99 — lab identifiers purged after this many days (read-only; contact Zyntel to change). */
  lab_number_retention_days: number;
};

type SiblingRow = { id: string; name: string; city: string | null; tier: string | null };

function tierPlanLabel(tier: string | null): string {
  if (!tier) return "—";
  const t = tier.toLowerCase();
  if (t === "pro") return "Professional";
  if (t === "starter") return "Starter";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export default function HospitalSettingsPage() {
  const { facilityAuth, facilityAuthLoading, refreshFacilityAuth } = useAuth();
  const router = useRouter();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.canAccessAdminPanel) {
      router.replace("/dashboard/home");
    }
  }, [facilityAuthLoading, facilityAuth, router]);
  const client = useMemo(() => createClient(), []);
  const [form, setForm] = useState<HospitalForm>({
    name: "",
    logo_url: null,
    address: "",
    phone: "",
    tier: null,
    city: "",
    country: "",
    parent_hospital_id: null,
    group_id: null,
    group_name: null,
    branch_name: "",
    lab_number_retention_days: 90,
  });
  const [siblings, setSiblings] = useState<SiblingRow[]>([]);
  const [siblingsLoading, setSiblingsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!facilityId) return;
    setLoading(true);
    fetch(`/api/admin/hospital?facility_id=${facilityId}`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          name: data?.name ?? "",
          logo_url: data?.logo_url ?? null,
          address: data?.address ?? "",
          phone: data?.phone ?? "",
          tier: typeof data?.tier === "string" ? data.tier : null,
          city: typeof data?.city === "string" ? data.city : "",
          country: typeof data?.country === "string" ? data.country : "",
          parent_hospital_id:
            typeof data?.parent_hospital_id === "string" ? data.parent_hospital_id : null,
          group_id: typeof data?.group_id === "string" ? data.group_id : null,
          group_name: typeof data?.group_name === "string" ? data.group_name : null,
          branch_name: typeof data?.branch_name === "string" ? data.branch_name : "",
          lab_number_retention_days:
            typeof data?.lab_number_retention_days === "number" && data.lab_number_retention_days > 0
              ? data.lab_number_retention_days
              : 90,
        });
      })
      .catch(() => setToast({ type: "error", message: "Failed to load hospital settings" }))
      .finally(() => setLoading(false));
  }, [facilityId]);

  useEffect(() => {
    if (!facilityId || loading) return;
    if (!form.parent_hospital_id) {
      setSiblings([]);
      return;
    }
    setSiblingsLoading(true);
    fetch(`/api/admin/hospital/siblings?facility_id=${encodeURIComponent(facilityId)}`)
      .then((res) => res.json())
      .then((data) => {
        setSiblings(Array.isArray(data) ? data : []);
      })
      .catch(() => setSiblings([]))
      .finally(() => setSiblingsLoading(false));
  }, [facilityId, form.parent_hospital_id, loading]);

  if (facilityAuthLoading || !facilityAuth?.canAccessAdminPanel) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingBars />
      </div>
    );
  }

  const onUploadLogo = async (file?: File) => {
    if (!file || !facilityId) return;
    if (!["image/png", "image/svg+xml"].includes(file.type)) {
      setToast({ type: "error", message: "Only PNG or SVG files are allowed" });
      return;
    }
    if (file.size > 1024 * 1024) {
      setToast({ type: "error", message: "Logo must be 1MB or less" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.type === "image/svg+xml" ? "svg" : "png";
      const path = `${facilityId}/logo.${ext}`;
      const { error } = await client.storage.from("facility-logos").upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (error) throw error;
      const { data } = client.storage.from("facility-logos").getPublicUrl(path);
      setForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
      setToast({ type: "success", message: "Logo uploaded" });
    } catch (error) {
      setToast({ type: "error", message: (error as Error).message || "Logo upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!facilityId) return;
    if (!form.name.trim()) {
      setToast({ type: "error", message: "Hospital name is required" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/hospital", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facilityId,
          name: form.name.trim(),
          logo_url: form.logo_url,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          country: form.country.trim() || null,
          ...(form.group_id
            ? { branch_name: form.branch_name.trim() || null }
            : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to save hospital settings");
      setToast({ type: "success", message: "Hospital settings saved" });
      await refreshFacilityAuth();
    } catch (error) {
      setToast({ type: "error", message: (error as Error).message || "Failed to save hospital settings" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your facility identity and contact details.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Branch details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current facility profile. Branch creation is done in Zyntel Console — not from this screen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Facility name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                placeholder="Hospital or branch legal name"
                disabled={loading}
              />
            </div>

            {form.group_id ? (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Branch name</label>
                <p className="text-xs text-slate-500">
                  Group: <span className="font-medium text-slate-700">{form.group_name ?? "—"}</span>
                  {" — "}
                  label shown in the app header next to the facility name.
                </p>
                <input
                  value={form.branch_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, branch_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                  placeholder="e.g. Main Branch, North Clinic"
                  disabled={loading}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">City</label>
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                placeholder="City"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Country</label>
              <input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                placeholder="Country"
                disabled={loading}
              />
            </div>

            <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Plan (tier)</p>
              <p className="text-lg font-semibold text-slate-900">{tierPlanLabel(form.tier)}</p>
              <p className="text-xs text-slate-500 mt-1">
                Subscription tier is set by Zyntel. Contact Zyntel to change your plan.
              </p>
            </div>

            <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lab number retention</p>
              <p className="text-lg font-semibold text-slate-900">{form.lab_number_retention_days} days</p>
              <p className="text-xs text-slate-500 mt-1">
                After this period, sample identifiers and related bridge fields are cleared from stored test rows
                (aggregates are kept). To change this policy, contact Zyntel.
              </p>
            </div>
          </div>

          <div className="flex gap-2 rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950">
            <Info size={18} className="shrink-0 mt-0.5 opacity-80" />
            <p>
              To add a branch, contact your Zyntel administrator. New branches are provisioned from the
              Zyntel Console.
            </p>
          </div>
        </div>

        {form.parent_hospital_id ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Other branches in your group</h2>
            <p className="text-xs text-slate-500">
              Facilities under the same parent hospital link (read-only).
            </p>
            {siblingsLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : siblings.length === 0 ? (
              <p className="text-sm text-slate-500">No other branches listed.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/90 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">City</th>
                      <th className="px-3 py-2 font-medium">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siblings.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-2 text-slate-900">{s.name}</td>
                        <td className="px-3 py-2 text-slate-600">{s.city ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{tierPlanLabel(s.tier)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Logo (PNG/SVG, max 1MB)</label>
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt={form.name || "Hospital logo"} className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                <Building2 size={22} className="text-slate-400" />
              </div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium cursor-pointer hover:bg-slate-200">
              <Upload size={14} />
              {uploading ? "Uploading..." : "Upload logo"}
              <input type="file" accept="image/png,image/svg+xml" className="hidden" onChange={(e) => onUploadLogo(e.target.files?.[0])} disabled={uploading || loading} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Address (optional)</label>
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="Street, city, country"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Phone (optional)</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="+256..."
              disabled={loading}
            />
          </div>
        </div>

        <button onClick={onSave} disabled={saving || loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--module-primary)] text-white text-sm font-medium disabled:opacity-50">
          <Save size={14} />
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          <div className="inline-flex items-center gap-2">
            <AlertCircle size={14} />
            {toast.message}
          </div>
          <button type="button" onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">x</button>
        </div>
      )}
    </div>
  );
}
