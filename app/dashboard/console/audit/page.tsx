"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ScrollText, Terminal } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type AuditApiRow = {
  id: string;
  created_at: string;
  facility_id: string | null;
  facility_name: string | null;
  user_id: string | null;
  actor_email: string;
  action: string;
  entity_type: string | null;
  record_id: string | null;
  table_name: string;
  summary: string;
};

type HospitalOpt = { id: string; name: string };

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ConsoleAuditPage() {
  const router = useRouter();
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const [facilities, setFacilities] = useState<HospitalOpt[]>([]);
  const [facilityFilter, setFacilityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<AuditApiRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.isSuperAdmin) {
      const t = setTimeout(() => router.replace("/dashboard/home"), 600);
      return () => clearTimeout(t);
    }
  }, [facilityAuthLoading, facilityAuth?.isSuperAdmin, router]);

  const loadFacilities = useCallback(async () => {
    try {
      const res = await fetch("/api/console/facilities");
      const data = await res.json().catch(() => []);
      setFacilities(Array.isArray(data) ? data.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })) : []);
    } catch {
      setFacilities([]);
    }
  }, []);

  useEffect(() => {
    if (facilityAuth?.isSuperAdmin) void loadFacilities();
  }, [facilityAuth?.isSuperAdmin, loadFacilities]);

  const buildQuery = useCallback(
    (cursor: string | null) => {
      const p = new URLSearchParams();
      if (facilityFilter) p.set("facility_id", facilityFilter);
      if (actionFilter.trim()) p.set("action", actionFilter.trim());
      if (actorFilter.trim()) p.set("actor", actorFilter.trim());
      if (fromDate) p.set("from", fromDate);
      if (toDate) p.set("to", toDate);
      if (cursor) p.set("cursor", cursor);
      return p.toString();
    },
    [facilityFilter, actionFilter, actorFilter, fromDate, toDate]
  );

  const MAX_ROWS = 200;

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean): Promise<void> => {
      const qs = buildQuery(cursor);
      const res = await fetch(`/api/console/audit${qs ? `?${qs}` : ""}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to load");
      }
      const newRows = Array.isArray(data.rows) ? (data.rows as AuditApiRow[]) : [];
      let apiNext: string | null =
        typeof data.nextCursor === "string" || data.nextCursor === null ? data.nextCursor : null;

      if (append) {
        setRows((prev) => {
          const merged = [...prev, ...newRows];
          if (merged.length >= MAX_ROWS) {
            apiNext = null;
            return merged.slice(0, MAX_ROWS);
          }
          return merged;
        });
      } else {
        const capped = newRows.slice(0, MAX_ROWS);
        setRows(capped);
        if (capped.length >= MAX_ROWS) apiNext = null;
      }
      setNextCursor(apiNext);
    },
    [buildQuery]
  );

  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;

  useEffect(() => {
    if (!facilityAuth?.isSuperAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPageRef
      .current(null, false)
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facilityAuth?.isSuperAdmin]);

  const applyFilters = () => {
    setLoading(true);
    setError(null);
    fetchPage(null, false)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    if (rows.length >= MAX_ROWS) return;
    setLoadingMore(true);
    fetchPage(nextCursor, true)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoadingMore(false));
  };

  if (facilityAuthLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (!facilityAuth?.isSuperAdmin) {
    return (
      <div className="p-8 text-sm text-slate-500">
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-sm text-white z-50 bg-red-600 max-w-sm">
          Access denied — Zyntel Console is for platform super-admins only.
        </div>
        Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Link
          href="/dashboard/console"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          Console home
        </Link>

        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-slate-500 text-sm font-medium">
            <Terminal size={18} className="text-slate-700" />
            Zyntel Console
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ScrollText size={28} className="text-slate-800" />
            Platform audit log
          </h1>
          <p className="text-slate-600 text-sm max-w-3xl">
            Cross-facility audit stream — all facilities, most recent first. Facility-scoped history remains
            under Admin → Audit trail.
          </p>
        </header>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Facility</label>
              <select
                value={facilityFilter}
                onChange={(e) => setFacilityFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                <option value="">All facilities</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Action contains</label>
              <input
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="e.g. user, LIMS"
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Actor email contains</label>
              <input
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                placeholder="email fragment"
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">From date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">To date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void applyFilters()}
                className="w-full rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-medium hover:bg-slate-800"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Loader2 className="animate-spin" size={18} />
              Loading audit entries…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/90 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Timestamp</th>
                    <th className="px-3 py-2.5 font-semibold">Facility</th>
                    <th className="px-3 py-2.5 font-semibold">Actor</th>
                    <th className="px-3 py-2.5 font-semibold">Action</th>
                    <th className="px-3 py-2.5 font-semibold">Entity type</th>
                    <th className="px-3 py-2.5 font-semibold">Entity ID</th>
                    <th className="px-3 py-2.5 font-semibold min-w-[200px]">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                        No audit entries match your filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 align-top">
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{fmtTime(r.created_at)}</td>
                        <td className="px-3 py-2 text-slate-900">{r.facility_name ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[180px] break-all">
                          {r.actor_email || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-800">{r.action}</td>
                        <td className="px-3 py-2 text-slate-600">{r.entity_type ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600 break-all max-w-[120px]">
                          {r.record_id ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-800">{r.summary}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && nextCursor && rows.length < MAX_ROWS ? (
            <div className="p-4 border-t border-slate-100 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
                Load more
              </button>
              <p className="text-xs text-slate-500">
                Up to {MAX_ROWS} most recent entries in this view.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
