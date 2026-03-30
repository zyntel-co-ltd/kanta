"use client";

import { useCallback, useEffect, useState } from "react";
import AvailableWhenOnline from "@/components/ui/AvailableWhenOnline";
import type { FilterOption } from "@/lib/hooks/useFacilityConfig";
import { useSyncQueue } from "@/lib/SyncQueueContext";

type TestLine = {
  test_name: string;
  section: string;
  status: string;
  received_at: string | null;
  resulted_at: string | null;
};

type Group = {
  visit_display_token: string;
  test_count: number;
  tests: TestLine[];
  visit_tat_minutes: number | null;
  visit_status: string;
  first_received_at: string | null;
  last_resulted_at: string | null;
};

type Props = {
  facilityId: string;
  sectionFilterOptions: FilterOption[];
  resolveSectionLabel: (code: string) => string;
};

function fmtDt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function TatPatientLevelTab({
  facilityId,
  sectionFilterOptions,
  resolveSectionLabel,
}: Props) {
  const { isOnline } = useSyncQueue();
  const [section, setSection] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openToken, setOpenToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isOnline) {
      setGroups([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        facility_id: facilityId,
        page: String(page),
        limit: String(limit),
      });
      if (section && section !== "all") q.set("section", section);
      if (dateFrom) q.set("date_from", dateFrom);
      if (dateTo) q.set("date_to", dateTo);
      const res = await fetch(`/api/tat/patient-level?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load");
      setGroups(Array.isArray(j.groups) ? j.groups : []);
      setTotal(typeof j.total === "number" ? j.total : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setGroups([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [facilityId, page, limit, section, dateFrom, dateTo, isOnline]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!isOnline) {
    return (
      <div className="space-y-4">
        <AvailableWhenOnline
          title="Patient-level TAT available when online"
          detail="Reconnect to load visit-grouped tests from the server."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient level TAT (visit)</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tests grouped by visit token from LIMS, or by lab number when no token is set. Visit token is an anonymized group handle — not a patient identifier.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Section
          <select
            value={section}
            onChange={(e) => {
              setPage(1);
              setSection(e.target.value);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 min-w-[10rem]"
          >
            {sectionFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPage(1);
              setDateFrom(e.target.value);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPage(1);
              setDateTo(e.target.value);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-sm">
            Loading…
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-sm">
            No visit groups in this range. Ensure LIMS sync populates <code className="text-xs">visit_token</code> or{" "}
            <code className="text-xs">lab_number</code>.
          </div>
        ) : (
          groups.map((g) => {
            const open = openToken === g.visit_display_token;
            return (
              <div
                key={g.visit_display_token}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenToken(open ? null : g.visit_display_token)}
                  className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50/80"
                >
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-semibold text-slate-900">{g.visit_display_token}</span>
                    <span className="text-xs text-slate-500">{g.test_count} test(s)</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        g.visit_status === "Complete" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
                      }`}
                    >
                      {g.visit_status}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 flex flex-wrap gap-3">
                    <span>Visit TAT: {g.visit_tat_minutes != null ? `${g.visit_tat_minutes} min` : "—"}</span>
                    <span className="hidden sm:inline">First in: {fmtDt(g.first_received_at)}</span>
                    <span className="hidden md:inline">Last out: {fmtDt(g.last_resulted_at)}</span>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="pb-2 pr-2">Test</th>
                          <th className="pb-2 pr-2">Section</th>
                          <th className="pb-2 pr-2">Status</th>
                          <th className="pb-2 pr-2">Received</th>
                          <th className="pb-2">Resulted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {g.tests.map((t, idx) => (
                          <tr key={`${g.visit_display_token}-${idx}`}>
                            <td className="py-2 pr-2 text-slate-800">{t.test_name}</td>
                            <td className="py-2 pr-2 text-slate-700">{resolveSectionLabel(t.section)}</td>
                            <td className="py-2 pr-2 text-slate-600">{t.status}</td>
                            <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">{fmtDt(t.received_at)}</td>
                            <td className="py-2 text-slate-600 whitespace-nowrap">{fmtDt(t.resulted_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} · {total.toLocaleString()} visits
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
