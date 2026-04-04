"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, KeyRound, Loader2, Plus, Ban } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { LoadingBars } from "@/components/ui/PageLoader";

type KeyRow = {
  id: string;
  key_prefix: string;
  name: string;
  tier: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
};

export default function AdminApiKeysPage() {
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const router = useRouter();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/api-keys?facility_id=${encodeURIComponent(facilityId)}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load keys");
      setKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.canAccessAdminPanel) {
      router.replace("/dashboard/home");
      return;
    }
    load();
  }, [facilityAuthLoading, facilityAuth, router, load]);

  const onCreate = async () => {
    if (!facilityId) return;
    setCreating(true);
    setToast(null);
    setNewKeyPlain(null);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          facility_id: facilityId,
          name: name.trim() || "API key",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create failed");
      if (typeof data.key === "string") setNewKeyPlain(data.key);
      setName("");
      await load();
      setToast({ type: "success", message: data.message || "Key created" });
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: string) => {
    if (!facilityId) return;
    setRevoking(id);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ facility_id: facilityId, revoke: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Revoke failed");
      await load();
      setToast({ type: "success", message: "Key revoked" });
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setRevoking(null);
    }
  };

  if (facilityAuthLoading || !facilityAuth?.canAccessAdminPanel) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingBars />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--module-primary)] mb-2"
        >
          <ArrowLeft size={14} />
          Admin
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <KeyRound size={24} className="text-[var(--module-primary)]" />
          API keys
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Keys for the public HTTP API (<Link href="/api-platform" className="text-[var(--module-primary)] underline-offset-2 hover:underline">documentation</Link>
          ). Use <code className="text-xs bg-slate-100 px-1 rounded">Authorization: Bearer kanta_…</code>.
        </p>
      </div>

      {newKeyPlain && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Copy this secret now — it will not be shown again.</p>
          <code className="mt-2 block break-all text-xs bg-white/80 border border-amber-100 rounded-lg p-3 select-all">
            {newKeyPlain}
          </code>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Create key</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-slate-700">Label (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="e.g. Integration server"
              disabled={loading || creating}
            />
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--module-primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create key
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Existing keys</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Prefix</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Limits</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium w-28" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No keys yet.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3 text-slate-900">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{k.key_prefix}…</td>
                    <td className="px-4 py-3 text-slate-600">{k.tier}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {k.rate_limit_per_minute}/min · {k.rate_limit_per_day}/day
                    </td>
                    <td className="px-4 py-3">
                      {k.is_active ? (
                        <span className="text-emerald-700 text-xs font-medium">Active</span>
                      ) : (
                        <span className="text-slate-500 text-xs">Revoked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {k.is_active ? (
                        <button
                          type="button"
                          onClick={() => onRevoke(k.id)}
                          disabled={revoking === k.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
                        >
                          {revoking === k.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Ban size={12} />
                          )}
                          Revoke
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 max-w-md ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <div className="inline-flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            {toast.message}
          </div>
          <button type="button" onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
