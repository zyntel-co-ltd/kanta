"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Flag, ScrollText, Shield, Terminal } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type PlatformAdminRow = {
  user_id: string;
  created_at: string | null;
};

export default function ConsoleHomePage() {
  const router = useRouter();
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const [deniedBanner, setDeniedBanner] = useState(false);
  const [showSuperAdmins, setShowSuperAdmins] = useState(false);
  const [platformAdmins, setPlatformAdmins] = useState<PlatformAdminRow[]>([]);
  const [paLoading, setPaLoading] = useState(false);
  const [paError, setPaError] = useState<string | null>(null);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.isSuperAdmin) {
      setDeniedBanner(true);
      const t = setTimeout(() => router.replace("/dashboard/home"), 600);
      return () => clearTimeout(t);
    }
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, router]);

  const loadPlatformAdmins = useCallback(async () => {
    setPaLoading(true);
    setPaError(null);
    try {
      const res = await fetch("/api/console/platform-admins");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to load");
      }
      setPlatformAdmins(Array.isArray(data) ? data : []);
    } catch (e) {
      setPaError((e as Error).message);
      setPlatformAdmins([]);
    } finally {
      setPaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showSuperAdmins && facilityAuth?.isSuperAdmin) void loadPlatformAdmins();
  }, [showSuperAdmins, facilityAuth?.isSuperAdmin, loadPlatformAdmins]);

  if (facilityAuthLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (!facilityAuth?.isSuperAdmin) {
    return (
      <div className="p-8 text-sm text-slate-500">
        {deniedBanner && (
          <div className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-sm text-white z-50 bg-red-600 max-w-sm">
            Access denied — Zyntel Console is for platform super-admins only.
          </div>
        )}
        Redirecting…
      </div>
    );
  }

  function fmtDate(iso: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }

  if (showSuperAdmins) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <button
            type="button"
            onClick={() => setShowSuperAdmins(false)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            Console home
          </button>

          <header className="space-y-2">
            <div className="inline-flex items-center gap-2 text-slate-500 text-sm font-medium">
              <Shield size={18} className="text-slate-700" />
              Super-admins
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Platform administrators
            </h1>
            <p className="text-slate-600 text-sm">
              Read-only list of users in <code className="text-xs bg-slate-100 px-1 rounded">platform_admins</code>.
            </p>
          </header>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-950">
            <p className="font-medium text-amber-900 mb-2">Promoting users to super-admin</p>
            <p className="mb-2">
              To promote a user to super-admin, insert a row into{" "}
              <code className="text-xs bg-amber-100/80 px-1 rounded">platform_admins</code> via the Supabase
              dashboard SQL editor:
            </p>
            <pre className="text-xs bg-white/80 border border-amber-200 rounded-lg p-3 overflow-x-auto font-mono">
              {`INSERT INTO platform_admins (user_id) VALUES ('<uuid>');`}
            </pre>
            <p className="mt-2 text-amber-900/90">
              Super-admin promotion is intentionally not available via the Console UI at pre-seed.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {paLoading ? (
              <div className="p-8 text-sm text-slate-500">Loading…</div>
            ) : paError ? (
              <div className="p-8 text-sm text-red-600">{paError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">user_id</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">created_at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformAdmins.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                          No platform admins found.
                        </td>
                      </tr>
                    ) : (
                      platformAdmins.map((r) => (
                        <tr key={r.user_id} className="border-b border-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-900 break-all">{r.user_id}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtDate(r.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const cards: Array<{
    title: string;
    description: string;
    href?: string;
    onClick?: () => void;
    icon: typeof Building2;
    badge: ReactNode;
  }> = [
    {
      title: "Facilities",
      description: "Browse hospitals and provision access.",
      href: "/dashboard/console/facilities",
      icon: Building2,
      badge: null,
    },
    {
      title: "Super-admins",
      description: "View platform administrators (read-only).",
      onClick: () => setShowSuperAdmins(true),
      icon: Shield,
      badge: null,
    },
    {
      title: "Feature flags",
      description: "Per-facility module toggles in Supabase (plan tier + facility_flags).",
      href: "/dashboard/console/flags",
      icon: Flag,
      badge: null,
    },
    {
      title: "Platform audit log",
      description: "Cross-tenant audit stream.",
      href: "/dashboard/console/audit",
      icon: ScrollText,
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-slate-500 text-sm font-medium">
            <Terminal size={18} className="text-slate-700" />
            Zyntel
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Zyntel Console
          </h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl">
            Platform administration — Zyntel team only
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => {
            const Icon = c.icon;
            const inner = (
              <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors text-left w-full">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Icon size={18} />
                    </span>
                    <h2 className="text-base font-semibold text-slate-900">{c.title}</h2>
                  </div>
                  {c.badge}
                </div>
                <p className="text-sm text-slate-600 flex-1">{c.description}</p>
              </div>
            );

            if (c.href) {
              return (
                <Link
                  key={c.title}
                  href={c.href}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-2xl"
                >
                  {inner}
                </Link>
              );
            }

            if (c.onClick) {
              return (
                <button
                  key={c.title}
                  type="button"
                  onClick={c.onClick}
                  className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-2xl"
                >
                  {inner}
                </button>
              );
            }

            return (
              <div key={c.title} className="opacity-90">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
