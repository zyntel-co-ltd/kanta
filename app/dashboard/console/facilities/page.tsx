"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Terminal, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type HospitalRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  tier: string | null;
  created_at: string | null;
};

export default function ConsoleFacilitiesPage() {
  const router = useRouter();
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [rows, setRows] = useState<HospitalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<HospitalRow | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.isSuperAdmin) {
      setBanner({
        kind: "err",
        text: "Access denied — Zyntel Console is for platform super-admins only.",
      });
      const t = setTimeout(() => router.replace("/dashboard/home"), 600);
      return () => clearTimeout(t);
    }
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/console/facilities");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!facilityAuthLoading && facilityAuth?.isSuperAdmin) void load();
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, load]);

  const provision = async () => {
    if (!modal) return;
    const email = form.email.trim().toLowerCase();
    if (!email.includes("@") || form.password.length < 8) {
      setBanner({ kind: "err", text: "Valid email and password (min 8 chars) required" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: modal.id,
          email,
          username: form.name.trim() || email.split("@")[0],
          password: form.password,
          role: "facility_admin",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create user");
      setModal(null);
      setForm({ email: "", name: "", password: "" });
      setBanner({ kind: "ok", text: "Facility admin created" });
      setTimeout(() => setBanner(null), 4000);
    } catch (e) {
      setBanner({ kind: "err", text: (e as Error).message || "Failed" });
    } finally {
      setSaving(false);
    }
  };

  if (facilityAuthLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (!facilityAuth?.isSuperAdmin) {
    return (
      <>
        {banner?.kind === "err" && (
          <div className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-sm text-white z-50 bg-red-600 max-w-sm">
            {banner.text}
          </div>
        )}
        <div className="p-8 text-sm text-slate-500">Redirecting…</div>
      </>
    );
  }

  function fmtDate(iso: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {banner && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-sm text-white z-50 max-w-sm ${
            banner.kind === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <Link
              href="/dashboard/console"
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-2"
            >
              <ArrowLeft size={14} />
              Console
            </Link>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Terminal size={22} className="text-slate-700" />
              Facilities
            </h1>
            <p className="text-sm text-slate-600 mt-1">All hospitals on the platform</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading hospitals…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Hospital name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">City</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Country</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Tier</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Created</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.city ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.country ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.tier ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(r.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setModal(r);
                            setForm({ email: "", name: "", password: "" });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700"
                        >
                          <UserPlus size={14} />
                          Provision user
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Provision facility admin</h3>
            <p className="text-sm text-slate-600">
              Hospital: <strong>{modal.name}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="admin@hospital.org"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Display name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Temporary password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Min 8 characters"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void provision()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
