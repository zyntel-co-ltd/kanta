import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/80 mt-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-600">
        <p>© {new Date().getFullYear()} Zyntel Co. Limited</p>
        <Link href="https://zyntel.net/legal/privacy" className="text-emerald-800 hover:underline">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
