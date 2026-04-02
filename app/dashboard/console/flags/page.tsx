"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flag, Loader2, RotateCcw, Search, Terminal } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  FLAG_LABELS,
  KANTA_FEATURE_FLAG_NAMES,
  getDefaultEnabledFlagsForTier,
} from "@/lib/featureFlagCatalog";

type HospitalRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  tier: string | null;
};

function tierLabel(t: string | null): string {
  if (!t) return "—";
  if (t === "pro") return "Professional";
  if (t === "starter") return "Starter";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function ConsoleFlagsPage() {
  const router = useRouter();
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const [facilities, setFacilities] = useState<HospitalRow[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [flagsRes, setFlagsRes] = useState<{
    posthogConfigured: boolean;
    tier: string | null;
    flags: Record<string, boolean>;
  } | null>(null);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.isSuperAdmin) {
      const t = setTimeout(() => router.replace("/dashboard/home"), 600);
      return () => clearTimeout(t);
    }
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, router]);

  const loadFacilities = useCallback(async () => {
    setFacilitiesLoading(true);
    try {
      const res = await fetch("/api/console/facilities");
      const data = await res.json().catch(() => []);
      setFacilities(Array.isArray(data) ? data : []);
    } catch {
      setFacilities([]);
    } finally {
      setFacilitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!facilityAuthLoading && facilityAuth?.isSuperAdmin) void loadFacilities();
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, loadFacilities]);

  const loadFlags = useCallback(async (facilityId: string) => {
    setFlagsLoading(true);
    setFlagsRes(null);
    try {
      const res = await fetch(
        `/api/console/flags?facility_id=${encodeURIComponent(facilityId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to load flags");
      }
      setFlagsRes({
        posthogConfigured: !!data.posthogConfigured,
        tier: typeof data.tier === "string" || data.tier === null ? data.tier : null,
        flags: typeof data.flags === "object" && data.flags ? data.flags : {},
      });
    } catch (e) {
      setBanner({ kind: "err", text: (e as Error).message });
      setFlagsRes(null);
    } finally {
      setFlagsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadFlags(selectedId);
  }, [selectedId, loadFlags]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) => {
      const blob = `${f.name} ${f.city ?? ""} ${f.country ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [facilities, query]);

  const selectedHospital = useMemo(
    () => facilities.find((f) => f.id === selectedId) ?? null,
    [facilities, selectedId]
  );

  const toggleFlag = async (flagKey: string, enabled: boolean) => {
    if (!selectedId || !flagsRes?.posthogConfigured) return;
    const prev = flagsRes.flags[flagKey];
    setPendingKey(flagKey);
    setFlagsRes((r) =>
      r
        ? {
            ...r,
            flags: { ...r.flags, [flagKey]: enabled },
          }
        : r
    );
    setBanner(null);
    try {
      const res = await fetch("/api/console/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: selectedId,
          flag_key: flagKey,
          enabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Update failed");
      }
      if (data.flags && typeof data.flags === "object") {
        setFlagsRes((r) =>
          r
            ? {
                ...r,
                flags: { ...r.flags, ...(data.flags as Record<string, boolean>) },
              }
            : r
        );
      }
    } catch (e) {
      setFlagsRes((r) =>
        r
          ? {
              ...r,
              flags: { ...r.flags, [flagKey]: prev ?? false },
            }
          : r
      );
      setBanner({ kind: "err", text: (e as Error).message });
    } finally {
      setPendingKey(null);
    }
  };

  const resetDefaults = async () => {
    if (!selectedId || !flagsRes?.posthogConfigured) return;
    if (
      !window.confirm(
        "Reset all module flags for this facility to tier defaults? This updates PostHog targeting."
      )
    ) {
      return;
    }
    setResetting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/console/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: selectedId,
          reset_defaults: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Reset failed");
      }
      if (data.flags && typeof data.flags === "object") {
        setFlagsRes((r) =>
          r
            ? {
                ...r,
                tier: typeof data.tier === "string" || data.tier === null ? data.tier : r.tier,
                flags: { ...r.flags, ...(data.flags as Record<string, boolean>) },
              }
            : r
        );
      }
      setBanner({ kind: "ok", text: "Flags reset to tier defaults." });
    } catch (e) {
      setBanner({ kind: "err", text: (e as Error).message });
    } finally {
      setResetting(false);
    }
  };

  if (facilityAuthLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (!facilityAuth?.isSuperAdmin) {
    return (
      <div className="p-8 text-sm text-slate-500">
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-sm text-white z-50 bg-red-600 max-w-sm">
          Access denied — Zyntel Console is for platform super-admins only.
        </div>
        Redirecting…
      </div>
    );
  }

  const posthogOff = flagsRes && !flagsRes.posthogConfigured;
  const defaultsPreview = getDefaultEnabledFlagsForTier(flagsRes?.tier ?? selectedHospital?.tier ?? null);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          href="/dashboard/console"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          Console home
        </Link>

        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-slate-500 text-sm font-medium">
            <Terminal size={18} className="text-slate-700" />
            Zyntel Console
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Flag size={28} className="text-slate-800" />
            Feature flags
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl">
            Per-facility PostHog overrides for Kanta modules. Group type{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">branch</code> /{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">facility_id</code>.
          </p>
        </header>

        {banner && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              banner.kind === "ok"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {banner.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(240px,320px)_1fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[min(70vh,560px)]">
              <div className="p-3 border-b border-slate-100">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Facility
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search hospitals…"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {facilitiesLoading ? (
                  <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Loading facilities…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No facilities match.</div>
                ) : (
                  <ul className="space-y-1">
                    {filtered.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(f.id)}
                          className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition-colors ${
                            selectedId === f.id
                              ? "bg-slate-900 text-white"
                              : "hover:bg-slate-100 text-slate-800"
                          }`}
                        >
                          <div className="font-medium truncate">{f.name}</div>
                          <div
                            className={`text-xs truncate ${
                              selectedId === f.id ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {[f.city, f.country].filter(Boolean).join(", ") || "—"} ·{" "}
                            {tierLabel(f.tier)}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[320px]">
            {!selectedId ? (
              <div className="p-8 text-sm text-slate-500">
                Select a facility to view and edit PostHog flag overrides.
              </div>
            ) : flagsLoading || !flagsRes ? (
              <div className="p-8 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Loading flag state…
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {posthogOff && (
                  <div className="p-4 bg-amber-50 border-b border-amber-200 text-sm text-amber-950">
                    <p className="font-medium text-amber-900 mb-1">PostHog API not configured</p>
                    <p>
                      Set{" "}
                      <code className="text-xs bg-amber-100/80 px-1 rounded">
                        POSTHOG_PERSONAL_API_KEY
                      </code>{" "}
                      and{" "}
                      <code className="text-xs bg-amber-100/80 px-1 rounded">
                        POSTHOG_PROJECT_ID
                      </code>{" "}
                      in Vercel environment variables. Toggles are disabled until then.
                    </p>
                  </div>
                )}

                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedHospital?.name ?? "Facility"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Tier: {tierLabel(flagsRes.tier ?? selectedHospital?.tier ?? null)} · Defaults
                      for this tier follow the matrix below.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={posthogOff || resetting}
                    onClick={() => void resetDefaults()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RotateCcw size={16} />
                    )}
                    Reset to defaults
                  </button>
                </div>

                <ul className="divide-y divide-slate-50">
                  {KANTA_FEATURE_FLAG_NAMES.map((key) => {
                    const meta = FLAG_LABELS[key] ?? {
                      label: key,
                      description: "",
                    };
                    const on = !!flagsRes.flags[key];
                    const defaultOn = !!defaultsPreview[key];
                    return (
                      <li
                        key={key}
                        className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900">{meta.label}</span>
                            <code className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {key}
                            </code>
                            {defaultOn && (
                              <span className="text-[10px] uppercase font-semibold text-slate-500">
                                On by default (tier)
                              </span>
                            )}
                          </div>
                          {meta.description ? (
                            <p className="text-sm text-slate-600 mt-1">{meta.description}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {pendingKey === key ? (
                            <Loader2 size={18} className="animate-spin text-slate-400" />
                          ) : null}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            disabled={posthogOff || pendingKey === key}
                            onClick={() => void toggleFlag(key, !on)}
                            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              on ? "bg-emerald-600" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition ${
                                on ? "translate-x-6" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
