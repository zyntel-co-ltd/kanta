"use client";

import { useState } from "react";

export default function ContactPage() {
  const [hospitalName, setHospitalName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_name: hospitalName,
          contact_name: contactName,
          email,
          phone,
          city,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Request failed");
      setStatus("ok");
      setMessage("Thanks — we will get back to you shortly.");
      setHospitalName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setCity("");
    } catch (err) {
      setStatus("err");
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14 md:px-6 md:py-20">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Request access</h1>
      <p className="mt-3 text-slate-600 text-sm">
        Kanta is provisioned by Zyntel for each hospital. Tell us who you are and we will follow up.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Hospital name</label>
          <input
            required
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Your name</label>
          <input
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Work email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {status === "loading" ? "Sending…" : "Submit"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-sm ${status === "ok" ? "text-emerald-800" : "text-red-700"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
