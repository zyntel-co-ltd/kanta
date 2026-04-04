"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Cable,
  Loader2,
  RefreshCw,
  Save,
  Shield,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { LoadingBars } from "@/components/ui/PageLoader";

type ConnectionDTO = {
  id: string;
  connector_type: string;
  is_active: boolean;
  last_synced_at: string | null;
  query_config: Record<string, string | undefined>;
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  passwordSaved: boolean;
  decryptError?: boolean;
};

type SyncLogRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  records_fetched: number | null;
  records_upserted: number | null;
  error: string | null;
};

const defaultMapping = {
  testRequestTable: "",
  sampleIdColumn: "",
  receivedAtColumn: "",
  resultAtColumn: "",
  sectionColumn: "",
  testNameColumn: "",
  externalRefColumn: "",
};

type DataConnectionsSectionProps = {
  /** When true, hides the "Admin" back link (used inside Data Bridge tabs). */
  embedded?: boolean;
};

export function DataConnectionsSection({ embedded = false }: DataConnectionsSectionProps) {
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const router = useRouter();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;

  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<ConnectionDTO | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogRow[]>([]);

  const [connectorType] = useState("postgresql");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("5432");
  const [database, setDatabase] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [ssl, setSsl] = useState(false);
  const [mapping, setMapping] = useState(defaultMapping);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [unmatchedRows, setUnmatchedRows] = useState<{ source_name: string; occurrence_count: number }[]>([]);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/data-connections?facility_id=${facilityId}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setLastError(data.lastError ?? null);
      setSyncLogs(Array.isArray(data.syncLogs) ? data.syncLogs : []);
      try {
        const ur = await fetch(`/api/admin/bridge/unmatched?facility_id=${encodeURIComponent(facilityId)}`, {
          credentials: "same-origin",
        });
        const uj = await ur.json();
        setUnmatchedRows(Array.isArray(uj.rows) ? uj.rows : []);
      } catch {
        setUnmatchedRows([]);
      }
      const c = data.connection as ConnectionDTO | null;
      setConnection(c);
      if (c) {
        setHost(c.host ?? "");
        setPort(String(c.port ?? 5432));
        setDatabase(c.database ?? "");
        setUser(c.user ?? "");
        setPassword("");
        setSsl(Boolean(c.ssl));
        setIsActive(Boolean(c.is_active));
        const q = c.query_config ?? {};
        setMapping({
          testRequestTable: String(q.testRequestTable ?? ""),
          sampleIdColumn: String(q.sampleIdColumn ?? ""),
          receivedAtColumn: String(q.receivedAtColumn ?? ""),
          resultAtColumn: String(q.resultAtColumn ?? ""),
          sectionColumn: String(q.sectionColumn ?? ""),
          testNameColumn: String(q.testNameColumn ?? ""),
          externalRefColumn: String(q.externalRefColumn ?? ""),
        });
      } else {
        setHost("");
        setPort("5432");
        setDatabase("");
        setUser("");
        setPassword("");
        setSsl(false);
        setIsActive(true);
        setMapping(defaultMapping);
      }
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.canAccessAdminPanel) {
      router.replace("/dashboard/home");
      return;
    }
    load();
  }, [facilityAuthLoading, facilityAuth, router, load]);

  const statusLabel = (): "not_configured" | "disabled" | "error" | "connected" => {
    if (!connection) return "not_configured";
    if (!connection.is_active) return "disabled";
    if (lastError) return "error";
    return "connected";
  };

  const onTest = async () => {
    if (!facilityId) return;
    setTesting(true);
    setToast(null);
    try {
      const body: Record<string, unknown> = {
        facility_id: facilityId,
        host,
        port: Number(port) || 5432,
        database,
        user,
        ssl,
        query_config: mapping,
        ...mapping,
      };
      if (password) body.password = password;
      else if (connection?.id) body.connection_id = connection.id;

      if (!password && !connection?.id) {
        setToast({ type: "error", message: "Enter a password to test, or save the connection first." });
        setTesting(false);
        return;
      }

      const res = await fetch("/api/admin/data-connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setToast({
          type: "success",
          message: `Connection OK. Approx. ${data.rowCount ?? 0} rows in test request table.`,
        });
      } else {
        setToast({ type: "error", message: data.error || "Connection test failed" });
      }
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const onSave = async () => {
    if (!facilityId) return;
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/data-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          facility_id: facilityId,
          id: connection?.id,
          connector_type: connectorType,
          host,
          port: Number(port) || 5432,
          database,
          user,
          password,
          ssl,
          query_config: mapping,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setToast({ type: "success", message: "LIMS connection saved" });
      setPassword("");
      await load();
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const onSync = async () => {
    if (!facilityId || !connection?.id) return;
    setSyncing(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/data-connections/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ facility_id: facilityId, connection_id: connection.id }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast({ type: "error", message: data.error || "Sync failed" });
      } else {
        setToast({
          type: "success",
          message: `Synced: ${data.recordsUpserted ?? 0} upserted in ${data.duration ?? 0}ms`,
        });
      }
      await load();
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const onToggleActive = async (next: boolean) => {
    if (!facilityId || !connection?.id) return;
    setToggling(true);
    try {
      const res = await fetch("/api/admin/data-connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          facility_id: facilityId,
          id: connection.id,
          is_active: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setIsActive(next);
      setToast({ type: "success", message: next ? "Sync enabled" : "Sync disabled" });
      await load();
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setToggling(false);
    }
  };

  if (facilityAuthLoading || !facilityAuth?.canAccessAdminPanel) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingBars />
      </div>
    );
  }

  const st = statusLabel();
  const statusBadge =
    st === "not_configured" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium">
        Not configured
      </span>
    ) : st === "disabled" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium">
        Disabled
      </span>
    ) : st === "error" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-medium">
        Error
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-medium">
        Connected
      </span>
    );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {!embedded && (
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--module-primary)] mb-2"
            >
              <ArrowLeft size={14} />
              Admin
            </Link>
          )}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cable size={24} className="text-[var(--module-primary)]" />
            Data Connections
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Connect your LIMS (PostgreSQL) for lab intelligence sync. Credentials are encrypted at rest.
          </p>
        </div>
        <div className="flex items-center gap-2">{statusBadge}</div>
      </div>

      {lastError && st === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Last sync error</p>
            <p className="text-red-700/90 mt-0.5">{lastError}</p>
          </div>
        </div>
      )}

      {connection?.decryptError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not decrypt stored credentials. Check <code className="text-xs">LIMS_ENCRYPTION_KEY</code> on the server.
        </div>
      )}

      {unmatchedRows.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Unmapped LIMS test names ({unmatchedRows.length})</p>
            <p className="text-amber-900/90 mt-0.5">
              Recent examples:{" "}
              {unmatchedRows
                .slice(0, 5)
                .map((r) => r.source_name)
                .join(", ")}
              {unmatchedRows.length > 5 ? "…" : ""}. Add{" "}
              <code className="text-[11px] bg-white/80 px-1 rounded">test_name_mappings</code> via the admin API or
              contact Zyntel to tune the bridge.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Shield size={16} className="text-slate-500" />
          LIMS connection
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Connector type</label>
            <select
              value={connectorType}
              disabled
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 text-slate-600"
            >
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Host</label>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="e.g. lims-db.hospital.local"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Port</label>
            <input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="5432"
              disabled={loading}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Database</label>
            <input
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="e.g. labguru"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Username</label>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="readonly_bridge"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder={connection?.passwordSaved ? "•••••••• (saved — leave blank to keep)" : "••••••••"}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <button
              type="button"
              role="switch"
              aria-checked={ssl}
              onClick={() => setSsl(!ssl)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                ssl ? "bg-[var(--module-primary)]" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                  ssl ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-slate-700">Use SSL</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Column mapping</h3>
          <p className="text-xs text-slate-500">
            Map your LIMS table and columns. Nakasero (LabGuru) example: table <code className="text-[11px]">lab_requests</code>, sample{" "}
            <code className="text-[11px]">sample_no</code>, times <code className="text-[11px]">received_time</code> /{" "}
            <code className="text-[11px]">result_time</code>, section <code className="text-[11px]">section_name</code>, test{" "}
            <code className="text-[11px]">test_name</code>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              [
                ["testRequestTable", "Test request table", "e.g. lab_requests"],
                ["sampleIdColumn", "Sample / lab ID column", "e.g. sample_no"],
                ["receivedAtColumn", "Received at column", "e.g. received_time"],
                ["resultAtColumn", "Result at column", "e.g. result_time"],
                ["sectionColumn", "Section column", "e.g. section_name"],
                ["testNameColumn", "Test name column", "e.g. test_name"],
                [
                  "externalRefColumn",
                  "External reference column (optional)",
                  "e.g. invoice_no — maps to external_ref, not patient id",
                ],
              ] as const
            ).map(([key, label, ph]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{label}</label>
                <input
                  value={mapping[key]}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder={ph}
                  disabled={loading}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onTest}
            disabled={testing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : null}
            Test connection
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--module-primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {connection?.id && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Sync</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Last synced: {connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : "—"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Enable sync</span>
                <button
                  type="button"
                  disabled={toggling}
                  onClick={() => onToggleActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    isActive ? "bg-[var(--module-primary)]" : "bg-slate-200"
                  } ${toggling ? "opacity-50" : ""}`}
                  aria-pressed={isActive}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      isActive ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <button
                type="button"
                onClick={onSync}
                disabled={syncing || !isActive || loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Sync now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Sync log (last 10)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Upserted</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No sync runs yet.
                  </td>
                </tr>
              ) : (
                syncLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3 text-slate-800 whitespace-nowrap">
                      {log.started_at ? new Date(log.started_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{log.records_upserted ?? "—"}</td>
                    <td className="px-4 py-3 max-w-[220px]">
                      {log.error ? (
                        <span className="text-red-600 text-xs line-clamp-2" title={log.error}>
                          {log.error}
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs">OK</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 max-w-md ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <div className="inline-flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            {toast.message}
          </div>
          <button type="button" onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
