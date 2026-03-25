"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PasswordResetPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await (supabase.auth as { updateUser: (p: { password: string }) => Promise<{ error: { message?: string } | null }> }).updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error?.message || "Failed to update password");
      return;
    }
    setSuccess(true);
    setTimeout(() => router.replace("/dashboard/home"), 2000);
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
            Set new password
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Enter your new password below.
          </p>

          {success ? (
            <p className="text-emerald-400 text-sm">
              Password updated. Redirecting to dashboard…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="••••••••"
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
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-6 block text-sm text-slate-400 hover:text-slate-300"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
