import Link from "next/link";
import Image from "next/image";

export default function MarketingNav() {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-slate-900 font-semibold tracking-tight">
          <Image src="/kanta-logo.png" alt="Kanta" width={36} height={36} className="h-9 w-9 object-contain" />
          <span>Kanta</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/features" className="hover:text-emerald-800 transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-emerald-800 transition-colors">
            Pricing
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800 transition-colors"
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
