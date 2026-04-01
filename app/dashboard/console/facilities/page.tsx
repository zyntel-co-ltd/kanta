"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Copy, Terminal, UserPlus, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type HospitalRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  tier: string | null;
  created_at: string | null;
};

type SlideMode = "new-hospital" | "branch" | null;

type AdminModalState =
  | null
  | {
      hospital: HospitalRow;
      step: "form" | "success";
      success?: {
        fullName: string;
        email: string;
        password: string;
        hospitalName: string;
      };
    };

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => chars[b % chars.length])
    .join("");
}

function tierLabel(t: string | null): string {
  if (!t) return "—";
  if (t === "pro") return "Professional";
  if (t === "starter") return "Starter";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function ConsoleFacilitiesPage() {
  const router = useRouter();
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [rows, setRows] = useState<HospitalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideOver, setSlideOver] = useState<SlideMode>(null);
  const [parentSearch, setParentSearch] = useState("");
  const [newHospitalForm, setNewHospitalForm] = useState({
    name: "",
    city: "",
    country: "Uganda",
    tier: "free" as "free" | "professional" | "enterprise",
  });
  const [branchForm, setBranchForm] = useState({
    name: "",
    parent_hospital_id: "",
    city: "",
    country: "Uganda",
  });
  const [creatingHospital, setCreatingHospital] = useState(false);
  const [adminModal, setAdminModal] = useState<AdminModalState>(null);
  const [adminForm, setAdminForm] = useState({ full_name: "", email: "", password: "" });
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [copiedBlock, setCopiedBlock] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);
  const [loginUrl, setLoginUrl] = useState("https://kanta.app/login");

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    if (base) {
      setLoginUrl(`${base}/login`);
      return;
    }
    if (typeof window !== "undefined") {
      setLoginUrl(`${window.location.origin}/login`);
    }
  }, []);

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

  const openAdminForHospital = (h: HospitalRow) => {
    setAdminModal({ hospital: h, step: "form" });
    setAdminForm({ full_name: "", email: "", password: generatePassword() });
    setCopiedBlock(false);
    setCopiedPw(false);
  };

  const submitNewHospital = async () => {
    const name = newHospitalForm.name.trim();
    const city = newHospitalForm.city.trim();
    if (!name || !city) {
      setBanner({ kind: "err", text: "Hospital name and city are required." });
      return;
    }
    setCreatingHospital(true);
    try {
      const country = newHospitalForm.country.trim() || "Uganda";
      const tierUi = newHospitalForm.tier;
      const res = await fetch("/api/console/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city,
          country,
          tier: tierUi,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create hospital");
      setSlideOver(null);
      setNewHospitalForm({ name: "", city: "", country: "Uganda", tier: "free" });
      await load();
      const h: HospitalRow = {
        id: data.facility_id,
        name: data.name,
        city,
        country,
        tier: tierUi === "professional" ? "pro" : tierUi === "enterprise" ? "enterprise" : "free",
        created_at: new Date().toISOString(),
      };
      openAdminForHospital(h);
      setBanner({ kind: "ok", text: "Hospital created — add the first facility admin." });
      setTimeout(() => setBanner(null), 5000);
    } catch (e) {
      setBanner({ kind: "err", text: (e as Error).message || "Failed" });
    } finally {
      setCreatingHospital(false);
    }
  };

  const submitBranch = async () => {
    const name = branchForm.name.trim();
    const city = branchForm.city.trim();
    const parent = branchForm.parent_hospital_id.trim();
    if (!name || !city || !parent) {
      setBanner({ kind: "err", text: "Branch name, city, and parent hospital are required." });
      return;
    }
    setCreatingHospital(true);
    try {
      const country = branchForm.country.trim() || "Uganda";
      const res = await fetch("/api/console/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city,
          country,
          tier: "free",
          parent_hospital_id: parent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create branch");
      setSlideOver(null);
      setBranchForm({ name: "", parent_hospital_id: "", city: "", country: "Uganda" });
      setParentSearch("");
      await load();
      const h: HospitalRow = {
        id: data.facility_id,
        name: data.name,
        city,
        country,
        tier: "free",
        created_at: new Date().toISOString(),
      };
      openAdminForHospital(h);
      setBanner({ kind: "ok", text: "Branch created — add the first facility admin." });
      setTimeout(() => setBanner(null), 5000);
    } catch (e) {
      setBanner({ kind: "err", text: (e as Error).message || "Failed" });
    } finally {
      setCreatingHospital(false);
    }
  };

  const submitAdmin = async () => {
    if (!adminModal || adminModal.step !== "form") return;
    const email = adminForm.email.trim().toLowerCase();
    const full_name = adminForm.full_name.trim();
    if (!full_name || !email.includes("@") || adminForm.password.length < 8) {
      setBanner({ kind: "err", text: "Full name, valid email, and password (min 8 chars) required." });
      return;
    }
    setSavingAdmin(true);
    try {
      const res = await fetch("/api/console/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: adminModal.hospital.id,
          email,
          full_name,
          password: adminForm.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create admin");
      setAdminModal({
        hospital: adminModal.hospital,
        step: "success",
        success: {
          fullName: full_name,
          email,
          password: adminForm.password,
          hospitalName: adminModal.hospital.name,
        },
      });
      setCopiedBlock(false);
      setCopiedPw(false);
    } catch (e) {
      setBanner({ kind: "err", text: (e as Error).message || "Failed" });
    } finally {
      setSavingAdmin(false);
    }
  };

  const credentialBlock = adminModal?.success
    ? [
        `Hospital: ${adminModal.success.hospitalName}`,
        `Email: ${adminModal.success.email}`,
        `Temporary password: ${adminModal.success.password}`,
        `Login: ${loginUrl}`,
        "",
        "Change this password in Settings after first login.",
      ].join("\n")
    : "";

  const copyCredentialBlock = async () => {
    if (!credentialBlock) return;
    try {
      await navigator.clipboard.writeText(credentialBlock);
      setCopiedBlock(true);
      setTimeout(() => setCopiedBlock(false), 2500);
    } catch {
      setBanner({ kind: "err", text: "Could not copy to clipboard." });
    }
  };

  const copyPasswordOnly = async () => {
    if (!adminForm.password) return;
    try {
      await navigator.clipboard.writeText(adminForm.password);
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2500);
    } catch {
      setBanner({ kind: "err", text: "Could not copy to clipboard." });
    }
  };

  const filteredParents = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, parentSearch]);

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

      {slideOver && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[105] bg-black/40"
            onClick={() => setSlideOver(null)}
          />
          <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {slideOver === "new-hospital" ? "New hospital" : "Add branch"}
              </h2>
              <button
                type="button"
                onClick={() => setSlideOver(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {slideOver === "new-hospital" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Hospital name *</label>
                    <input
                      type="text"
                      value={newHospitalForm.name}
                      onChange={(e) => setNewHospitalForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="e.g. Nakasero Hospital"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">City *</label>
                    <input
                      type="text"
                      value={newHospitalForm.city}
                      onChange={(e) => setNewHospitalForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Country</label>
                    <input
                      type="text"
                      value={newHospitalForm.country}
                      onChange={(e) => setNewHospitalForm((f) => ({ ...f, country: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tier</label>
                    <select
                      value={newHospitalForm.tier}
                      onChange={(e) =>
                        setNewHospitalForm((f) => ({
                          ...f,
                          tier: e.target.value as "free" | "professional" | "enterprise",
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value="free">Free</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Branch name *</label>
                    <input
                      type="text"
                      value={branchForm.name}
                      onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Parent hospital *
                    </label>
                    <input
                      type="search"
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      placeholder="Search hospitals…"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-2"
                    />
                    <select
                      value={branchForm.parent_hospital_id}
                      onChange={(e) =>
                        setBranchForm((f) => ({ ...f, parent_hospital_id: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white max-h-40"
                      size={Math.min(8, Math.max(3, filteredParents.length))}
                    >
                      <option value="">Select parent…</option>
                      {filteredParents.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">City *</label>
                    <input
                      type="text"
                      value={branchForm.city}
                      onChange={(e) => setBranchForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Country</label>
                    <input
                      type="text"
                      value={branchForm.country}
                      onChange={(e) => setBranchForm((f) => ({ ...f, country: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSlideOver(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingHospital}
                onClick={() =>
                  slideOver === "new-hospital" ? void submitNewHospital() : void submitBranch()
                }
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {creatingHospital ? "Creating…" : slideOver === "new-hospital" ? "Create hospital" : "Create branch"}
              </button>
            </div>
          </div>
        </>
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
          <div className="flex flex-col sm:items-end gap-2">
            <button
              type="button"
              onClick={() => setSlideOver("new-hospital")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700"
            >
              New hospital
            </button>
            <button
              type="button"
              onClick={() => setSlideOver("branch")}
              className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
            >
              Add branch to existing group
            </button>
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
                      <td className="px-4 py-3 text-slate-600">{tierLabel(r.tier)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(r.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openAdminForHospital(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700"
                        >
                          <UserPlus size={14} />
                          Add admin
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

      {adminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {adminModal.step === "form" ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900">Add facility admin</h3>
                <p className="text-sm text-slate-600">
                  Hospital: <strong>{adminModal.hospital.name}</strong>
                </p>
                <p className="text-xs text-slate-500">Role: facility admin (fixed)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Full name *</label>
                    <input
                      type="text"
                      value={adminForm.full_name}
                      onChange={(e) => setAdminForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                    <input
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="admin@hospital.org"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-500">Temporary password</label>
                      <button
                        type="button"
                        onClick={() => copyPasswordOnly()}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                      >
                        {copiedPw ? (
                          <CheckCircle size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                        Copy
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={adminForm.password}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono bg-slate-50"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Shown once — copy before closing.</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdminModal(null)}
                    className="px-4 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingAdmin}
                    onClick={() => void submitAdmin()}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingAdmin ? "Creating…" : "Create admin"}
                  </button>
                </div>
              </>
            ) : adminModal.success ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900">Admin created</h3>
                <p className="text-sm text-slate-700">
                  Send these credentials to{" "}
                  <strong>{adminModal.success.fullName}</strong> at{" "}
                  <strong>{adminModal.success.email}</strong>.
                </p>
                <div className="relative">
                  <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 pr-12 whitespace-pre-wrap font-mono text-slate-800">
                    {credentialBlock}
                  </pre>
                  <button
                    type="button"
                    onClick={() => void copyCredentialBlock()}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50"
                    aria-label="Copy credentials"
                  >
                    {copiedBlock ? (
                      <CheckCircle size={18} className="text-emerald-600" />
                    ) : (
                      <Copy size={18} className="text-slate-600" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminModal(null)}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700"
                >
                  Done
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
