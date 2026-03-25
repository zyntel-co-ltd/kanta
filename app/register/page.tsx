"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [facilityName, setFacilityName] = useState("");
  const [country, setCountry] = useState("Uganda");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-facility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_name: facilityName,
          country,
          city: city || null,
          admin_email: email,
          admin_password: password,
          admin_display_name: displayName || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Registration failed");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Facility created</h1>
          <p className="text-slate-600 text-sm mb-6">
            You can sign in with the email and password you provided.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Register your facility</h1>
        <p className="text-slate-500 text-sm mb-6">
          Create a Kanta workspace and the first facility admin account.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Facility name</label>
            <input
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your email</label>
            <input
              required
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display name</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password (min 8 characters)</label>
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
            {loading ? "Creating…" : "Create facility"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
