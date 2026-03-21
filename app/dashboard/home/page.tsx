import Link from "next/link";
import type { ComponentType } from "react";
import {
  LayoutDashboard,
  ScanSearch,
  ScanLine,
  Wrench,
  Clock,
  Beaker,
  Hash,
  Database,
  DollarSign,
  Thermometer,
  Building2,
  BarChart3,
  FileText,
  Table2,
  ListTodo,
  Activity,
  Shield,
  Settings,
} from "lucide-react";

type Panel = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  accent: string;
};

const panels: Panel[] = [
  {
    title: "Assets overview",
    description: "KPIs, charts, fleet status",
    href: "/dashboard",
    icon: LayoutDashboard,
    accent: "from-indigo-500 to-violet-600",
  },
  {
    title: "Scan",
    description: "QR capture & lookup",
    href: "/dashboard/scan",
    icon: ScanSearch,
    accent: "from-cyan-500 to-blue-600",
  },
  {
    title: "Equipment",
    description: "Register & track assets",
    href: "/dashboard/equipment",
    icon: ScanLine,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    title: "Maintenance",
    description: "Schedules & due work",
    href: "/dashboard/maintenance",
    icon: Wrench,
    accent: "from-amber-500 to-orange-600",
  },
  {
    title: "TAT",
    description: "Turnaround intelligence",
    href: "/dashboard/tat",
    icon: Clock,
    accent: "from-violet-500 to-purple-600",
  },
  {
    title: "Tests & QC",
    description: "Volumes, Westgard, L-J",
    href: "/dashboard/tests",
    icon: Beaker,
    accent: "from-pink-500 to-rose-600",
  },
  {
    title: "Numbers & Meta",
    description: "Targets & test metadata",
    href: "/dashboard/numbers",
    icon: Hash,
    accent: "from-slate-500 to-slate-700",
  },
  {
    title: "Revenue",
    description: "Targets vs actuals",
    href: "/dashboard/revenue",
    icon: DollarSign,
    accent: "from-green-500 to-emerald-700",
  },
  {
    title: "Refrigerator",
    description: "Cold chain monitoring",
    href: "/dashboard/refrigerator",
    icon: Thermometer,
    accent: "from-sky-500 to-indigo-600",
  },
  {
    title: "Departments",
    description: "Ward & lab structure",
    href: "/dashboard/departments",
    icon: Building2,
    accent: "from-fuchsia-500 to-pink-600",
  },
  {
    title: "Analytics & reports",
    description: "Insights & exports",
    href: "/dashboard/analytics",
    icon: BarChart3,
    accent: "from-indigo-600 to-blue-800",
  },
  {
    title: "Admin",
    description: "Users, audit, targets",
    href: "/dashboard/admin",
    icon: Shield,
    accent: "from-red-500 to-red-800",
  },
];

export default function DashboardHomePage() {
  return (
    <div className="max-w-[1400px] space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome to Kanta
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Choose a module below or use the sidebar. You can collapse or hide the sidebar from
          the top bar for more space.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {panels.map(({ title, description, href, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="group relative flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
          >
            <div
              className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-lg`}
            >
              <Icon size={20} />
            </div>
            <h2 className="text-base font-semibold text-slate-900 group-hover:text-indigo-700">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 flex-1">{description}</p>
            <span className="mt-3 text-xs font-semibold text-indigo-600 group-hover:underline">
              Open →
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/dashboard/reception"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Table2 size={16} /> Reception
        </Link>
        <Link
          href="/dashboard/tracker"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ListTodo size={16} /> Tracker
        </Link>
        <Link
          href="/dashboard/progress"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Activity size={16} /> Progress
        </Link>
        <Link
          href="/dashboard/reports"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FileText size={16} /> Reports
        </Link>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Settings size={16} /> Settings
        </Link>
      </div>
    </div>
  );
}
