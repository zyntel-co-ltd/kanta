"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Flag, ScrollText, Shield, Terminal } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

function ComingSoonBadge() {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
      Coming soon
    </span>
  );
}

export default function ConsoleHomePage() {
  const router = useRouter();
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const [deniedBanner, setDeniedBanner] = useState(false);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.isSuperAdmin) {
      setDeniedBanner(true);
      const t = setTimeout(() => router.replace("/dashboard/home"), 600);
      return () => clearTimeout(t);
    }
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, router]);

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

  const cards: Array<{
    title: string;
    description: string;
    href?: string;
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
      description: "Manage platform administrators.",
      icon: Shield,
      badge: <ComingSoonBadge />,
    },
    {
      title: "Feature flags",
      description: "PostHog and product flags.",
      icon: Flag,
      badge: <ComingSoonBadge />,
    },
    {
      title: "Platform audit log",
      description: "Cross-tenant audit stream.",
      icon: ScrollText,
      badge: <ComingSoonBadge />,
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
              <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors">
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
                <Link key={c.title} href={c.href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-2xl">
                  {inner}
                </Link>
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
