"use client";

// REGRESSIVE DESIGN: This submodule is hidden for hospitals without refrigerator monitoring sensors. Feature flag: show-refrigerator-module (PostHog). Default: hidden for new facilities until sensors are configured.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Thermometer, AlertTriangle, Clock } from "lucide-react";

import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useFlag } from "@/lib/featureFlags";

type Unit = {
  id: string;
  name: string;
  location?: string;
  min_temp_celsius: number;
  max_temp_celsius: number;
  latest_temp: number | null;
  latest_recorded_at: string | null;
  status: "ok" | "breach" | "offline";
};

type Breach = {
  id: string;
  breach_type: string;
  started_at: string;
  resolved_at?: string;
  unit?: { name: string };
};

export default function RefrigeratorPage() {
  const showRefrigeratorModule = useFlag("show-refrigerator-module");
  const [units, setUnits] = useState<Unit[]>([]);
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!showRefrigeratorModule) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const [uRes, bRes] = await Promise.all([
          fetch(`/api/refrigerator/units?facility_id=${DEFAULT_FACILITY_ID}`),
          fetch(`/api/refrigerator/breaches?facility_id=${DEFAULT_FACILITY_ID}&limit=20`),
        ]);
        const uData = await uRes.json();
        const bData = await bRes.json();
        setUnits(uData.data ?? []);
        setBreaches(bData.data ?? []);
      } catch {
        setUnits([]);
        setBreaches([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [showRefrigeratorModule]);

  if (!showRefrigeratorModule) {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Thermometer size={40} className="text-slate-300 mx-auto mb-3" />
        <h1 className="text-lg font-semibold text-slate-800">Refrigerator monitoring is not enabled</h1>
        <p className="mt-2 text-sm text-slate-500">
          This module is controlled for your facility by Zyntel. Contact your administrator if you need refrigerator telemetry.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Refrigerator Monitoring
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Unit grid, breach log, temperature charts.
        </p>
      </div>

      {units.length === 0 ? (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-8 text-center">
          <Thermometer size={48} className="text-amber-500 mx-auto mb-3" />
          <p className="font-medium text-amber-800">No refrigerator units registered</p>
          <p className="text-sm text-amber-600 mt-1">
            Configure units and API key in facility settings to start monitoring.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map((u) => (
              <Link
                key={u.id}
                href={`/dashboard/refrigerator/${u.id}`}
                className="block"
              >
                <div
                  className={`rounded-2xl border p-6 transition-all hover:shadow-md ${
                    u.status === "breach"
                      ? "border-red-200 bg-red-50"
                      : u.status === "offline"
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      {u.location && (
                        <p className="text-xs text-slate-500 mt-0.5">{u.location}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === "ok"
                          ? "bg-emerald-100 text-emerald-700"
                          : u.status === "breach"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {u.status === "ok" ? "OK" : u.status === "breach" ? "Breach" : "Offline"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {u.latest_temp != null ? `${u.latest_temp}°C` : "—"}
                    </span>
                    <span className="text-sm text-slate-500">
                      {u.min_temp_celsius}–{u.max_temp_celsius}°C range
                    </span>
                  </div>
                  {u.latest_recorded_at && (
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(u.latest_recorded_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="font-semibold text-slate-800">Breach Log</span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {breaches.length === 0 ? (
                <p className="text-sm text-slate-500">No breaches</p>
              ) : (
                <div className="space-y-2">
                  {breaches.map((b) => (
                    <div
                      key={b.id}
                      className="py-2 border-b border-slate-50 text-sm"
                    >
                      <span className="font-medium">{b.unit?.name ?? "—"}</span>
                      <span className="text-slate-600"> · {b.breach_type}</span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(b.started_at).toLocaleString()}
                        {b.resolved_at &&
                          ` — Resolved ${new Date(b.resolved_at).toLocaleString()}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
