"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error.message || "Failed to send reset email");
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Kanta</h1>
            <p className="text-xs text-slate-400">Operational Intelligence</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-2">
            Reset password
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </p>

          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-3 rounded-lg">
                Check your email for a reset link. It may take a few minutes to
                arrive.
              </p>
              <Link
                href="/login"
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="you@hospital.org"
                />
              </div>
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-6 flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
