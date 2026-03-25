"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function InviteAcceptPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not accept invite");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600 text-sm">Invalid invite link.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">You&apos;re in</h1>
          <p className="text-slate-600 text-sm mb-6">
            Your account is ready. Sign in with your email and the password you set.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Accept invitation</h1>
        <p className="text-slate-500 text-sm mb-6">Choose a password for your account (min 8 characters).</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              required
              type="password"
              minLength={8}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Accept & continue"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
