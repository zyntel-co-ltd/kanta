import Link from "next/link";
import clsx from "clsx";
import {
  Timer,
  Microscope,
  Binary,
  TableProperties,
  CircleDollarSign,
  ChartSpline,
  ShieldCheck,
  LayoutDashboard,
  ScanSearch,
  ScanLine,
  Wrench,
  Thermometer,
  BarChart3,
  ArrowRight,
  FlaskConical,
  Layers,
  Zap,
  Package,
  ClipboardList,
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
  accent: string;
  accentBg: string;
  pillBg: string;
  pillText: string;
  iconGradient: string;
  /** Distinct gradient for card header — different per workspace */
  cardGradient: string;
  /** Action-oriented CTA label (replaces generic "Open") */
  ctaLabel: string;
  tabs: SubTab[];
};

/* ─────────────────────────── data ─────────────────────────── */

const apps: AppCard[] = [
  {
    eyebrow: "Lab Intelligence",
    title: "Lab Metrics",
    description:
      "Monitor turnaround times, test volumes, patient numbers, test catalogue and revenue — all in one place.",
    href: "/dashboard/tat",
    icon: FlaskConical,
    accent: "border-emerald-400",
    accentBg: "bg-emerald-50",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
    iconGradient: "from-emerald-500 to-emerald-700",
    cardGradient: "linear-gradient(135deg, #042f2e 0%, #065f46 50%, #047857 100%)",
    ctaLabel: "View metrics",
    tabs: [
      { label: "TAT", href: "/dashboard/tat", icon: Timer },
      { label: "Tests", href: "/dashboard/tests", icon: Microscope },
      { label: "Numbers", href: "/dashboard/numbers", icon: Binary },
      { label: "Meta", href: "/dashboard/meta", icon: TableProperties },
      { label: "Revenue", href: "/dashboard/revenue", icon: CircleDollarSign },
      { label: "Performance", href: "/dashboard/performance", icon: ChartSpline },
    ],
  },
  {
    eyebrow: "Clinical Excellence",
    title: "Quality & samples",
    description:
      "QC controls, charts, and qualitative workflows — plus racks, search, and specimen tracking in one workspace.",
    href: "/dashboard/quality-samples",
    icon: ShieldCheck,
    accent: "border-indigo-400",
    accentBg: "bg-indigo-50",
    pillBg: "bg-indigo-50",
    pillText: "text-indigo-700",
    iconGradient: "from-indigo-500 to-indigo-700",
    cardGradient: "linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #6366f1 100%)",
    ctaLabel: "Open workspace",
    tabs: [
      { label: "QC", href: "/dashboard/qc", icon: ShieldCheck },
      { label: "Samples", href: "/dashboard/samples", icon: Package },
      { label: "Data entry", href: "/dashboard/qc?tab=data", icon: ClipboardList },
    ],
  },
  {
    eyebrow: "Operations",
    title: "Asset Management",
    description:
      "Track every piece of equipment, schedule maintenance, monitor cold-chain temperatures and review fleet analytics.",
    href: "/dashboard",
    icon: Layers,
    accent: "border-teal-400",
    accentBg: "bg-teal-50",
    pillBg: "bg-teal-50",
    pillText: "text-teal-700",
    iconGradient: "from-teal-500 to-teal-700",
    cardGradient: "linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)",
    ctaLabel: "View assets",
    tabs: [
      { label: "Assets Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Scan", href: "/dashboard/scan", icon: ScanSearch },
      { label: "Equipment", href: "/dashboard/equipment", icon: ScanLine },
      { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
      { label: "Refrigerator", href: "/dashboard/refrigerator", icon: Thermometer },
      { label: "Analytics & Reports", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
];

/* ─────────────────────────── component ─────────────────────────── */

export default function DashboardHomePage() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-10">

      {/* ── Login-page emerald hero banner ── */}
      <div
        className="rounded-2xl overflow-hidden animate-slide-up stagger-1"
        style={{ background: "linear-gradient(145deg, #042f2e 0%, #065f46 55%, #047857 100%)" }}
      >
        <div className="px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap size={17} className="text-white" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200">
                Kanta · Operational Intelligence
              </span>
            </div>
            <h1
              className="text-white"
              style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 }}
            >
              Welcome back
            </h1>
            <p className="text-emerald-100 mt-1.5" style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Choose a workspace below — data, charts and controls in one focused view.
            </p>
            <p className="text-emerald-200/90 text-sm mt-2 font-medium">
              {HOSPITAL_DISPLAY_NAME}
            </p>
            <Link
              href="/dashboard/scan"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-white text-emerald-800 text-sm font-semibold rounded-xl hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <ScanSearch size={18} strokeWidth={2} />
              Scan equipment
            </Link>
          </div>
          {/* Quick metric strip */}
            <div className="flex sm:flex-col gap-3 sm:gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">System Online</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
              <span className="text-xs text-emerald-200">Lab Metrics · QC · Assets</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recently visited + Quick actions (reduce sidebar redundancy) ── */}
      <div className="space-y-6 animate-slide-up stagger-2">
        <RecentlyVisited />
        <QuickActions />
      </div>

      {/* ── 3 App Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-slide-up stagger-2">
        {apps.map((app) => {
          const AppIcon = app.icon;
          return (
            <Link
              key={app.title}
              href={app.href}
              className={clsx(
                "flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                app.title === "Lab Metrics" && "focus-visible:ring-emerald-400",
                app.title === "Quality & samples" && "focus-visible:ring-indigo-400",
                app.title === "Asset Management" && "focus-visible:ring-teal-400"
              )}
            >
              {/* Card header with distinct gradient per workspace */}
              <div
                className="px-6 py-5 flex items-center gap-4"
                style={{ background: app.cardGradient }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <AppIcon size={20} className="text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">{app.eyebrow}</p>
                  <h2 className="text-white font-semibold text-base leading-tight">{app.title}</h2>
                </div>
              </div>

              {/* Card body */}
              <div className="flex flex-col flex-1 p-6 gap-4">
                <p className="text-slate-500 text-sm leading-relaxed">{app.description}</p>

                {/* Modules list — visible on hover (desktop) or always (mobile) */}
                <div className="flex flex-wrap gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 min-h-[28px]">
                  {app.tabs.map((tab) => (
                    <span
                      key={tab.href + tab.label}
                      className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium"
                    >
                      {tab.label}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className={`flex items-center gap-1 ${app.pillText} text-sm font-semibold mt-auto pt-2`}>
                  {app.ctaLabel}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-150" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom tagline ── */}
      <div className="animate-slide-up stagger-4 border-t border-slate-100 pt-5">
        <p style={{ fontSize: "0.8125rem", fontWeight: 400, color: "#94a3b8" }}>
          Kanta · QR-first asset intelligence for East African laboratories ·{" "}
          <span style={{ fontWeight: 600, color: "#047857" }}>Offline-capable</span>
        </p>
      </div>
    </div>
  );
}
