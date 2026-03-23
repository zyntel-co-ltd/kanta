"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import {
  ShieldCheck, AlertTriangle, BarChart3, TestTube, Calculator,
  TrendingUp, Settings2, Wifi, WifiOff, RefreshCw, ClipboardList,
  Download, Copy, Check, Plus, FlaskConical, Activity,
  ChevronDown, ChevronUp, X as XIcon,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from "recharts";

/* ─────────────────── Theme constants ─────────────────── */
const inputCls =
  "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 " +
  "focus:border-emerald-400 transition-all text-sm";
const selectCls =
  "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-sm";
const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 " +
  "text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const btnSecondary =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 " +
  "text-slate-700 text-sm font-semibold transition-all";
const tblHead = "px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider";
const tblCell = "px-4 py-3 text-sm text-slate-700 whitespace-nowrap";

/* ─────────────────── Lab-hub URL key ─────────────────── */
const LAB_HUB_URL_KEY = "kanta-lab-hub-url";

/* ─────────────────── Date / CSV helpers ─────────────────── */
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString(); } catch { return d ?? "—"; } };
const fmtShort = (d: string) => {
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; }
};

function downloadCSV(rows: (string | number | null | undefined)[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ─────────────────── Types ─────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QcItem = Record<string, any>;
type ConfirmState = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  variant?: "danger" | "warning" | "success";
  onConfirm: (() => void) | null;
};
const closedConfirm: ConfirmState = { open: false, title: "", message: "", confirmLabel: "Confirm", onConfirm: null };

/* ─────────────────── Westgard rule application ─────────────────── */
function applyWestgard(data: QcItem[], mean: number, sd: number): QcItem[] {
  const ann: QcItem[] = data.map((d) => ({ ...d, _status: "normal" as string }));
  for (let i = 0; i < ann.length; i++) {
    const v = Number(ann[i].value);
    const diff = Math.abs(v - mean);
    if (diff > 2 * sd && diff <= 3 * sd) ann[i]._status = "warning";
    if (diff > 3 * sd) ann[i]._status = "failure";
    if (i > 0) {
      const pv = Number(ann[i - 1].value);
      const pd = pv - mean, cd = v - mean;
      if (Math.abs(pd) > 2 * sd && Math.sign(pd) === Math.sign(cd) && Math.abs(cd) > 2 * sd) {
        ann[i - 1]._status = "failure"; ann[i]._status = "failure";
      }
      if ((v > mean + 2 * sd && pv < mean - 2 * sd) || (v < mean - 2 * sd && pv > mean + 2 * sd)) {
        ann[i - 1]._status = "failure"; ann[i]._status = "failure";
      }
    }
  }
  return ann;
}

/* ─────────────────── Lab-hub API factory ─────────────────── */
function makeApi(labHubUrl: string) {
  const getHeaders = () => {
    const token = (() => { try { return localStorage.getItem("token") ?? ""; } catch { return ""; } })();
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };
  return {
    getItems: () => fetch(`${labHubUrl}/api/GetItems`, { headers: getHeaders() }).then((r) => r.json()),
    postItem: (data: QcItem) => fetch(`${labHubUrl}/api/PostItems`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) }).then((r) => r.json()),
    putItem:  (data: QcItem) => fetch(`${labHubUrl}/api/PutItem`,   { method: "PUT",  headers: getHeaders(), body: JSON.stringify(data) }).then((r) => r.json()),
    deleteItem: (id: string) => fetch(`${labHubUrl}/api/DeleteItem?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: getHeaders() }).then((r) => r.json()),
  };
}

/* ─────────────────── ConfirmModal ─────────────────── */
function ConfirmModal({ open, title, message, confirmLabel, variant = "danger", onConfirm, onCancel }: ConfirmState & { onCancel: () => void }) {
  if (!open) return null;
  const cls =
    variant === "danger"  ? "bg-red-600 hover:bg-red-700" :
    variant === "warning" ? "bg-amber-500 hover:bg-amber-600" :
    "bg-emerald-600 hover:bg-emerald-700";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-900 mb-2 text-base">{title}</h3>
        <div className="text-sm text-slate-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={() => onConfirm?.()} className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${cls}`}>{confirmLabel}</button>
          <button onClick={onCancel} className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── SectionHead ─────────────────── */
function SectionHead({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-emerald-600" />
      </div>
      <h3 className="font-semibold text-slate-800" style={{ fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{title}</h3>
    </div>
  );
}

/* ─────────────────── PassBadge ─────────────────── */
function PassBadge({ pass }: { pass: boolean }) {
  return pass
    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Pass</span>
    : <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Fail</span>;
}

/* ─────────────────── Tabs ─────────────────── */
type Tab = "config" | "data" | "visual" | "calc" | "stats" | "qual-config" | "qual-entry" | "qual-log";
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "config",      label: "QC Config",     icon: ShieldCheck   },
  { id: "data",        label: "Data Entry",    icon: ClipboardList },
  { id: "visual",      label: "Visualization", icon: BarChart3     },
  { id: "calc",        label: "QC Calculator", icon: Calculator    },
  { id: "stats",       label: "QC Stats",      icon: TrendingUp    },
  { id: "qual-config", label: "Qual. Config",  icon: FlaskConical  },
  { id: "qual-entry",  label: "Qual. Entry",   icon: TestTube      },
  { id: "qual-log",    label: "Qual. Log",     icon: Activity      },
];

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                  */
/* ═══════════════════════════════════════════════════════════ */
export default function QCPage() {
  const [activeTab, setActiveTab] = useState<Tab>("config");
  const [labHubUrl, setLabHubUrl] = useState<string>(() => {
    try { return localStorage.getItem(LAB_HUB_URL_KEY) ?? "http://localhost:8000"; } catch { return "http://localhost:8000"; }
  });
  const [urlInput, setUrlInput]     = useState(labHubUrl);
  const [connected, setConnected]   = useState<boolean | null>(null);
  const [checking, setChecking]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const checkConnection = useCallback(async (url = labHubUrl) => {
    setChecking(true);
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(4000) });
      setConnected(res.ok);
    } catch { setConnected(false); }
    finally { setChecking(false); }
  }, [labHubUrl]);

  const saveUrl = async () => {
    const trimmed = urlInput.replace(/\/$/, "");
    setLabHubUrl(trimmed);
    try { localStorage.setItem(LAB_HUB_URL_KEY, trimmed); } catch {}
    setShowSettings(false);
    await checkConnection(trimmed);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { checkConnection(); }, []);

  return (
    <div className="max-w-[1280px] space-y-5">

      {/* Page header */}
      <div className="animate-slide-up">
        <p className="text-eyebrow mb-1">Quality Management</p>
        <h1 className="text-slate-900" style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
          Quality Control Management
        </h1>
        <p className="text-slate-500 mt-0.5 text-sm">
          QC configuration, data entry, Levey-Jennings visualization, statistics and qualitative QC.
        </p>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1" style={{ fontSize: "1.0625rem", letterSpacing: "-0.02em" }}>Lab-hub Connection</h3>
            <p className="text-sm text-slate-500 mb-4">
              Enter the base URL of your Lab-hub server (e.g.{" "}
              <code className="bg-slate-100 px-1 rounded text-xs">http://192.168.1.10:8000</code>)
            </p>
            <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={inputCls + " mb-4"} placeholder="http://localhost:8000" />
            <div className="flex gap-3">
              <button onClick={saveUrl} className={btnPrimary + " flex-1 justify-center"}>Save &amp; Connect</button>
              <button onClick={() => setShowSettings(false)} className={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Connection banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
        connected === false ? "bg-red-50 border border-red-100 text-red-700"
        : connected === true ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
        : "bg-amber-50 border border-amber-100 text-amber-700"
      }`}>
        {checking ? <RefreshCw size={15} className="animate-spin" />
          : connected === false ? <WifiOff size={15} />
          : <Wifi size={15} />}
        <span className="flex-1">
          {checking ? "Checking Lab-hub connection…"
            : connected === false ? `Cannot reach Lab-hub at ${labHubUrl}`
            : connected === true ? `Connected · ${labHubUrl}`
            : "Connecting…"}
        </span>
        <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all">
          <Settings2 size={12} /> Configure
        </button>
        <button onClick={() => checkConnection()} disabled={checking} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all disabled:opacity-50">
          <RefreshCw size={12} className={checking ? "animate-spin" : ""} /> Retry
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto animate-slide-up">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all ${
              activeTab === id
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === "config"      && <QCConfigTab      labHubUrl={labHubUrl} />}
        {activeTab === "data"        && <QCDataEntryTab   labHubUrl={labHubUrl} />}
        {activeTab === "visual"      && <QCVisualizationTab labHubUrl={labHubUrl} />}
        {activeTab === "calc"        && <QCCalculatorTab />}
        {activeTab === "stats"       && <QCStatsTab       labHubUrl={labHubUrl} />}
        {activeTab === "qual-config" && <QualConfigTab    labHubUrl={labHubUrl} />}
        {activeTab === "qual-entry"  && <QualEntryTab     labHubUrl={labHubUrl} />}
        {activeTab === "qual-log"    && <QualLogTab       labHubUrl={labHubUrl} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC CONFIG TAB  (Lab-hub QCConfig.js)                      */
/* ═══════════════════════════════════════════════════════════ */
function QCConfigTab({ labHubUrl }: { labHubUrl: string }) {
  const api = useMemo(() => makeApi(labHubUrl), [labHubUrl]);
  const [qcConfigs, setQcConfigs]   = useState<QcItem[]>([]);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [confirm, setConfirm]       = useState<ConfirmState>(closedConfirm);
  const [form, setForm] = useState({ qcName: "", level: "", lotNumber: "", expiryDate: "", mean: "", sd: "", units: "μmol/L" });

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true); setError("");
    try {
      const data = await api.getItems();
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      setQcConfigs(items.filter((item: QcItem) => item.qcName && item.mean != null && item.sd != null));
    } catch (e) { setError(`Error fetching QC configs: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  }, [api]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const resetForm = () => {
    setForm({ qcName: "", level: "", lotNumber: "", expiryDate: "", mean: "", sd: "", units: "μmol/L" });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setIsLoading(true);
    if (!form.qcName.trim() || form.level === "" || form.mean === "" || form.sd === "") {
      alert("Please fill all required fields: QC Name, Level, Mean, and SD.");
      setIsLoading(false); return;
    }
    const payload: QcItem = {
      id: editingId || String(Date.now()),
      qcName: form.qcName.trim(), level: Number(form.level),
      lotNumber: form.lotNumber, expiryDate: form.expiryDate,
      mean: parseFloat(form.mean), sd: parseFloat(form.sd), units: form.units,
    };
    try {
      if (editingId) await api.putItem(payload); else await api.postItem(payload);
      setSuccess(`QC configuration ${editingId ? "updated" : "saved"} successfully!`);
      fetchConfigs(); resetForm();
    } catch (e) { setError(`Error saving QC config: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleEdit = (config: QcItem) => {
    setForm({ qcName: config.qcName, level: String(config.level), lotNumber: config.lotNumber || "", expiryDate: config.expiryDate || "", mean: String(config.mean), sd: String(config.sd), units: config.units || "μmol/L" });
    setEditingId(String(config.id));
  };

  const handleToggleEnabled = (config: QcItem) => {
    const newEnabled = !(config.enabled !== false);
    setConfirm({
      open: true,
      title: newEnabled ? "Enable QC Config?" : "Disable QC Config?",
      message: <>{newEnabled ? "Enable" : "Disable"} <strong>{config.qcName} Level {config.level}</strong>{newEnabled ? " for data entry?" : "? It will no longer appear in QC Data Entry."}</>,
      confirmLabel: newEnabled ? "Enable" : "Disable",
      variant: "warning",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.putItem({ ...config, enabled: newEnabled });
          setSuccess(`QC config ${newEnabled ? "enabled" : "disabled"} successfully.`); fetchConfigs();
        } catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  const handleDelete = (config: QcItem) => {
    setConfirm({
      open: true, title: "Delete QC Config?",
      message: <>Are you sure you want to delete <strong>{config.qcName} Level {config.level}</strong>? Existing QC entries will remain but may show incomplete data.</>,
      confirmLabel: "Delete Config", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.deleteItem(String(config.id));
          setSuccess("QC configuration deleted successfully!"); fetchConfigs();
          if (editingId === String(config.id)) resetForm();
        } catch (e) { setError(`Error deleting QC config: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  return (
    <div className="space-y-6">
      {isLoading && <div className="flex items-center gap-2 text-emerald-600 text-sm"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>}
      {error   && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-medium">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-medium">{success}</div>}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <SectionHead icon={ShieldCheck} title="QC Configuration Manager" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">QC Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.qcName} onChange={(e) => setForm({ ...form, qcName: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Level <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Lot Number</label>
              <input type="text" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Mean <span className="text-red-500">*</span></label>
              <input type="number" step="any" value={form.mean} onChange={(e) => setForm({ ...form, mean: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Standard Deviation (SD) <span className="text-red-500">*</span></label>
              <input type="number" step="any" value={form.sd} onChange={(e) => setForm({ ...form, sd: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Units of Measure</label>
              <select value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} className={selectCls}>
                <option value="μmol/L">μmol/L</option>
                <option value="IU/mL">IU/mL</option>
                <option value="g/dL">g/dL</option>
                <option value="mg/dL">mg/dL</option>
                <option value="mmol/L">mmol/L</option>
                <option value="U/L">U/L</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isLoading} className={btnPrimary}>{editingId ? "Update QC Config" : "Save QC Config"}</button>
            <button type="button" onClick={resetForm} className={btnSecondary}>Clear Form</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={BarChart3} title="Existing QC Configurations" />
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["QC Name", "Level", "Units", "Lot Number", "Expiry Date", "Mean", "SD", "Status", "Actions"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {qcConfigs.filter((qc) => qc.qcName?.trim()).length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No QC configurations found.</td></tr>
              ) : qcConfigs.filter((qc) => qc.qcName?.trim()).map((config) => (
                <tr key={config.id} className="hover:bg-slate-50 transition-colors">
                  <td className={tblCell + " font-semibold text-slate-800"}>{config.qcName}</td>
                  <td className={tblCell}>{config.level}</td>
                  <td className={tblCell}>{config.units || "μmol/L"}</td>
                  <td className={tblCell}>{config.lotNumber || "—"}</td>
                  <td className={tblCell}>{config.expiryDate || "—"}</td>
                  <td className={tblCell + " font-mono"}>{config.mean}</td>
                  <td className={tblCell + " font-mono"}>{config.sd}</td>
                  <td className={tblCell}>
                    {config.enabled !== false
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Enabled</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Disabled</span>}
                  </td>
                  <td className={tblCell}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleEdit(config)} className="text-emerald-600 hover:text-emerald-800 font-semibold text-xs">Edit</button>
                      <button onClick={() => handleToggleEnabled(config)} className="text-amber-600 hover:text-amber-800 font-semibold text-xs">{config.enabled !== false ? "Disable" : "Enable"}</button>
                      <button onClick={() => handleDelete(config)} className="text-red-600 hover:text-red-800 font-semibold text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC DATA ENTRY TAB  (Lab-hub QCDataEntry.js)               */
/* ═══════════════════════════════════════════════════════════ */
function QCDataEntryTab({ labHubUrl }: { labHubUrl: string }) {
  const api = useMemo(() => makeApi(labHubUrl), [labHubUrl]);
  const [allQcData, setAllQcData]           = useState<QcItem[]>([]);
  const [qcConfigs, setQcConfigs]           = useState<QcItem[]>([]);
  const [allQcConfigs, setAllQcConfigs]     = useState<QcItem[]>([]);
  const [allEntries, setAllEntries]         = useState<QcItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [qcValue, setQcValue]               = useState("");
  const [selectedDate, setSelectedDate]     = useState("");
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const [confirm, setConfirm]               = useState<ConfirmState>(closedConfirm);

  const fetchAllQcData = useCallback(async () => {
    try {
      const data = await api.getItems();
      setAllQcData(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) { setError(`Error fetching QC data: ${(e as Error).message}`); }
  }, [api]);

  useEffect(() => { fetchAllQcData(); }, [fetchAllQcData]);

  useEffect(() => {
    if (!allQcData.length) { setQcConfigs([]); setAllQcConfigs([]); setAllEntries([]); return; }
    const today = todayStr();
    const allConfigs = allQcData.filter((item) =>
      item.qcName && typeof item.qcName === "string" && item.qcName.trim() !== "" &&
      item.level != null && !isNaN(Number(item.level)) && item.mean != null && item.sd != null
    );
    const configs = allConfigs.filter((c) => {
      if (c.enabled === false) return false;
      if (c.expiryDate && c.expiryDate < today) return false;
      return true;
    });
    const entries = allQcData
      .filter((item) => item.qcConfigId && item.date && item.value != null && !isNaN(Number(item.value)))
      .sort((a, b) => a.date > b.date ? 1 : -1);
    setAllQcConfigs(allConfigs); setQcConfigs(configs); setAllEntries(entries);
  }, [allQcData]);

  const draftEntries = allEntries.filter((e) => e.qcConfigId === selectedConfigId && !e.submitted);
  const resetForm = () => { setQcValue(""); setSelectedDate(""); setEditingId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setIsLoading(true);
    if (!selectedConfigId || !selectedDate || !qcValue) { setError("Please fill all required fields."); setIsLoading(false); return; }
    const payload: QcItem = { id: editingId || String(Date.now()), qcConfigId: selectedConfigId, date: selectedDate, value: parseFloat(qcValue), submitted: false };
    try {
      if (editingId) await api.putItem(payload); else await api.postItem(payload);
      setSuccess(`Entry ${editingId ? "updated" : "saved"} successfully!`);
      resetForm(); fetchAllQcData();
    } catch (e) { setError(`Error saving QC entry: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleLock = async (id: string) => {
    const entry = allEntries.find((e) => e.id === id);
    if (!entry) return;
    setIsLoading(true);
    try {
      await api.putItem({ ...entry, submitted: true });
      setSuccess("Entry submitted (locked) successfully!"); fetchAllQcData();
    } catch (e) { setError(`Error submitting entry: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleDelete = (entry: QcItem) => {
    const config = allQcConfigs.find((c) => c.id === entry.qcConfigId);
    setConfirm({
      open: true, title: "Delete QC Entry?",
      message: <>Are you sure you want to delete this entry <strong>({config?.qcName} Level {config?.level}, {entry.date}, value: {entry.value})</strong>? This cannot be undone.</>,
      confirmLabel: "Delete", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.deleteItem(String(entry.id));
          setSuccess("Entry deleted successfully!"); fetchAllQcData();
          if (editingId === String(entry.id)) resetForm();
        } catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  return (
    <div className="space-y-6">
      {isLoading && <div className="flex items-center gap-2 text-emerald-600 text-sm"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>}
      {error   && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm">{success}</div>}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <SectionHead icon={ClipboardList} title="QC Data Entry" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Select QC Config</label>
              <select value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)} className={selectCls} required>
                <option value="">-- Choose QC --</option>
                {qcConfigs.map((qc) => <option key={qc.id} value={qc.id}>{qc.qcName} (Level {qc.level}){qc.lotNumber ? ` - Lot: ${qc.lotNumber}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Units of Measure</label>
              <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-100 font-semibold text-slate-700 text-sm min-h-[42px] flex items-center">
                {selectedConfigId ? (qcConfigs.find((c) => c.id === selectedConfigId)?.units || "μmol/L") : "—"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">QC Value</label>
              <input type="number" step="any" value={qcValue} onChange={(e) => setQcValue(e.target.value)} className={inputCls} required />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className={btnPrimary}>{editingId ? "Update Entry" : "Save Entry"}</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={ClipboardList} title="Draft Entries" />
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["QC Name", "Level", "Date", "Value", "Actions"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {draftEntries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No draft entries to show.</td></tr>
              ) : draftEntries.map((entry) => {
                const config = allQcConfigs.find((c) => c.id === entry.qcConfigId);
                return (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className={tblCell + " font-semibold text-slate-800"}>{config?.qcName || "N/A"}</td>
                    <td className={tblCell}>{config?.level ?? "N/A"}</td>
                    <td className={tblCell + " font-semibold"}>{entry.date}</td>
                    <td className={tblCell}>{entry.value}</td>
                    <td className={tblCell}>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditingId(String(entry.id)); setSelectedConfigId(entry.qcConfigId); setSelectedDate(entry.date); setQcValue(String(entry.value)); }} className="text-emerald-600 hover:text-emerald-800 font-semibold text-xs">Edit</button>
                        <button onClick={() => handleDelete(entry)} className="text-red-600 hover:text-red-800 font-semibold text-xs">Delete</button>
                        <button onClick={() => handleLock(String(entry.id))} className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs">Submit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC VISUALIZATION TAB  (Lab-hub QCVisualization.js)        */
/* ═══════════════════════════════════════════════════════════ */
function QCVisualizationTab({ labHubUrl }: { labHubUrl: string }) {
  const api = useMemo(() => makeApi(labHubUrl), [labHubUrl]);
  const [qcConfigs, setQcConfigs]           = useState<QcItem[]>([]);
  const [allEntries, setAllEntries]         = useState<QcItem[]>([]);
  const [selectedConfigId, setSelectedConfigId]   = useState("");
  const [selectedConfigId2, setSelectedConfigId2] = useState("");
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; });
  const [toDate, setToDate]     = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getItems();
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      setQcConfigs(items.filter((item: QcItem) => item.qcName && item.level != null && item.mean != null && item.sd != null));
      setAllEntries(items.filter((item: QcItem) => item.qcConfigId && item.date && item.value != null).sort((a: QcItem, b: QcItem) => a.date > b.date ? 1 : -1));
    } catch {}
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filterEntries = (configId: string) => {
    let entries = allEntries.filter((e) => e.qcConfigId === configId && e.submitted === true);
    if (fromDate) entries = entries.filter((e) => e.date >= fromDate);
    if (toDate)   entries = entries.filter((e) => e.date <= toDate);
    return entries;
  };

  const selectedConfig  = qcConfigs.find((c) => c.id === selectedConfigId);
  const selectedConfig2 = qcConfigs.find((c) => c.id === selectedConfigId2);
  const filtered1 = filterEntries(selectedConfigId);
  const filtered2 = filterEntries(selectedConfigId2);
  const analyzed1 = selectedConfig  && filtered1.length > 0 ? applyWestgard(filtered1.map((e)  => ({ ...e, name: fmtShort(e.date) })), Number(selectedConfig.mean),  Number(selectedConfig.sd))  : [];
  const analyzed2 = selectedConfig2 && filtered2.length > 0 ? applyWestgard(filtered2.map((e) => ({ ...e, name: fmtShort(e.date) })), Number(selectedConfig2.mean), Number(selectedConfig2.sd)) : [];

  const renderGraph = (config: QcItem, data: QcItem[], compact = false) => {
    const mean = Number(config.mean), sd = Number(config.sd);
    const yLabel = `${config.qcName} Level ${config.level} (${config.units || "μmol/L"})`;
    return (
      <div key={config.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="text-center border-b border-slate-100 pb-4 mb-4">
          <h3 className={`font-bold text-slate-800 uppercase tracking-wide ${compact ? "text-sm" : "text-base"}`}>IOM UGANDA QUALITY CONTROL GRAPH</h3>
          <h4 className={`font-bold text-slate-900 mt-1 ${compact ? "text-lg" : "text-2xl"}`}>{config.qcName} Level {config.level}</h4>
          {config.lotNumber && <p className="text-slate-500 text-xs mt-0.5">Control Lot: {config.lotNumber}</p>}
          {(fromDate || toDate) && (
            <p className="text-slate-400 text-xs mt-0.5">
              {fromDate && toDate ? `${fmtDate(fromDate)} – ${fmtDate(toDate)}` : fromDate ? `From ${fmtDate(fromDate)}` : `To ${fmtDate(toDate)}`}
            </p>
          )}
        </div>
        <ResponsiveContainer width="100%" height={compact ? 260 : 380}>
          <LineChart data={data} margin={{ left: 80, right: 80, top: 10, bottom: 40 }}>
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} padding={{ left: 10, right: 10 }} />
            <YAxis
              domain={[mean - 3 * sd, mean + 3 * sd]}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => v.toFixed(2)}
              label={{ value: yLabel, angle: -90, position: "insideLeft", offset: -65, style: { fill: "#475569", fontSize: 11, fontWeight: 600 } }}
            />
            <Tooltip contentStyle={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
            <Line type="linear" dataKey="value" stroke="#0f172a" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line
              type="monotone" dataKey="value" stroke="transparent"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={(props: any) => (
                <circle
                  key={`dot-${props.index}`}
                  cx={props.cx} cy={props.cy} r={5}
                  fill={props.payload._status === "failure" ? "#dc2626" : props.payload._status === "warning" ? "#f59e0b" : "#16a34a"}
                  stroke="#0f172a" strokeWidth={1}
                />
              )}
              isAnimationActive={false}
            />
            <ReferenceLine y={mean}          stroke="#0f172a" strokeWidth={1.5} strokeDasharray="4 4" />
            <ReferenceLine y={mean + sd}     stroke="#16a34a" strokeWidth={1}   strokeDasharray="3 3" />
            <ReferenceLine y={mean - sd}     stroke="#16a34a" strokeWidth={1}   strokeDasharray="3 3" />
            <ReferenceLine y={mean + 2 * sd} stroke="#f59e0b" strokeWidth={1}   strokeDasharray="3 3" />
            <ReferenceLine y={mean - 2 * sd} stroke="#f59e0b" strokeWidth={1}   strokeDasharray="3 3" />
            <ReferenceLine y={mean + 3 * sd} stroke="#ef4444" strokeWidth={1.5} />
            <ReferenceLine y={mean - 3 * sd} stroke="#ef4444" strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 justify-center">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Normal</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 1₂s Warning</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Westgard Violation</span>
        </div>
      </div>
    );
  };

  const hasBoth = !!(selectedConfigId && selectedConfigId2 && analyzed1.length > 0 && analyzed2.length > 0);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={BarChart3} title="Visualization" />
        <div className="flex flex-wrap gap-3">
          <select value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
            <option value="">Select QC Config 1</option>
            {qcConfigs.map((qc) => <option key={qc.id} value={qc.id}>{qc.qcName} (Level {qc.level}){qc.lotNumber ? ` - Lot: ${qc.lotNumber}` : ""}</option>)}
          </select>
          <select value={selectedConfigId2} onChange={(e) => setSelectedConfigId2(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
            <option value="">+ Add 2nd graph (optional)</option>
            {qcConfigs.filter((qc) => qc.id !== selectedConfigId).map((qc) => <option key={qc.id} value={qc.id}>{qc.qcName} (Level {qc.level}){qc.lotNumber ? ` - Lot: ${qc.lotNumber}` : ""}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          <input type="date" value={toDate}   onChange={(e) => setToDate(e.target.value)}   className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
        </div>
      </div>

      {((selectedConfig && analyzed1.length > 0) || (selectedConfig2 && analyzed2.length > 0)) ? (
        <div className="space-y-5">
          {selectedConfig  && analyzed1.length > 0 && renderGraph(selectedConfig,  analyzed1, hasBoth)}
          {selectedConfig2 && analyzed2.length > 0 && renderGraph(selectedConfig2, analyzed2, hasBoth)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
          {(selectedConfigId || selectedConfigId2)
            ? "No submitted entries found for the selected configuration(s) and date range."
            : "Select a QC configuration and date range to view the Levey-Jennings chart."}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC CALCULATOR TAB  (Lab-hub QCCalculator.js)              */
/* ═══════════════════════════════════════════════════════════ */
function QCCalculatorTab() {
  const [inputs, setInputs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("kanta-qc-calc-inputs") ?? "null") || Array(25).fill(""); } catch { return Array(25).fill(""); }
  });
  const [mean, setMean] = useState<number | null>(() => {
    try { return JSON.parse(localStorage.getItem("kanta-qc-calc-mean-sd") ?? "null")?.mean ?? null; } catch { return null; }
  });
  const [sd, setSD] = useState<number | null>(() => {
    try { return JSON.parse(localStorage.getItem("kanta-qc-calc-mean-sd") ?? "null")?.sd ?? null; } catch { return null; }
  });
  const [error, setError]   = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { try { localStorage.setItem("kanta-qc-calc-inputs", JSON.stringify(inputs)); } catch {} }, [inputs]);
  useEffect(() => { try { localStorage.setItem("kanta-qc-calc-mean-sd", JSON.stringify({ mean, sd })); } catch {} }, [mean, sd]);

  const handleChange = (idx: number, val: string) => {
    const next = [...inputs]; next[idx] = val.replace(/[^0-9.-]/g, ""); setInputs(next);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setCopied(false);
    const values = inputs.map(Number);
    if (values.some(isNaN)) { setError("Please enter a valid number in every field."); setMean(null); setSD(null); return; }
    const m = values.reduce((a, v) => a + v, 0) / values.length;
    const s = Math.sqrt(values.reduce((a, v) => a + Math.pow(v - m, 2), 0) / values.length);
    setMean(m); setSD(s);
  };

  const handleReset = () => {
    setInputs(Array(25).fill("")); setMean(null); setSD(null); setError(""); setCopied(false);
    try { localStorage.removeItem("kanta-qc-calc-inputs"); localStorage.removeItem("kanta-qc-calc-mean-sd"); } catch {}
  };

  const handleCopy = () => {
    if (mean != null && sd != null) {
      navigator.clipboard.writeText(`Mean: ${mean}\nSD: ${sd}`);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <SectionHead icon={Calculator} title="QC Mean & SD Calculator" />
        <p className="text-sm text-slate-500 mb-5">Enter up to 25 QC run values to calculate the Mean and Standard Deviation for a new control lot.</p>
        <form onSubmit={handleCalculate} className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {inputs.map((val, idx) => (
              <input key={idx} type="number" step="any" value={val} onChange={(e) => handleChange(idx, e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                placeholder={`Value ${idx + 1}`} required />
            ))}
          </div>
          {error && <p className="text-sm text-red-600 font-medium text-center">{error}</p>}
          <div className="flex flex-wrap gap-3 justify-center">
            <button type="submit" className={btnPrimary}><Calculator size={14} /> Calculate</button>
            <button type="button" onClick={handleReset} className={btnSecondary}>Reset</button>
            <button type="button" onClick={handleCopy} disabled={mean == null} className={btnSecondary + " disabled:opacity-50"}>
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Results</>}
            </button>
          </div>
        </form>
      </div>

      {mean != null && sd != null && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
          <h3 className="font-semibold text-emerald-800 mb-4">Results</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-emerald-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">Mean</p>
              <p className="text-2xl font-bold text-emerald-700" style={{ letterSpacing: "-0.03em" }}>{mean.toFixed(4)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-emerald-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">Std Deviation</p>
              <p className="text-2xl font-bold text-emerald-700" style={{ letterSpacing: "-0.03em" }}>{sd.toFixed(4)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-emerald-700">
            <p>±1 SD: <strong>{(mean - sd).toFixed(3)}</strong> – <strong>{(mean + sd).toFixed(3)}</strong></p>
            <p>±2 SD: <strong>{(mean - 2 * sd).toFixed(3)}</strong> – <strong>{(mean + 2 * sd).toFixed(3)}</strong></p>
            <p>±3 SD: <strong>{(mean - 3 * sd).toFixed(3)}</strong> – <strong>{(mean + 3 * sd).toFixed(3)}</strong></p>
            <p>CV%: <strong>{((sd / mean) * 100).toFixed(2)}%</strong></p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC STATS TAB  (Lab-hub QCStats.js)                        */
/* ═══════════════════════════════════════════════════════════ */
function QCStatsTab({ labHubUrl }: { labHubUrl: string }) {
  const api = useMemo(() => makeApi(labHubUrl), [labHubUrl]);
  const [qcConfigs, setQcConfigs]       = useState<QcItem[]>([]);
  const [qcData, setQcData]             = useState<QcItem[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [startDate, setStartDate]       = useState("");
  const [endDate, setEndDate]           = useState("");
  const [error, setError]               = useState("");
  const [confirm, setConfirm]           = useState<ConfirmState>(closedConfirm);
  const [resolvingId, setResolvingId]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getItems();
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      setQcConfigs(items.filter((item: QcItem) => item.mean != null && item.sd != null && item.qcName?.trim()));
      setQcData(items.filter((item: QcItem) => item.qcConfigId != null && item.value != null && item.date != null));
    } catch (e) { setError(`Error fetching QC data: ${(e as Error).message}`); }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedConfigObj = qcConfigs.find((c) => c.id === selectedConfig);
  const filteredData = useMemo(() => {
    if (!selectedConfig || !qcData.length || !selectedConfigObj) return [];
    let filtered = qcData.filter((item) => item.qcConfigId === selectedConfigObj.id && item.submitted === true);
    if (startDate) filtered = filtered.filter((item) => item.date >= startDate);
    if (endDate)   filtered = filtered.filter((item) => item.date <= endDate);
    return filtered.sort((a, b) => a.date < b.date ? 1 : -1);
  }, [selectedConfig, startDate, endDate, qcData, selectedConfigObj]);

  const statistics = useMemo(() => {
    const values = filteredData.map((item) => parseFloat(item.value)).filter((v) => !isNaN(v));
    if (!values.length) return null;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sd = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    return { count: values.length, mean: mean.toFixed(3), sd: sd.toFixed(3), min: Math.min(...values).toFixed(3), max: Math.max(...values).toFixed(3) };
  }, [filteredData]);

  const handleDelete = (item: QcItem) => {
    setConfirm({
      open: true, title: "Delete QC Entry?",
      message: <>Are you sure you want to delete this QC entry <strong>({item.date}, value: {item.value})</strong>? This cannot be undone.</>,
      confirmLabel: "Delete", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try { await api.deleteItem(String(item.id)); fetchData(); }
        catch (e) { setError(`Error deleting: ${(e as Error).message}`); }
      },
    });
  };

  const handleMarkResolved = (item: QcItem) => {
    setConfirm({
      open: true, title: "Mark as Resolved?",
      message: <>Mark this QC failure <strong>({item.date}, value: {item.value})</strong> as resolved? The alert will be cleared.</>,
      confirmLabel: "Mark Resolved", variant: "success",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setResolvingId(String(item.id));
        try { await api.putItem({ ...item, resolved: true }); fetchData(); }
        catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setResolvingId(null); }
      },
    });
  };

  const handleExportCSV = () => {
    if (!selectedConfig || !filteredData.length) return;
    const configLabel = selectedConfigObj ? `${selectedConfigObj.qcName} Level ${selectedConfigObj.level}` : selectedConfig;
    const rows: (string | number | null)[][] = [
      ["QC Statistics Export"], ["Configuration", configLabel],
      ["Date Range", startDate && endDate ? `${startDate} to ${endDate}` : "All"],
      [], ["Date", "QC Name", "Level", "Value", "Lot Number", "Date Entered"],
    ];
    filteredData.forEach((item) => {
      const config = qcConfigs.find((c) => c.id === item.qcConfigId);
      rows.push([item.date, config?.qcName ?? "—", config?.level ?? "—", item.value, config?.lotNumber ?? "—", item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"]);
    });
    downloadCSV(rows, `QC_Statistics_${configLabel.replace(/\s+/g, "_")}_${todayStr()}.csv`);
  };

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <SectionHead icon={TrendingUp} title="Filter Options" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Select QC Configuration</label>
            <select value={selectedConfig} onChange={(e) => setSelectedConfig(e.target.value)} className={selectCls}>
              <option value="">-- Select Configuration --</option>
              {qcConfigs.map((config) => <option key={config.id} value={config.id}>{config.qcName} - Level {config.level}{config.lotNumber ? ` - Lot: ${config.lotNumber}` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {statistics && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-emerald-800 mb-4 uppercase tracking-wider">Statistics Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total Values", value: statistics.count },
              { label: "Mean",         value: statistics.mean  },
              { label: "Std Dev",      value: statistics.sd    },
              { label: "Minimum",      value: statistics.min   },
              { label: "Maximum",      value: statistics.max   },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-emerald-700">{value}</div>
                <div className="text-xs text-emerald-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHead icon={ClipboardList} title="QC Values (Submitted Only)" />
          <button onClick={handleExportCSV} disabled={!selectedConfig || !filteredData.length} className={btnSecondary + " disabled:opacity-40"}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        {filteredData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            {selectedConfig ? "No submitted QC values found for the selected configuration and date range." : "Please select a QC configuration to view statistics."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Date", "QC Name", "Level", "Value", "Lot Number", "Date Entered", "Resolve", ""].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item, idx) => {
                  const config = qcConfigs.find((c) => c.id === item.qcConfigId);
                  const isFailure = selectedConfigObj && Math.abs(Number(item.value) - Number(selectedConfigObj.mean)) > 2 * Number(selectedConfigObj.sd);
                  return (
                    <tr key={item.id ?? idx} className="hover:bg-slate-50 transition-colors">
                      <td className={tblCell}>{fmtDate(item.date)}</td>
                      <td className={tblCell + " font-semibold text-slate-800"}>{config?.qcName ?? "—"}</td>
                      <td className={tblCell}>{config?.level ?? "—"}</td>
                      <td className={tblCell + " font-mono font-bold text-emerald-700"}>{item.value}</td>
                      <td className={tblCell}>{config?.lotNumber ?? "—"}</td>
                      <td className={tblCell + " text-slate-500"}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</td>
                      <td className={tblCell}>
                        {isFailure && !item.resolved ? (
                          <button onClick={() => handleMarkResolved(item)} disabled={resolvingId === String(item.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold disabled:opacity-60">
                            {resolvingId === String(item.id) ? "Resolving…" : "Mark Resolved"}
                          </button>
                        ) : item.resolved ? (
                          <span className="text-xs text-emerald-600 font-semibold">Resolved</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={tblCell}>
                        <button onClick={() => handleDelete(item)} className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QUALITATIVE QC CONFIG TAB  (Lab-hub QualitativeQCConfig)  */
/* ═══════════════════════════════════════════════════════════ */
const RESULT_TYPES = ["Reactive / Non-Reactive", "Positive / Negative", "Detected / Not Detected", "Pass / Fail"];
const FREQUENCIES  = ["Daily", "Weekly", "Per Batch"];
const LEVEL_OPTIONS = ["Positive Control", "Negative Control"];

function getExpectedOptions(resultType: string) {
  if (!resultType) return ["Reactive", "Non-Reactive"];
  const parts = resultType.split(" / ");
  return [parts[0]?.trim() ?? "", parts[1]?.trim() ?? ""];
}

const blankQualForm = () => ({
  testName: "", resultType: RESULT_TYPES[0], lotNumber: "", manufacturer: "", expiryDate: "", frequency: "Daily",
  controls: [{ name: "", level: LEVEL_OPTIONS[0], expectedResult: "", notes: "" }],
});

function QualConfigTab({ labHubUrl }: { labHubUrl: string }) {
  const api = useMemo(() => makeApi(labHubUrl), [labHubUrl]);
  const [form, setForm]             = useState(blankQualForm());
  const [configs, setConfigs]       = useState<QcItem[]>([]);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [confirm, setConfirm]       = useState<ConfirmState>(closedConfirm);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getItems();
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      setConfigs(items.filter((item: QcItem) => item.qualitative === true && item.testName && !item.qualEntry));
    } catch (e) { setError(`Error fetching configs: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  }, [api]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const resetForm = () => { setForm(blankQualForm()); setEditingId(null); setError(""); setSuccess(""); };

  const updateControl = (idx: number, field: string, value: string) => {
    setForm({ ...form, controls: form.controls.map((c, i) => i === idx ? { ...c, [field]: value } : c) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!form.testName.trim()) { setError("Test Name is required."); return; }
    for (const c of form.controls) {
      if (!c.name.trim() || !c.expectedResult) { setError("Each control must have a name and an expected result."); return; }
    }
    setIsLoading(true);
    const payload: QcItem = {
      id: editingId || String(Date.now()), qualitative: true,
      testName: form.testName.trim(), resultType: form.resultType,
      lotNumber: form.lotNumber, manufacturer: form.manufacturer,
      expiryDate: form.expiryDate, frequency: form.frequency, controls: form.controls,
    };
    try {
      if (editingId) await api.putItem(payload); else await api.postItem(payload);
      setSuccess(`Configuration ${editingId ? "updated" : "saved"} successfully!`);
      fetchConfigs(); resetForm();
    } catch (e) { setError(`Error saving config: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleDelete = (config: QcItem) => {
    setConfirm({
      open: true, title: "Delete Qualitative QC Config?",
      message: <>Are you sure you want to delete <strong>{config.testName}</strong>? Existing QC run records will remain.</>,
      confirmLabel: "Delete Config", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.deleteItem(String(config.id)); setSuccess("Configuration deleted."); fetchConfigs();
          if (editingId === String(config.id)) resetForm();
        } catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  const expectedOptions = getExpectedOptions(form.resultType);

  return (
    <div className="space-y-6">
      {isLoading && <div className="flex items-center gap-2 text-emerald-600 text-sm"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>}
      {error   && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-6">
        <SectionHead icon={FlaskConical} title={`${editingId ? "Edit" : ""} Qualitative QC Configuration`} />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-2">Test Information <span className="flex-1 h-px bg-emerald-200 ml-2" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Test Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.testName} onChange={(e) => setForm({ ...form, testName: e.target.value })} placeholder="e.g. HIV Rapid Test" className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Result Type <span className="text-red-500">*</span></label>
              <select value={form.resultType} onChange={(e) => setForm({ ...form, resultType: e.target.value })} className={selectCls}>
                {RESULT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={selectCls}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Manufacturer / Kit Name</label>
              <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Determine™ HIV 1/2" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Lot Number</label>
              <input type="text" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="e.g. LOT-2025-HIV-04" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={inputCls} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-2">Control Levels &amp; Expected Results <span className="flex-1 h-px bg-emerald-200 ml-2" /></h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Control Name", "Level", "Expected Result", "Notes", ""].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {form.controls.map((ctrl, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><input type="text" value={ctrl.name} onChange={(e) => updateControl(idx, "name", e.target.value)} placeholder="e.g. Strong Positive Control" className={inputCls} required /></td>
                    <td className="px-4 py-3"><select value={ctrl.level} onChange={(e) => updateControl(idx, "level", e.target.value)} className={selectCls}>{LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}</select></td>
                    <td className="px-4 py-3"><select value={ctrl.expectedResult} onChange={(e) => updateControl(idx, "expectedResult", e.target.value)} className={selectCls} required><option value="">-- Select --</option>{expectedOptions.map((o) => <option key={o} value={o}>{o}</option>)}</select></td>
                    <td className="px-4 py-3"><input type="text" value={ctrl.notes} onChange={(e) => updateControl(idx, "notes", e.target.value)} placeholder="e.g. Strong band at C and T" className={inputCls} /></td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => { if (form.controls.length > 1) setForm({ ...form, controls: form.controls.filter((_, i) => i !== idx) }); }} disabled={form.controls.length === 1}
                        className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 disabled:opacity-30 transition-all">
                        <XIcon size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setForm({ ...form, controls: [...form.controls, { name: "", level: LEVEL_OPTIONS[0], expectedResult: "", notes: "" }] })}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 font-semibold text-sm hover:bg-emerald-50 transition">
            <Plus size={14} /> Add Control Level
          </button>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={isLoading} className={btnPrimary}>{editingId ? "Update Configuration" : "Save Configuration"}</button>
          <button type="button" onClick={resetForm} className={btnSecondary}>Clear Form</button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={FlaskConical} title="Existing Qualitative QC Configurations" />
        {configs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No qualitative QC configurations found. Create one above.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Test Name", "Result Type", "Controls", "Lot Number", "Expiry", "Frequency", "Actions"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {configs.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-slate-50 transition-colors">
                    <td className={tblCell + " font-semibold text-slate-800"}>{cfg.testName}</td>
                    <td className={tblCell}>{cfg.resultType}</td>
                    <td className={tblCell}><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{cfg.controls?.length || 0} control{cfg.controls?.length !== 1 ? "s" : ""}</span></td>
                    <td className={tblCell + " font-mono"}>{cfg.lotNumber || "—"}</td>
                    <td className={tblCell}>
                      {cfg.expiryDate ? (
                        <span className={new Date(cfg.expiryDate) < new Date() ? "text-red-600 font-semibold" : ""}>
                          {fmtDate(cfg.expiryDate)}{new Date(cfg.expiryDate) < new Date() ? " ⚠️" : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td className={tblCell}>{cfg.frequency}</td>
                    <td className={tblCell}>
                      <div className="flex gap-2">
                        <button onClick={() => { setForm({ testName: cfg.testName || "", resultType: cfg.resultType || RESULT_TYPES[0], lotNumber: cfg.lotNumber || "", manufacturer: cfg.manufacturer || "", expiryDate: cfg.expiryDate || "", frequency: cfg.frequency || "Daily", controls: cfg.controls?.length ? cfg.controls : [{ name: "", level: LEVEL_OPTIONS[0], expectedResult: "", notes: "" }] }); setEditingId(String(cfg.id)); }} className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold">Edit</button>
                        <button onClick={() => handleDelete(cfg)} className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QUALITATIVE QC ENTRY TAB  (Lab-hub QualitativeQCEntry)    */
/* ═══════════════════════════════════════════════════════════ */
const LEVEL_COLORS: Record<string, string> = {
  "High Positive":    "bg-pink-100 text-pink-800",
  "Low Positive":     "bg-purple-100 text-purple-700",
  "Positive Control": "bg-pink-100 text-pink-800",
  "Negative Control": "bg-emerald-100 text-emerald-700",
  "Negative":         "bg-emerald-100 text-emerald-700",
  "External Control": "bg-amber-100 text-amber-700",
};

function QualEntryTab({ labHubUrl }: { labHubUrl: string }) {
  const api = useMemo(() => makeApi(labHubUrl), [labHubUrl]);
  const [qualConfigs, setQualConfigs]         = useState<QcItem[]>([]);
  const [allEntries, setAllEntries]           = useState<QcItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [selectedDate, setSelectedDate]       = useState(todayStr());
  const [controlResults, setControlResults]   = useState<QcItem[]>([]);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState("");
  const [success, setSuccess]                 = useState("");
  const [confirm, setConfirm]                 = useState<ConfirmState>(closedConfirm);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getItems();
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      setQualConfigs(items.filter((item: QcItem) => item.qualitative === true && item.testName && !item.qualEntry));
      setAllEntries(items.filter((item: QcItem) => item.qualitative === true && item.qualEntry === true).sort((a: QcItem, b: QcItem) => a.date < b.date ? 1 : -1));
    } catch (e) { setError(`Error loading configurations: ${(e as Error).message}`); }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!selectedConfigId || editingId) return;
    const cfg = qualConfigs.find((c) => c.id === selectedConfigId);
    if (!cfg) return;
    setControlResults((cfg.controls || []).map((ctrl: QcItem) => ({
      controlName: ctrl.name, level: ctrl.level, expectedResult: ctrl.expectedResult, notes: ctrl.notes || "", observedResult: "",
    })));
    setCorrectiveAction("");
  }, [selectedConfigId, qualConfigs, editingId]);

  const selectedConfig = qualConfigs.find((c) => c.id === selectedConfigId);
  const resultOptions  = selectedConfig ? selectedConfig.resultType.split(" / ").map((s: string) => s.trim()) : [];
  const getStatus = (r: QcItem) => !r.observedResult ? "pending" : r.observedResult === r.expectedResult ? "pass" : "fail";
  const allFilled  = controlResults.length > 0 && controlResults.every((r) => r.observedResult);
  const anyFail    = controlResults.some((r) => getStatus(r) === "fail");
  const overallPass = allFilled && !anyFail;

  const resetForm = () => {
    setSelectedConfigId(""); setControlResults([]); setCorrectiveAction("");
    setSelectedDate(todayStr()); setEditingId(null); setError(""); setSuccess("");
  };

  const handleSave = async (submit: boolean) => {
    setError(""); setSuccess("");
    if (!selectedConfigId || !selectedDate) { setError("Please select a test configuration and date."); return; }
    if (submit && !allFilled) { setError("Please record observed results for all controls before submitting."); return; }
    if (submit && anyFail && !correctiveAction.trim()) { setError("A corrective action description is required when any control fails."); return; }
    setIsLoading(true);
    const payload: QcItem = {
      id: editingId || String(Date.now()), qualitative: true, qualEntry: true,
      qcConfigId: selectedConfigId, testName: selectedConfig?.testName || "",
      lotNumber: selectedConfig?.lotNumber || "", date: selectedDate,
      controlResults, overallPass: allFilled && !anyFail,
      correctiveAction: anyFail ? correctiveAction.trim() : "", submitted: submit,
    };
    try {
      if (editingId) await api.putItem(payload); else await api.postItem(payload);
      setSuccess(submit ? `QC Run submitted — Overall: ${overallPass ? "PASS" : "FAIL"}` : (editingId ? "Draft updated." : "Draft saved."));
      resetForm(); fetchData();
    } catch (e) { setError(`Error: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleSubmitDraft = async (entry: QcItem) => {
    if (!entry.controlResults?.every((r: QcItem) => r.observedResult)) { setError("Cannot submit: not all control results are filled in. Edit the draft first."); return; }
    setIsLoading(true);
    try { await api.putItem({ ...entry, submitted: true }); setSuccess("Draft submitted successfully."); fetchData(); }
    catch (e) { setError(`Error: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleDelete = (entry: QcItem) => {
    setConfirm({
      open: true, title: "Delete QC Run Draft?",
      message: <>Are you sure you want to delete this draft for <strong>{entry.testName}</strong> ({entry.date})? This cannot be undone.</>,
      confirmLabel: "Delete Draft", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.deleteItem(String(entry.id)); setSuccess("Draft deleted."); fetchData();
          if (editingId === String(entry.id)) resetForm();
        } catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  const draftEntries = allEntries.filter((e) => !e.submitted);

  return (
    <div className="space-y-6">
      {isLoading && <div className="flex items-center gap-2 text-emerald-600 text-sm"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>}
      {error   && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm">{success}</div>}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <SectionHead icon={TestTube} title={`Qualitative QC Data Entry${editingId ? " — Editing Draft" : ""}`} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Select Test <span className="text-red-500">*</span></label>
            <select value={selectedConfigId} onChange={(e) => { setSelectedConfigId(e.target.value); if (!editingId) setControlResults([]); }} className={selectCls} required>
              <option value="">-- Choose Test --</option>
              {qualConfigs.map((cfg) => <option key={cfg.id} value={cfg.id}>{cfg.testName}</option>)}
            </select>
            {qualConfigs.length === 0 && <p className="text-xs text-amber-600 mt-1">No tests configured. Add one in Qual. Config first.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Lot Number</label>
            <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-100 font-mono font-semibold text-slate-700 text-sm min-h-[42px] flex items-center">{selectedConfig?.lotNumber || "—"}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Date <span className="text-red-500">*</span></label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Result Type</label>
            <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-100 text-slate-700 text-sm min-h-[42px] flex items-center">{selectedConfig?.resultType || "—"}</div>
          </div>
        </div>

        {controlResults.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-2">Record Control Results <span className="flex-1 h-px bg-emerald-200 ml-2" /></h3>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Control Name", "Level", "Expected", "Observed Result", "Status"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {controlResults.map((result, idx) => {
                    const status = getStatus(result);
                    return (
                      <tr key={idx} className={status === "fail" ? "bg-red-50" : status === "pass" ? "bg-emerald-50/30" : "hover:bg-slate-50"}>
                        <td className={tblCell + " font-semibold text-slate-800"}>{result.controlName}</td>
                        <td className={tblCell}><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLORS[result.level] || "bg-slate-100 text-slate-700"}`}>{result.level}</span></td>
                        <td className={tblCell}><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">{result.expectedResult}</span></td>
                        <td className={tblCell}>
                          <div className="flex gap-2">
                            {resultOptions.map((opt: string) => (
                              <button key={opt} type="button" onClick={() => setControlResults((prev) => prev.map((r, i) => i === idx ? { ...r, observedResult: opt } : r))}
                                className={`flex-1 px-3 py-2 rounded-xl border-2 text-sm font-bold transition ${
                                  result.observedResult === opt
                                    ? opt === result.expectedResult ? "bg-emerald-100 border-emerald-500 text-emerald-700" : "bg-red-100 border-red-500 text-red-700"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300"
                                }`}
                              >{opt}</button>
                            ))}
                          </div>
                        </td>
                        <td className={tblCell}>
                          {status === "pass"    && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Pass</span>}
                          {status === "fail"    && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Fail</span>}
                          {status === "pending" && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Pending</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {allFilled && (
              <div className={`mt-4 p-4 rounded-xl border-2 flex items-center gap-3 font-bold text-base ${overallPass ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-red-50 border-red-500 text-red-700"}`}>
                <span className="text-2xl">{overallPass ? "✓" : "✗"}</span>
                <div>
                  <div>Overall QC Run: <strong>{overallPass ? "PASS" : "FAIL"}</strong>{" — "}{controlResults.filter((r) => getStatus(r) === "pass").length} of {controlResults.length} controls concordant</div>
                  {!overallPass && <div className="font-normal text-sm mt-1">Corrective action is required before releasing patient results.</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {anyFail && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-3 flex items-center gap-2">Corrective Action Required <span className="flex-1 h-px bg-red-200 ml-2" /></h3>
            <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Describe the corrective action taken…" rows={3}
              className={inputCls + " resize-y"} required={anyFail} />
          </div>
        )}

        {selectedConfigId && (
          <div className="flex gap-3 flex-wrap">
            <button type="button" onClick={() => handleSave(false)} disabled={isLoading || !selectedConfigId} className={btnSecondary}>{editingId ? "Update Draft" : "Save Draft"}</button>
            <button type="button" onClick={() => handleSave(true)}  disabled={isLoading || !selectedConfigId} className={btnPrimary}>{editingId ? "Submit Entry" : "Save & Submit"}</button>
            <button type="button" onClick={resetForm} className={btnSecondary}>Clear</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={ClipboardList} title="Draft Entries" />
        {draftEntries.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No draft QC runs.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Test", "Date", "Controls", "Filled", "Operator", "Actions"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {draftEntries.map((entry) => {
                  const controls = entry.controlResults || [];
                  const filled   = controls.filter((r: QcItem) => r.observedResult).length;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className={tblCell + " font-semibold text-slate-800"}>{entry.testName}</td>
                      <td className={tblCell}>{entry.date}</td>
                      <td className={tblCell + " text-center"}>{controls.length}</td>
                      <td className={tblCell + " text-center"}>
                        <span className={`font-semibold ${filled === controls.length ? "text-emerald-600" : "text-amber-600"}`}>{filled}/{controls.length}</span>
                      </td>
                      <td className={tblCell}>{entry.enteredBy || "—"}</td>
                      <td className={tblCell}>
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => { setEditingId(String(entry.id)); setSelectedConfigId(entry.qcConfigId); setSelectedDate(entry.date); setControlResults(entry.controlResults || []); setCorrectiveAction(entry.correctiveAction || ""); }} className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold">Edit</button>
                          <button onClick={() => handleSubmitDraft(entry)} className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">Submit</button>
                          <button onClick={() => handleDelete(entry)} className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QUALITATIVE QC LOG TAB  (Lab-hub QualitativeQCLog.js)     */
/* ═══════════════════════════════════════════════════════════ */
function QualLogTab({ labHubUrl }: { labHubUrl: string }) {
  const api = useMemo(() => makeApi(labHubUrl), [labHubUrl]);
  const [allRuns, setAllRuns]       = useState<QcItem[]>([]);
  const [filterTest, setFilterTest] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo]     = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const [confirm, setConfirm]       = useState<ConfirmState>(closedConfirm);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getItems();
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      const runs = items
        .filter((item: QcItem) => item.qualitative === true && item.qualEntry === true && item.submitted === true)
        .sort((a: QcItem, b: QcItem) => a.date < b.date ? 1 : -1);
      setAllRuns(runs);
    } catch (e) { setError(`Error loading data: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = allRuns.filter((run) => {
    if (filterTest && run.testName !== filterTest) return false;
    if (filterFrom && run.date < filterFrom) return false;
    if (filterTo   && run.date > filterTo)   return false;
    return true;
  });

  const totalRuns  = filtered.length;
  const passedRuns = filtered.filter((r) => r.overallPass).length;
  const failedRuns = totalRuns - passedRuns;
  const passRate   = totalRuns > 0 ? ((passedRuns / totalRuns) * 100).toFixed(1) : "—";
  const testNames  = [...new Set(allRuns.map((r) => r.testName).filter(Boolean))];

  const handleDelete = (run: QcItem) => {
    setConfirm({
      open: true, title: "Delete QC Run Record?",
      message: <>Are you sure you want to delete this QC run <strong>{run.testName}</strong> from <strong>{run.date}</strong>? This cannot be undone.</>,
      confirmLabel: "Delete", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try { await api.deleteItem(String(run.id)); fetchData(); }
        catch (e) { setError(`Error: ${(e as Error).message}`); }
      },
    });
  };

  const handleMarkResolved = (run: QcItem) => {
    setConfirm({
      open: true, title: "Mark as Resolved?",
      message: <>Mark failed QC run <strong>{run.testName}</strong> ({run.date}) as resolved? The alert will be cleared.</>,
      confirmLabel: "Mark Resolved", variant: "success",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setResolvingId(String(run.id));
        try { await api.putItem({ ...run, resolved: true }); fetchData(); }
        catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setResolvingId(null); }
      },
    });
  };

  const handleExportCSV = () => {
    if (!filtered.length) return;
    const rows: (string | number | null)[][] = [
      ["Qualitative QC Log Export"], ["Generated", new Date().toLocaleDateString()],
      ["Filter: Test", filterTest || "All"], ["Filter: Date Range", filterFrom && filterTo ? `${filterFrom} to ${filterTo}` : "All"],
      [], ["Summary"], ["Total Runs", "Passed", "Failed", "Pass Rate"],
      [totalRuns, passedRuns, failedRuns, passRate !== "—" ? `${passRate}%` : "—"],
      [], ["Date", "Test Name", "Lot Number", "Controls Run", "Passed", "Failed", "Overall Result", "Operator", "Corrective Action"],
    ];
    filtered.forEach((run) => {
      const controls = run.controlResults || [];
      const passed = controls.filter((c: QcItem) => c.observedResult === c.expectedResult).length;
      rows.push([run.date, run.testName, run.lotNumber || "—", controls.length, passed, controls.length - passed, run.overallPass ? "PASS" : "FAIL", run.enteredBy || "—", run.correctiveAction || "—"]);
    });
    downloadCSV(rows, `QualitativeQC_Log_${todayStr()}.csv`);
  };

  return (
    <div className="space-y-5">
      {isLoading && <div className="flex items-center gap-2 text-emerald-600 text-sm"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>}
      {error && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Runs", value: totalRuns,  border: "border-slate-100",   color: "text-emerald-600" },
          { label: "Passed",     value: passedRuns, border: "border-emerald-100", color: "text-emerald-600" },
          { label: "Failed",     value: failedRuns, border: "border-red-100",     color: "text-red-600"     },
          { label: "Pass Rate",  value: passRate !== "—" ? `${passRate}%` : "—",
            border: "border-slate-100",
            color: passRate === "—" ? "text-slate-600" : parseFloat(passRate) >= 90 ? "text-emerald-600" : parseFloat(passRate) >= 75 ? "text-amber-600" : "text-red-600" },
        ].map(({ label, value, border, color }) => (
          <div key={label} className={`bg-white ${border} border rounded-2xl p-5 text-center shadow-sm`}>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3">Filter Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Test Name</label>
            <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)} className={selectCls}>
              <option value="">All Tests</option>
              {testNames.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Start Date</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">End Date</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHead icon={Activity} title="QC Run History" />
          <button onClick={handleExportCSV} disabled={!filtered.length} className={btnSecondary + " disabled:opacity-40"}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            {allRuns.length === 0 ? "No qualitative QC runs recorded yet." : "No runs match the current filters."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Date", "Test", "Lot No.", "Controls", "Pass", "Fail", "Overall", "Date Entered", "Details", "Resolve", ""].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.flatMap((run) => {
                  const controls   = run.controlResults || [];
                  const passed     = controls.filter((c: QcItem) => c.observedResult === c.expectedResult).length;
                  const failed     = controls.length - passed;
                  const isExpanded = expandedRow === String(run.id);

                  const mainRow = (
                    <tr key={String(run.id)} className={`hover:bg-slate-50 ${!run.overallPass ? "border-l-4 border-l-red-400" : ""}`}>
                      <td className={tblCell}>{fmtDate(run.date)}</td>
                      <td className={tblCell + " font-semibold text-slate-800"}>{run.testName}</td>
                      <td className={tblCell + " font-mono text-slate-500"}>{run.lotNumber || "—"}</td>
                      <td className={tblCell + " text-center"}>{controls.length}</td>
                      <td className={tblCell + " font-bold text-emerald-600 text-center"}>{passed}</td>
                      <td className={tblCell + " font-bold text-center"}><span className={failed > 0 ? "text-red-600" : "text-slate-400"}>{failed}</span></td>
                      <td className={tblCell}><PassBadge pass={run.overallPass} /></td>
                      <td className={tblCell + " text-slate-500"}>{run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}</td>
                      <td className={tblCell}>
                        <button onClick={() => setExpandedRow(isExpanded ? null : String(run.id))} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold underline flex items-center gap-1">
                          {isExpanded ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> View</>}
                        </button>
                      </td>
                      <td className={tblCell}>
                        {!run.overallPass && !run.resolved ? (
                          <button onClick={() => handleMarkResolved(run)} disabled={resolvingId === String(run.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold disabled:opacity-60">
                            {resolvingId === String(run.id) ? "Resolving…" : "Mark Resolved"}
                          </button>
                        ) : run.resolved ? (
                          <span className="text-xs text-emerald-600 font-semibold">Resolved</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={tblCell}>
                        <button onClick={() => handleDelete(run)} className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold">Delete</button>
                      </td>
                    </tr>
                  );

                  if (!isExpanded) return [mainRow];

                  const detailRow = (
                    <tr key={`${run.id}-detail`} className="bg-slate-50">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                          <h4 className="font-bold text-emerald-700 mb-3 text-sm">Control Results Detail</h4>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-emerald-600 font-bold uppercase">
                                <th className="text-left pb-2 pr-4">Control</th>
                                <th className="text-left pb-2 pr-4">Level</th>
                                <th className="text-left pb-2 pr-4">Expected</th>
                                <th className="text-left pb-2 pr-4">Observed</th>
                                <th className="text-left pb-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {controls.map((ctrl: QcItem, cIdx: number) => (
                                <Fragment key={cIdx}>
                                  <tr className="border-t border-slate-100">
                                    <td className="py-2 pr-4 font-medium text-slate-800">{ctrl.controlName}</td>
                                    <td className="py-2 pr-4 text-slate-500">{ctrl.level}</td>
                                    <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{ctrl.expectedResult}</span></td>
                                    <td className="py-2 pr-4">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ctrl.observedResult === ctrl.expectedResult ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{ctrl.observedResult}</span>
                                    </td>
                                    <td className="py-2">
                                      {ctrl.observedResult === ctrl.expectedResult
                                        ? <span className="text-emerald-600 font-bold text-xs">Concordant</span>
                                        : <span className="text-red-600 font-bold text-xs">Discordant</span>}
                                    </td>
                                  </tr>
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                          {run.correctiveAction && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                              <span className="text-xs font-bold text-red-700 uppercase">Corrective Action: </span>
                              <span className="text-sm text-red-900">{run.correctiveAction}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );

                  return [mainRow, detailRow];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}
