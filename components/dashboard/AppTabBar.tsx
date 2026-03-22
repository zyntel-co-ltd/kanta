"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import clsx from "clsx";
import {
  Clock,
  Beaker,
  Hash,
  Database,
  DollarSign,
  ShieldCheck,
  Activity,
  BarChart3,
  FlaskConical,
  LayoutDashboard,
  ScanSearch,
  ScanLine,
  Wrench,
  Thermometer,
  FileText,
  Layers,
  Home,
  ArrowLeft,
} from "lucide-react";

type Tab = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  matchPrefixes?: string[];
};

type AppConfig = {
  name: string;
  gradient: string;
  activeClass: string;
  iconBg: string;
  AppIcon: ComponentType<{ size?: number; className?: string }>;
  tabs: Tab[];
};

/* ─── App definitions ─── */

const LAB_METRICS: AppConfig = {
  name: "Lab Metrics",
  gradient: "from-indigo-500 to-violet-600",
  activeClass: "bg-indigo-600 text-white shadow-sm shadow-indigo-300",
  iconBg: "bg-indigo-100 text-indigo-600",
  AppIcon: FlaskConical,
  tabs: [
    { label: "TAT",     href: "/dashboard/tat",     icon: Clock,      matchPrefixes: ["/dashboard/tat"] },
    { label: "Tests",   href: "/dashboard/tests",   icon: Beaker,     matchPrefixes: ["/dashboard/tests"] },
    { label: "Numbers", href: "/dashboard/numbers", icon: Hash,       matchPrefixes: ["/dashboard/numbers"] },
    { label: "Meta",    href: "/dashboard/meta",    icon: Database,   matchPrefixes: ["/dashboard/meta"] },
    { label: "Revenue", href: "/dashboard/revenue", icon: DollarSign, matchPrefixes: ["/dashboard/revenue"] },
  ],
};

const QUALITY_MGMT: AppConfig = {
  name: "Quality Management",
  gradient: "from-emerald-500 to-teal-600",
  activeClass: "bg-emerald-600 text-white shadow-sm shadow-emerald-300",
  iconBg: "bg-emerald-100 text-emerald-600",
  AppIcon: ShieldCheck,
  tabs: [
    { label: "QC Overview",    href: "/dashboard/qc", icon: ShieldCheck,  matchPrefixes: ["/dashboard/qc"] },
    { label: "L-J Charts",     href: "/dashboard/qc", icon: Activity,     matchPrefixes: [] },
    { label: "Westgard Rules", href: "/dashboard/qc", icon: BarChart3,    matchPrefixes: [] },
    { label: "Qualitative QC", href: "/dashboard/qc", icon: FlaskConical, matchPrefixes: [] },
  ],
};

const ASSET_MGMT: AppConfig = {
  name: "Asset Management",
  gradient: "from-amber-500 to-orange-600",
  activeClass: "bg-amber-500 text-white shadow-sm shadow-amber-300",
  iconBg: "bg-amber-100 text-amber-600",
  AppIcon: Layers,
  tabs: [
    { label: "Overview",   href: "/dashboard",              icon: LayoutDashboard, matchPrefixes: ["/dashboard$"] },
    { label: "Scan",       href: "/dashboard/scan",         icon: ScanSearch,      matchPrefixes: ["/dashboard/scan"] },
    { label: "Equipment",  href: "/dashboard/equipment",    icon: ScanLine,        matchPrefixes: ["/dashboard/equipment"] },
    { label: "Maintenance",href: "/dashboard/maintenance",  icon: Wrench,          matchPrefixes: ["/dashboard/maintenance"] },
    { label: "Refrigerator",href:"/dashboard/refrigerator", icon: Thermometer,     matchPrefixes: ["/dashboard/refrigerator"] },
    { label: "Analytics",  href: "/dashboard/analytics",   icon: BarChart3,       matchPrefixes: ["/dashboard/analytics"] },
    { label: "Reports",    href: "/dashboard/reports",      icon: FileText,        matchPrefixes: ["/dashboard/reports"] },
  ],
};

/* ─── Path → App resolver ─── */

function resolveApp(pathname: string): AppConfig | null {
  const labPrefixes = ["/dashboard/tat", "/dashboard/tests", "/dashboard/numbers", "/dashboard/meta", "/dashboard/revenue"];
  const qcPrefixes  = ["/dashboard/qc"];
  const assetPrefixes = [
    "/dashboard/scan",
    "/dashboard/equipment",
    "/dashboard/maintenance",
    "/dashboard/refrigerator",
    "/dashboard/analytics",
    "/dashboard/reports",
  ];

  if (labPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) return LAB_METRICS;
  if (qcPrefixes.some((p)  => pathname === p || pathname.startsWith(p + "/"))) return QUALITY_MGMT;
  if (assetPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) return ASSET_MGMT;
  if (pathname === "/dashboard") return ASSET_MGMT;

  return null;
}

function isTabActive(pathname: string, tab: Tab): boolean {
  if (!tab.matchPrefixes || tab.matchPrefixes.length === 0) return false;
  return tab.matchPrefixes.some((prefix) => {
    if (prefix === "/dashboard$") return pathname === "/dashboard";
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

/* ─── Component ─── */

export default function AppTabBar() {
  const pathname = usePathname();

  // Don't show on homepage or other system pages
  if (
    pathname === "/dashboard/home" ||
    pathname.startsWith("/dashboard/admin") ||
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/departments") ||
    pathname.startsWith("/dashboard/reception") ||
    pathname.startsWith("/dashboard/tracker") ||
    pathname.startsWith("/dashboard/progress") ||
    pathname.startsWith("/dashboard/performance") ||
    pathname.startsWith("/dashboard/lrids")
  ) {
    return null;
  }

  const app = resolveApp(pathname);
  if (!app) return null;

  const { AppIcon } = app;

  return (
    <div className="flex-shrink-0 border-b border-slate-200/70 bg-white/70 backdrop-blur-sm px-6 py-0">
      <div className="flex items-center gap-4">

        {/* Back to home */}
        <Link
          href="/dashboard/home"
          className="flex items-center gap-1.5 py-3 pr-4 border-r border-slate-200 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
          style={{ fontSize: "0.75rem", fontWeight: 500 }}
        >
          <Home size={13} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {/* App badge */}
        <div className="flex items-center gap-2 py-3 pr-4 border-r border-slate-200 flex-shrink-0">
          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${app.gradient} flex items-center justify-center`}>
            <AppIcon size={12} className="text-white" />
          </div>
          <span
            className="hidden md:block font-semibold text-slate-700"
            style={{ fontSize: "0.8125rem", letterSpacing: "-0.01em" }}
          >
            {app.name}
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none py-2">
          {app.tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(pathname, tab);
            return (
              <Link
                key={tab.label + tab.href}
                href={tab.href}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex-shrink-0",
                  active
                    ? app.activeClass
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                )}
                style={{ fontSize: "0.8125rem", fontWeight: active ? 600 : 500 }}
              >
                <Icon size={13} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
