import Link from "next/link";

export default function MarketingHome() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(16, 185, 129, 0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(4, 47, 46, 0.12), transparent 50%)",
        }}
      />
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-20 md:px-6 md:pt-24 md:pb-28">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-800/90 mb-4">
          Hospital operational intelligence
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight max-w-3xl leading-[1.1]">
          Built for the modern laboratory
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl leading-relaxed">
          Kanta brings turnaround time, quality, assets, and intelligence into one operational view — designed for
          East African hospitals and lab networks.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors"
          >
            Request access
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            Explore features
          </Link>
          <Link href="/pricing" className="text-sm font-semibold text-emerald-800 hover:underline">
            View pricing →
          </Link>
        </div>
      </section>
    </div>
  );
}
