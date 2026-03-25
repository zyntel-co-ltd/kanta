"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Layers,
  FlaskConical,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const features = [
  {
    icon: Activity,
    title: "Lab Intelligence",
    desc: "TAT, test volumes, revenue and quality control — all in one view.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Management",
    desc: "Westgard rules, Levey-Jennings charts and qualitative QC tracking.",
  },
  {
    icon: Layers,
    title: "Asset Management",
    desc: "QR-first equipment tracking, maintenance scheduling and cold-chain monitoring.",
  },
];

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard/home";

  useEffect(() => {
    if (user) {
      router.replace(redirect.startsWith("/") ? redirect : "/dashboard/home");
    }
  }, [user, redirect, router]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message || "Invalid email or password");
      return;
    }
    router.replace(redirect.startsWith("/") ? redirect : "/dashboard/home");
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif", background: "#f8fafc" }}
    >
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #042f2e 0%, #065f46 55%, #047857 100%)" }}
      >
        {/* Decorative glows */}
        <div
          className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #34d399, transparent 70%)", transform: "translate(30%, -30%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[380px] h-[380px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #6ee7b7, transparent 70%)", transform: "translate(-30%, 30%)" }}
        />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <FlaskConical size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none tracking-tight">Kanta</p>
            <p className="text-emerald-300 text-xs mt-0.5">Operational Intelligence</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2
              className="text-white leading-tight mb-4"
              style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.03em" }}
            >
              Built for the<br />
              <span style={{ color: "#6ee7b7" }}>modern laboratory</span>
            </h2>
            <p className="text-emerald-100 leading-relaxed" style={{ fontSize: "1rem", maxWidth: 380 }}>
              A single platform for equipment tracking, quality control and lab analytics — designed for East African hospitals.
            </p>
          </div>

          <div className="space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  <Icon size={15} className="text-emerald-200" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none mb-1">{title}</p>
                  <p className="text-emerald-200 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-emerald-400 text-xs">Trusted by laboratory teams across East Africa</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12">

        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
            <FlaskConical size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-base leading-none">Kanta</p>
            <p className="text-slate-400 text-xs mt-0.5">Operational Intelligence</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1
              className="text-slate-900 mb-2"
              style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}
            >
              Sign in
            </h1>
            <p className="text-slate-500" style={{ fontSize: "0.9375rem" }}>
              Enter your credentials to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-slate-700 mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@hospital.org"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                style={{ fontSize: "0.9375rem" }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-slate-700" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-emerald-600 hover:text-emerald-700 transition-colors"
                  style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                style={{ fontSize: "0.9375rem" }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <CheckCircle2 size={15} className="text-red-500 flex-shrink-0 mt-0.5 rotate-45" />
                <p className="text-red-700" style={{ fontSize: "0.875rem" }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ fontSize: "0.9375rem" }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-400" style={{ fontSize: "0.8125rem" }}>
            Hospital asset intelligence · East Africa
          </p>
        </div>
      </div>
    </div>
  );
}
