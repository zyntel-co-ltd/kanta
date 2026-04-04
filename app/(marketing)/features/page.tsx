import Link from "next/link";
import { Activity, ShieldCheck, ScanLine } from "lucide-react";

const sections = [
  {
    title: "Lab Metrics",
    icon: Activity,
    body: "Turnaround time, test volumes, revenue signals, and lab analytics — so leaders see flow and bottlenecks without digging through spreadsheets.",
  },
  {
    title: "Quality & Samples",
    icon: ShieldCheck,
    body: "QC configuration, Westgard rules, Levey-Jennings views, and sample tracking — aligned to how hospital labs actually run day to day.",
  },
  {
    title: "Asset Management",
    icon: ScanLine,
    body: "QR-first equipment records, maintenance schedules, and cold-chain monitoring — fewer surprises and clearer accountability.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Features</h1>
      <p className="mt-3 text-slate-600 max-w-2xl">
        Kanta is organised around three pillars: how the lab performs, how quality is controlled, and how assets are
        tracked.
      </p>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {sections.map(({ title, icon: Icon, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700/10 text-emerald-800">
              <Icon size={22} strokeWidth={1.75} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-14">
        <Link
          href="/contact"
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
        >
          Request access
        </Link>
      </div>
    </div>
  );
}
