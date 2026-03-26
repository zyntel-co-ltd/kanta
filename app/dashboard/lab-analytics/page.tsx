import Link from "next/link";
import {
  Timer,
  Microscope,
  Binary,
  TableProperties,
  CircleDollarSign,
  ChartSpline,
  ArrowRight,
} from "lucide-react";

const CARDS = [
  {
    href: "/dashboard/tat",
    eyebrow: "Turnaround",
    title: "TAT",
    body: "Track on-time, delayed, and not-uploaded performance across shifts and lab units.",
    cta: "Open TAT",
    Icon: Timer,
  },
  {
    href: "/dashboard/tests",
    eyebrow: "Operations",
    title: "Tests",
    body: "Monitor daily testing throughput, trends, and departmental load distribution.",
    cta: "Open tests",
    Icon: Microscope,
  },
  {
    href: "/dashboard/numbers",
    eyebrow: "Volumes",
    title: "Numbers",
    body: "View aggregate request volumes and benchmark movement over time.",
    cta: "Open numbers",
    Icon: Binary,
  },
  {
    href: "/dashboard/meta",
    eyebrow: "Metadata",
    title: "Meta",
    body: "Inspect and manage supporting metadata used across Lab Metrics workflows.",
    cta: "Open meta",
    Icon: TableProperties,
  },
  {
    href: "/dashboard/revenue",
    eyebrow: "Finance",
    title: "Revenue",
    body: "Analyze test revenue trends, performance windows, and billing-aligned indicators.",
    cta: "Open revenue",
    Icon: CircleDollarSign,
  },
  {
    href: "/dashboard/performance",
    eyebrow: "Insights",
    title: "Performance",
    body: "Compare key KPIs and performance patterns for continuous lab optimization.",
    cta: "Open performance",
    Icon: ChartSpline,
  },
];

export default function LabAnalyticsWorkspacePage() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-10">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, #042f2e 0%, #065f46 55%, #047857 100%)" }}
      >
        <div className="px-7 py-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200 mb-2">Workspace</p>
          <h1 className="text-white font-extrabold tracking-tight" style={{ fontSize: "clamp(1.35rem, 2.2vw, 1.75rem)", lineHeight: 1.2 }}>
            Lab Metrics
          </h1>
          <p className="text-emerald-100 mt-2 max-w-xl text-[0.9375rem] leading-relaxed">
            Monitor turnaround, throughput, volume, performance, and revenue signals - choose a submodule to continue.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CARDS.map(({ href, eyebrow, title, body, cta, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
          >
            <div className="px-6 py-5 flex items-center gap-4 bg-slate-50 border-b border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon size={22} className="text-white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{eyebrow}</p>
                <h2 className="text-slate-900 font-semibold text-lg leading-tight">{title}</h2>
              </div>
            </div>
            <div className="flex flex-col flex-1 p-6 gap-4">
              <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
              <div className="flex items-center gap-1 text-slate-700 group-hover:text-emerald-700 text-sm font-semibold mt-auto pt-2">
                {cta}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-150" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
