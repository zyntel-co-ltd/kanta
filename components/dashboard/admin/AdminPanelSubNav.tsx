"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Cable, LayoutDashboard, Building2, Network, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useFlag } from "@/lib/featureFlags";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
};

/**
 * ENG-160: Facility-scoped Admin Panel sections — Data Connections lives here, not in the System sidebar.
 * ENG-91: Hospital groups — Zyntel platform super-admins only.
 * ENG-185: API Keys visible to super-admins only.
 * ENG-186: Data Bridge consolidates import + live connection; gated by `show-data-bridge` or super-admin.
 */
export default function AdminPanelSubNav() {
  const pathname = (usePathname() || "").replace(/\/$/, "") || "/";
  const { facilityAuth } = useAuth();
  const showDataBridge = useFlag("show-data-bridge");
  const showGroups = !!facilityAuth?.isSuperAdmin;
  const canSeeApiKeys = !!facilityAuth?.isSuperAdmin;
  const canSeeDataBridge = !!facilityAuth?.isSuperAdmin || showDataBridge;

  const links: NavLink[] = [
    { href: "/dashboard/admin", label: "Admin home", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/admin/hospital", label: "Hospital settings", icon: Building2, exact: false },
  ];

  if (showGroups) {
    links.push({
      href: "/dashboard/admin/groups",
      label: "Hospital groups",
      icon: Network,
      exact: false,
    });
  }

  if (canSeeApiKeys) {
    links.push({ href: "/dashboard/admin/api-keys", label: "API keys", icon: KeyRound, exact: false });
  }

  if (canSeeDataBridge) {
    links.push({ href: "/dashboard/admin/data-bridge", label: "Data bridge", icon: Cable, exact: false });
  }

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6"
      aria-label="Admin panel sections"
    >
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon size={16} className="shrink-0 opacity-80" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
