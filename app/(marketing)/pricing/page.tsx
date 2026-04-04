import Link from "next/link";

const tiers = [
  {
    name: "Free",
    subtitle: "Department visibility",
    price: "$0",
    period: "/month forever",
    badge: "No credit card required",
    highlights: [
      "1 department",
      "Up to 50 equipment items",
      "7-day data history",
      "Counts-only analytics",
    ],
  },
  {
    name: "Starter",
    subtitle: "MVP & primary acquisition",
    price: "$99",
    period: "/month (or $899/year)",
    badge: null,
    highlights: [
      "Up to 3 departments",
      "Unlimited equipment items",
      "90-day history & basic reports",
      "Email alerts & mobile PWA",
    ],
  },
  {
    name: "Professional",
    subtitle: "Most popular",
    price: "$299",
    period: "/month",
    badge: null,
    highlights: [
      "Unlimited departments",
      "1-year data history",
      "TAT monitoring included",
      "1 Data Bridge connector",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    subtitle: "Large hospitals & chains",
    price: "$799",
    period: "/month",
    badge: null,
    highlights: [
      "Read-only facility API",
      "Up to 3 Data Bridge connectors",
      "Full audit trail & SLA options",
      "Executive reporting",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Pricing</h1>
      <p className="mt-3 text-slate-600 max-w-2xl">
        Plans follow the Zyntel playbook: start with visibility, scale into operational depth. No self-serve checkout at
        pre-seed — talk to us when you are ready.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((t) => (
          <div
            key={t.name}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">{t.name}</h2>
            <p className="text-xs text-slate-500 mt-1">{t.subtitle}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{t.price}</span>
              <span className="text-sm text-slate-500">{t.period}</span>
            </div>
            {t.badge && (
              <p className="mt-2 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-lg px-2 py-1 inline-block w-fit">
                {t.badge}
              </p>
            )}
            <ul className="mt-5 space-y-2 text-sm text-slate-600 flex-1">
              {t.highlights.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/contact"
              className="mt-6 inline-flex justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              Request access
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-10 text-xs text-slate-500 max-w-3xl">
        USD list pricing; local currency and hospital-specific packaging may apply. No Stripe integration on this page —
        all paid enquiries go through Request access.
      </p>
    </div>
  );
}
