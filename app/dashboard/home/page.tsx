"use client";

import Link from "next/link";
import clsx from "clsx";
import { useFlag } from "@/lib/featureFlags";
import {
  Timer,
  Binary,
  TableProperties,
  CircleDollarSign,
  ShieldCheck,
  LayoutDashboard,
  QrCode,
  Wrench,
  CalendarClock,
  Thermometer,
  BarChart3,
  ArrowRight,
  FlaskConical,
  Layers,
  Zap,
  ClipboardList,
  TestTubes,
} from "lucide-react";
import RecentlyVisited from "@/components/dashboard/RecentlyVisited";
import QuickActions from "@/components/dashboard/QuickActions";

const HOSPITAL_DISPLAY_NAME =
  process.env.NEXT_PUBLIC_HOSPITAL_NAME?.trim() || "Zyntel Hospital";

/* ─────────────────────────── types ─────────────────────────── */

type IconProps = { size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties };

type SubTab = {
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
};

type AppCard = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<IconProps>;
  ctaLabel: string;
  tabs: SubTab[];
  theme: {
    primary: string;
    soft: string;
    ring: string;
  };
};

/* ─────────────────────────── data — single brand + slate structure ─────────────────────────── */

const apps: AppCard[] = [
  {
    eyebrow: "Lab Intelligence",
    title: "Lab Metrics",
    description:
      "Monitor turnaround times, test volumes, patient numbers, test catalogue and revenue — all in one place.",
    href: "/dashboard/lab-analytics",
    icon: FlaskConical,
    ctaLabel: "View analytics",
    theme: { primary: "#21336a", soft: "#e8ebf4", ring: "#21336a" },
    tabs: [
      { label: "TAT", href: "/dashboard/tat", icon: Timer },
      { label: "Volume", href: "/dashboard/numbers", icon: Binary },
      { label: "Tests & Lab Mgmt", href: "/dashboard/meta", icon: TableProperties },
      { label: "Revenue", href: "/dashboard/revenue", icon: CircleDollarSign },
    ],
  },
  {
    eyebrow: "Clinical Excellence",
    title: "Quality & samples",
    description:
      "QC controls, charts, and qualitative workflows — plus racks, search, and specimen tracking in one workspace.",
    href: "/dashboard/quality-samples",
    icon: ShieldCheck,
    ctaLabel: "Open workspace",
    theme: { primary: "#0284c7", soft: "#e0f2fe", ring: "#0284c7" },
    tabs: [
      { label: "QC", href: "/dashboard/qc", icon: FlaskConical },
      { label: "Samples", href: "/dashboard/samples", icon: TestTubes },
      { label: "Data entry", href: "/dashboard/qc?tab=data", icon: ClipboardList },
    ],
  },
  {
    eyebrow: "Operations",
    title: "Asset Management",
    description:
      "Track every piece of equipment, schedule maintenance, monitor cold-chain temperatures and review fleet analytics.",
    href: "/dashboard/assets",
    icon: Layers,
    ctaLabel: "View assets",
    theme: { primary: "#475569", soft: "#f1f5f9", ring: "#475569" },
    tabs: [
      { label: "Assets Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Scan", href: "/dashboard/scan", icon: QrCode },
      { label: "Equipment", href: "/dashboard/equipment", icon: Wrench },
      { label: "Maintenance", href: "/dashboard/maintenance", icon: CalendarClock },
      { label: "Refrigerator", href: "/dashboard/refrigerator", icon: Thermometer },
      { label: "Analytics & Reports", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
];

/* ─────────────────────────── component ─────────────────────────── */

export default function DashboardHomePage() {
  const showRefrigeratorModule = useFlag("show-refrigerator-module");
  const appsFiltered = apps.map((app) => {
    if (app.title !== "Asset Management") return app;
    return {
      ...app,
      tabs: showRefrigeratorModule
        ? app.tabs
        : app.tabs.filter((t) => !t.href.includes("/dashboard/refrigerator")),
    };
  });

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-10">

      {/* Brand hero — full content width (matches workspace banners e.g. Lab analytics) */}
      <div
        className="w-full rounded-2xl overflow-hidden animate-slide-up stagger-1"
        style={{ background: "linear-gradient(145deg, #042f2e 0%, #065f46 55%, #047857 100%)" }}
      >
        <div className="px-7 py-7 sm:px-8 sm:py-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Zap size={15} className="text-white" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
                Kanta · Operational Intelligence
              </span>
            </div>
            <h1
              className="text-white text-lg sm:text-xl font-extrabold tracking-tight leading-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              Welcome back
            </h1>
            <p className="text-emerald-100/95 mt-2 text-sm sm:text-[0.9375rem] leading-relaxed max-w-2xl">
              Choose a workspace below — data, charts and controls in one focused view.
            </p>
            <p className="text-emerald-200/90 text-xs mt-1.5 font-medium">
              {HOSPITAL_DISPLAY_NAME}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 animate-slide-up stagger-2">
        <RecentlyVisited />
        <QuickActions />
      </div>

      {/* App cards — slate structure + brand icon only (no per-app accent hues) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-slide-up stagger-2">
        {appsFiltered.map((app) => {
          const AppIcon = app.icon;
          return (
            <Link
              key={app.title}
              href={app.href}
              className={clsx("flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2")}
              style={{ ["--card-accent" as string]: app.theme.primary, ["--card-soft" as string]: app.theme.soft, boxShadow: "var(--tw-ring-shadow), var(--tw-shadow)" }}
            >
              <div className="px-6 py-5 flex items-center gap-4 bg-slate-50 border-b border-slate-200">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: app.theme.primary }}>
                  <AppIcon size={20} className="text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{app.eyebrow}</p>
                  <h2 className="text-slate-900 font-semibold text-base leading-tight">{app.title}</h2>
                </div>
              </div>

              <div className="flex flex-col flex-1 p-6 gap-4">
                <p className="text-slate-600 text-sm leading-relaxed">{app.description}</p>

                <div className="flex flex-wrap gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 min-h-[28px]">
                  {app.tabs.map((tab) => (
                    <span
                      key={tab.href + tab.label}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: app.theme.soft, color: app.theme.primary }}
                    >
                      {tab.label}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-sm font-semibold mt-auto pt-2" style={{ color: app.theme.primary }}>
                  {app.ctaLabel}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-150" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="animate-slide-up stagger-4 border-t border-slate-200 pt-5">
        <p className="text-sm text-slate-500">
          Kanta · QR-first asset intelligence for East African laboratories ·{" "}
          <span className="font-semibold text-slate-700">Offline-capable</span>
        </p>
      </div>
    </div>
  );
}
