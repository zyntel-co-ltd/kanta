import Link from "next/link";
import {
  Clock,
  Beaker,
  Hash,
  Database,
  DollarSign,
  ShieldCheck,
  LayoutDashboard,
  ScanSearch,
  ScanLine,
  Wrench,
  Thermometer,
  BarChart3,
  ArrowRight,
  Activity,
  FlaskConical,
  Layers,
} from "lucide-react";

/* ─────────────────────────── types ─────────────────────────── */

type SubTab = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type AppCard = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  iconBg: string;
  ring: string;
  pill: string;
  pillText: string;
  ctaColor: string;
  tabs: SubTab[];
  blob: string;
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
    gradient: "from-indigo-500 to-indigo-700",
    iconBg: "bg-indigo-50",
    ring: "ring-indigo-100",
    pill: "bg-indigo-50",
    pillText: "text-indigo-700",
    ctaColor: "bg-indigo-600 hover:bg-indigo-700 text-white",
    blob: "from-indigo-100/60 to-blue-100/40",
    tabs: [
      { label: "TAT", href: "/dashboard/tat", icon: Clock },
      { label: "Tests", href: "/dashboard/tests", icon: Beaker },
      { label: "Numbers", href: "/dashboard/numbers", icon: Hash },
      { label: "Meta", href: "/dashboard/meta", icon: Database },
      { label: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
    ],
  },
  {
    eyebrow: "Clinical Excellence",
    title: "Quality Management",
    description:
      "Run Westgard rules, plot Levey-Jennings charts and manage qualitative QC to keep results accurate and compliant.",
    href: "/dashboard/qc",
    icon: ShieldCheck,
    gradient: "from-emerald-500 to-emerald-700",
    iconBg: "bg-emerald-50",
    ring: "ring-emerald-100",
    pill: "bg-emerald-50",
    pillText: "text-emerald-700",
    ctaColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    blob: "from-emerald-100/60 to-teal-100/40",
    tabs: [
      { label: "QC Overview", href: "/dashboard/qc", icon: ShieldCheck },
      { label: "L-J Charts", href: "/dashboard/qc", icon: Activity },
      { label: "Westgard", href: "/dashboard/qc", icon: BarChart3 },
      { label: "Qualitative QC", href: "/dashboard/qc", icon: FlaskConical },
    ],
  },
  {
    eyebrow: "Operations",
    title: "Asset Management",
    description:
      "Track every piece of equipment, schedule maintenance, monitor cold-chain temperatures and review fleet analytics.",
    href: "/dashboard",
    icon: Layers,
    gradient: "from-orange-500 to-orange-700",
    iconBg: "bg-orange-50",
    ring: "ring-orange-100",
    pill: "bg-orange-50",
    pillText: "text-orange-700",
    ctaColor: "bg-orange-600 hover:bg-orange-700 text-white",
    blob: "from-orange-100/60 to-amber-100/40",
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
    <div className="max-w-[1280px] mx-auto space-y-10 pb-10">

      {/* ── Hero Header ── */}
      <div className="animate-slide-up stagger-1 pt-2">
        <p className="text-eyebrow mb-3">Kanta · Operational Intelligence</p>
        <h1
          className="text-heading"
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            color: "#0f172a",
          }}
        >
          Welcome to&nbsp;
          <span
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Kanta
          </span>
        </h1>
        <p
          className="mt-3 max-w-xl"
          style={{
            fontSize: "1.0625rem",
            fontWeight: 400,
            color: "#64748b",
            lineHeight: 1.65,
          }}
        >
          Choose a workspace below. Each app bundles everything you need for that
          domain — data, charts and controls — in one focused view.
        </p>
      </div>

      {/* ── 3 App Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up stagger-2">
        {apps.map((app) => {
          const AppIcon = app.icon;
          return (
            <div
              key={app.title}
              className="relative flex flex-col rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
              style={{ minHeight: 380 }}
            >
              {/* Decorative gradient blob */}
              <div
                className={`absolute -top-16 -right-16 w-52 h-52 rounded-full bg-gradient-to-br ${app.blob} blur-3xl opacity-70 pointer-events-none group-hover:opacity-90 transition-opacity`}
              />

              {/* Top gradient band */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${app.gradient} flex-shrink-0`} />

              <div className="relative flex flex-col flex-1 p-7">
                {/* Eyebrow + Icon row */}
                <div className="flex items-center justify-between mb-5">
                  <span className="text-eyebrow">{app.eyebrow}</span>
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
                  >
                    <AppIcon size={20} className="text-white" />
                  </div>
                </div>

                {/* Title */}
                <h2
                  style={{
                    fontSize: "1.375rem",
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    lineHeight: 1.25,
                    color: "#0f172a",
                  }}
                >
                  {app.title}
                </h2>

                {/* Description */}
                <p
                  className="mt-2 flex-1"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    color: "#64748b",
                    lineHeight: 1.6,
                  }}
                >
                  {app.description}
                </p>

                {/* Sub-tabs */}
                <div className="flex flex-wrap gap-2 mt-5">
                  {app.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                      <Link
                        key={tab.href + tab.label}
                        href={tab.href}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${app.pill} ${app.pillText} border border-transparent hover:border-current transition-all`}
                        style={{ fontSize: "0.75rem", fontWeight: 600 }}
                      >
                        <TabIcon size={12} />
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>

                {/* CTA */}
                <div className="mt-6">
                  <Link
                    href={app.href}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${app.ctaColor}`}
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    Open {app.title}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom tagline ── */}
      <div className="animate-slide-up stagger-4 border-t border-slate-100 pt-6">
        <p
          style={{
            fontSize: "0.8125rem",
            fontWeight: 400,
            color: "#94a3b8",
          }}
        >
          Kanta · QR-first asset intelligence for East African laboratories ·{" "}
          <span
            style={{
              fontWeight: 600,
              color: "#4f46e5",
            }}
          >
            Offline-capable
          </span>
        </p>
      </div>
    </div>
  );
}
