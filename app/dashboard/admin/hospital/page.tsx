"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Upload, Save, AlertCircle } from "lucide-react";
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
};

function tierPlanLabel(tier: string | null): string {
  if (!tier) return "—";
  const t = tier.toLowerCase();
  if (t === "pro") return "Professional";
  if (t === "starter") return "Starter";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export default function HospitalSettingsPage() {
  const { facilityAuth, facilityAuthLoading } = useAuth();
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
  });
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
        });
      })
      .catch(() => setToast({ type: "error", message: "Failed to load hospital settings" }))
      .finally(() => setLoading(false));
  }, [facilityId]);

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
        }),
      });
      if (!res.ok) throw new Error("Failed to save hospital settings");
      setToast({ type: "success", message: "Hospital settings saved" });
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
        <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-4 space-y-1">
          <p className="text-sm font-medium text-slate-700">Your plan</p>
          <p className="text-lg font-semibold text-slate-900">{tierPlanLabel(form.tier)}</p>
          <p className="text-xs text-slate-500">
            Subscription tier is set by Zyntel. Contact Zyntel to change your plan.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Hospital Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            placeholder="Enter hospital name"
            disabled={loading}
          />
        </div>

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
          <div className="space-y-2">
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
          <button onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">x</button>
        </div>
      )}
    </div>
  );
}
