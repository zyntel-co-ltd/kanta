"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Grid3X3,
  Search,
  BarChart3,
  Plus,
  Trash2,
  Download,
  Filter,
  X,
  ArrowLeft,
  AlertTriangle,
  Archive,
  ChevronRight,
  Printer,
  Info,
} from "lucide-react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

/* ═══════════════════════════════ TYPES ═══════════════════════════════ */
type RackType   = "normal" | "igra";
type RackStatus = "empty"  | "partial" | "full";

type Rack = {
  id: string;
  rack_name: string;
  rack_date: string;
  rack_type: RackType;
  description?: string;
  status: RackStatus;
  total_samples: number;
};

type Sample = {
  id: string;
  barcode: string;
  patient_id?: string;
  sample_type?: string;
  position: number;
  collection_date?: string;
  notes?: string;
  rack_id: string;
  discarded_at?: string;
  created_at?: string;
  lab_racks?: { rack_name: string; rack_date: string };
};

type Stats = {
  total_racks: number;
  total_samples: number;
  pending_discarding: number;
  rack_status: { empty: number; partial: number; full: number };
};

type SubTab = "dashboard" | "racks" | "pending" | "discarded" | "search";
type SampleForm = {
  barcode: string;
  patient_id: string;
  sample_type: string;
  collection_date: string;
  notes: string;
};

/* ═══════════════════════════════ CONSTANTS ══════════════════════════ */
const CAPACITY   = (type: RackType) => (type === "igra" ? 40 : 100);
const ROWS       = (type: RackType) => (type === "igra" ? 4  : 10);
const SAMPLE_TYPES = ["Blood", "Serum", "Plasma", "Urine", "CSF", "Sputum", "Stool", "Other"];

const SUB_TABS: { id: SubTab; label: string; icon: typeof Grid3X3 }[] = [
  { id: "dashboard", label: "Dashboard",          icon: BarChart3      },
  { id: "racks",     label: "Racks",              icon: Grid3X3        },
  { id: "pending",   label: "Pending Discarding", icon: AlertTriangle  },
  { id: "discarded", label: "Discarded",          icon: Archive        },
  { id: "search",    label: "Search",             icon: Search         },
];

/* ═══════════════════════════════ STYLE HELPERS ══════════════════════ */
const btnPrimary   = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 transition-colors";
const btnSecondary = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors";
const btnDanger    = "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors";
const inputCls     = "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all";

function statusBadge(s: RackStatus) {
  if (s === "full")    return "bg-sky-100 text-sky-700";
  if (s === "partial") return "bg-amber-100  text-amber-700";
  return "bg-slate-100 text-slate-500";
}

function positionLabel(position: number) {
  const cols = 10;
  const row  = Math.floor(position / cols);
  const col  = (position % cols) + 1;
  return `${String.fromCharCode(65 + row)}${col}`;
}

function rackAge(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

/* ═══════════════════════════════ CONFIRM DIALOG ════════════════════ */
function Confirm({
  title, message, confirmLabel, variant = "danger", onConfirm, onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-slate-900 text-base mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${
              variant === "warning"
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ RACK GRID VIEW ════════════════════ */
function RackGridView({
  rackId,
  onBack,
}: {
  rackId: string;
  onBack: () => void;
}) {
  const [rack, setRack]         = useState<Rack | null>(null);
  const [samples, setSamples]   = useState<Record<number, Sample>>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [isIgraMode, setIsIgraMode] = useState(false);
  const [form, setForm]         = useState<SampleForm>({
    barcode: "", patient_id: "", sample_type: "Blood", collection_date: "", notes: "",
  });
  const [delConfirm, setDelConfirm] = useState<Sample | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRack = useCallback(async () => {
    try {
      const res = await fetch(`/api/samples/racks/${rackId}`);
      if (!res.ok) throw new Error("failed");
      const { rack: r, samples: s } = await res.json();
      setRack(r);
      const map: Record<number, Sample> = {};
      (s as Sample[]).forEach((samp) => { map[samp.position] = samp; });
      setSamples(map);
    } catch {
      setError("Failed to load rack");
    } finally {
      setLoading(false);
    }
  }, [rackId]);

  useEffect(() => { loadRack(); }, [loadRack]);

  const handleCellClick = (pos: number) => {
    setSelected(pos);
    if (!samples[pos]) {
      setIsIgraMode(rack?.rack_type === "igra");
      setForm((f) => ({ ...f, collection_date: new Date().toISOString().slice(0, 16) }));
      setShowAdd(true);
    } else {
      setShowAdd(false);
    }
  };

  const resetForm = () => {
    setForm({ barcode: "", patient_id: "", sample_type: "Blood", collection_date: "", notes: "" });
    setSelected(null);
    setShowAdd(false);
    setIsIgraMode(false);
  };

  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected === null || !rack) return;
    setSubmitting(true);
    setError(""); setSuccess("");

    try {
      if (isIgraMode && rack.rack_type === "igra") {
        const suffixes = ["A", "B", "C", "D"];
        const positions = [0, 1, 2, 3].map((i) => selected + i * 10);
        for (const pos of positions) {
          if (pos >= 40 || samples[pos]) {
            setError("Need 4 consecutive empty vertical positions (same column, 4 rows)");
            setSubmitting(false);
            return;
          }
        }
        for (let i = 0; i < 4; i++) {
          const res = await fetch(`/api/samples/racks/${rackId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, barcode: `${form.barcode}${suffixes[i]}`, position: positions[i] }),
          });
          const j = await res.json();
          if (!res.ok) { setError(j.error || "Failed to add sample"); setSubmitting(false); return; }
        }
        setSuccess(`4 IGRA samples added (${form.barcode}A–D)`);
      } else {
        const res = await fetch(`/api/samples/racks/${rackId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, position: selected }),
        });
        const j = await res.json();
        if (!res.ok) { setError(j.error || "Failed to add sample"); setSubmitting(false); return; }
        setSuccess("Sample added successfully");
      }
      resetForm();
      loadRack();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSample = async () => {
    if (!delConfirm) return;
    await fetch(`/api/samples/sample/${delConfirm.id}`, { method: "DELETE" });
    setDelConfirm(null);
    setSelected(null);
    loadRack();
  };

  const handlePrintManifest = () => {
    if (!rack) return;
    const rows: string[] = [];
    for (let pos = 0; pos < CAPACITY(rack.rack_type); pos++) {
      const s = samples[pos];
      const lbl = positionLabel(pos);
      rows.push(`<tr><td>${lbl}</td><td>${s?.barcode || "—"}</td><td>${s?.patient_id || "—"}</td><td>${s?.sample_type || "—"}</td><td>${s?.collection_date ? new Date(s.collection_date).toLocaleDateString() : "—"}</td><td>${s?.notes || "—"}</td></tr>`);
    }
    const html = `<!DOCTYPE html><html><head><title>Rack Manifest – ${rack.rack_name}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px 8px;text-align:left}th{background:#f3f4f6}@media print{.no-print{display:none}}</style>
    </head><body>
    <h1>Rack Manifest: ${rack.rack_name}</h1>
    <p>Date: ${new Date(rack.rack_date).toLocaleDateString()} | Status: ${rack.status} | ${rack.total_samples}/${CAPACITY(rack.rack_type)} samples</p>
    <table><thead><tr><th>Position</th><th>Barcode</th><th>Patient ID</th><th>Type</th><th>Collection Date</th><th>Notes</th></tr></thead><tbody>${rows.join("")}</tbody></table>
    <p class="no-print" style="margin-top:20px"><button onclick="window.print()">Print</button> <button onclick="window.close()">Close</button></p>
    </body></html>`;
    const w = window.open("", "_blank");
    w?.document.write(html); w?.document.close();
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-400">Loading rack…</div>;
  }
  if (!rack) {
    return <div className="py-20 text-center text-sm text-red-500">{error || "Rack not found"}</div>;
  }

  const selectedSample = selected !== null ? samples[selected] : null;
  const gridRows = ROWS(rack.rack_type);
  const fillPct  = Math.round((rack.total_samples / CAPACITY(rack.rack_type)) * 100);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>
          <ArrowLeft size={14} /> Back to Racks
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 truncate">{rack.rack_name}</h2>
          <p className="text-xs text-slate-500">{new Date(rack.rack_date).toLocaleDateString()} &bull; {rack.rack_type === "igra" ? "IGRA (40 pos)" : "Normal (100 pos)"}</p>
        </div>
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${statusBadge(rack.status)}`}>
          {rack.status}
        </span>
        <span className="text-sm text-slate-500 tabular-nums">{rack.total_samples}/{CAPACITY(rack.rack_type)}</span>
        <button type="button" onClick={handlePrintManifest} className={btnSecondary}>
          <Printer size={14} /> Print Manifest
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-500 rounded-full transition-all"
          style={{ width: `${fillPct}%` }}
        />
      </div>

      {/* Alerts */}
      {error   && <div className="px-4 py-3 bg-red-50   border border-red-200   rounded-xl text-sm text-red-700">{error}</div>}
      {success && <div className="px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-700">{success}</div>}

      {/* Grid + detail */}
      <div className="flex gap-4 items-start">
        {/* Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
            <Info size={12} /> Click an empty cell to add a sample, or a filled cell to view details
          </p>
          {/* Column headers */}
          <div className="flex">
            <div className="w-8 flex-shrink-0" />
            {[...Array(10)].map((_, c) => (
              <div key={c} className="w-9 text-center text-[11px] font-semibold text-slate-400 pb-1">{c + 1}</div>
            ))}
          </div>
          {/* Rows */}
          {[...Array(gridRows)].map((_, row) => (
            <div key={row} className="flex mb-0.5">
              <div className="w-8 flex items-center justify-center text-[11px] font-semibold text-slate-400 flex-shrink-0">
                {String.fromCharCode(65 + row)}
              </div>
              {[...Array(10)].map((_, col) => {
                const pos   = row * 10 + col;
                const samp  = samples[pos];
                const isSel = selected === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    title={samp ? samp.barcode : "Empty"}
                    onClick={() => handleCellClick(pos)}
                    className={`w-9 h-9 rounded-lg border text-xs font-bold transition-all flex items-center justify-center ${
                      isSel
                        ? "border-sky-500 bg-sky-500 text-white shadow-md scale-110"
                        : samp
                        ? "border-sky-300 bg-sky-100 text-sky-700 hover:border-sky-500 hover:bg-sky-200"
                        : "border-slate-200 bg-slate-50 text-slate-300 hover:border-sky-300 hover:bg-sky-50"
                    }`}
                  >
                    {samp ? "●" : ""}
                  </button>
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-4 h-4 rounded border border-sky-300 bg-sky-100 inline-block" /> Occupied
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-4 h-4 rounded border border-slate-200 bg-slate-50 inline-block" /> Empty
            </span>
          </div>
        </div>

        {/* Detail / Add panel */}
        <div className="w-64 flex-shrink-0 bg-white rounded-2xl border border-slate-200 p-4 min-h-[200px]">
          {selected === null ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Select a position to view or add a sample
            </div>
          ) : selectedSample && !showAdd ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Sample Details</p>
                <button type="button" onClick={() => setSelected(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Position {positionLabel(selected)}
              </p>
              {[
                ["Barcode",    selectedSample.barcode,                                       "font-mono"],
                ["Patient ID", selectedSample.patient_id || "—",                            ""],
                ["Type",       selectedSample.sample_type || "—",                           ""],
                ["Collected",  selectedSample.collection_date ? new Date(selectedSample.collection_date).toLocaleDateString() : "—", ""],
                ["Added",      selectedSample.created_at ? new Date(selectedSample.created_at).toLocaleString() : "—", "text-xs"],
              ].map(([label, val, cls]) => (
                <div key={label as string}>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                  <p className={`text-sm text-slate-800 ${cls}`}>{val}</p>
                </div>
              ))}
              {selectedSample.notes && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Notes</p>
                  <p className="text-xs text-slate-600">{selectedSample.notes}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setDelConfirm(selectedSample)}
                className="mt-2 w-full flex items-center justify-center gap-2 py-1.5 rounded-xl border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
              >
                <Trash2 size={12} /> Delete Sample
              </button>
            </div>
          ) : showAdd ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Add Sample</p>
                <button type="button" onClick={resetForm} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Position <strong>{positionLabel(selected!)}</strong>
              </p>

              {rack.rack_type === "igra" && (
                <label className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIgraMode}
                    onChange={(e) => setIsIgraMode(e.target.checked)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="text-xs font-semibold text-blue-700">IGRA Mode</p>
                    <p className="text-[10px] text-blue-500">Creates 4 samples (A–D) vertically</p>
                  </div>
                </label>
              )}

              <form onSubmit={handleAddSample} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                    Barcode {isIgraMode && "(base)"} *
                  </label>
                  <input required value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                    className={inputCls} placeholder="e.g. ABC123" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Patient ID</label>
                  <input value={form.patient_id} onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Sample Type</label>
                  <select value={form.sample_type} onChange={(e) => setForm((f) => ({ ...f, sample_type: e.target.value }))}
                    className={inputCls}>
                    {SAMPLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Collection Date</label>
                  <input type="datetime-local" value={form.collection_date}
                    onChange={(e) => setForm((f) => ({ ...f, collection_date: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className={inputCls + " resize-none"} />
                </div>
                <button type="submit" disabled={submitting} className={btnPrimary + " w-full justify-center"}>
                  <Plus size={13} /> {submitting ? "Adding…" : isIgraMode ? "Add 4 IGRA Samples" : "Add Sample"}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {/* Delete sample confirmation */}
      {delConfirm && (
        <Confirm
          title="Delete Sample?"
          message={<>Delete sample <strong>&ldquo;{delConfirm.barcode}&rdquo;</strong>? This cannot be undone.</>}
          confirmLabel="Delete Sample"
          onConfirm={handleDeleteSample}
          onCancel={() => setDelConfirm(null)}
        />
      )}
    </div>
  );
}

const VALID_SUB_TABS = new Set<SubTab>(["dashboard", "racks", "pending", "discarded", "search"]);

function getInitialTab(): SubTab {
  if (typeof window !== "undefined") {
    const t = new URLSearchParams(window.location.search).get("tab") as SubTab;
    if (t && VALID_SUB_TABS.has(t)) return t;
  }
  return "dashboard";
}

/* ═══════════════════════════════ MAIN PAGE ══════════════════════════ */
export default function SamplesPage() {
  const [subTab, setSubTab]         = useState<SubTab>(getInitialTab);
  const [viewRackId, setViewRackId] = useState<string | null>(null);

  /* ── Dashboard ── */
  const [stats, setStats]           = useState<Stats | null>(null);
  const [recentRacks, setRecentRacks] = useState<Rack[]>([]);
  const [dashFilters, setDashFilters] = useState({ startDate: "", endDate: "", status: "", showFilters: false });

  /* ── Racks ── */
  const [racks, setRacks]           = useState<Rack[]>([]);
  const [racksLoading, setRacksLoading] = useState(false);
  const [filters, setFilters]       = useState({ startDate: "", endDate: "", status: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [newRack, setNewRack]       = useState({ rack_name: "", rack_date: new Date().toISOString().slice(0, 10), rack_type: "normal", description: "" });
  const [creating, setCreating]     = useState(false);
  const [delRackConfirm, setDelRackConfirm] = useState<Rack | null>(null);

  /* ── Pending ── */
  const [pendingRacks, setPendingRacks]     = useState<Rack[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState<Rack | null>(null);
  const [pendingMsg, setPendingMsg]         = useState<{ type: "ok" | "err"; text: string } | null>(null);

  /* ── Discarded ── */
  const [discarded, setDiscarded]       = useState<Sample[]>([]);
  const [discardedLoading, setDiscardedLoading] = useState(false);
  const [delSampleConfirm, setDelSampleConfirm] = useState<Sample | null>(null);

  /* ── Search ── */
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchField, setSearchField]   = useState<"all"|"barcode"|"patient_id">("all");
  const [searchResults, setSearchResults] = useState<Sample[]>([]);
  const [searching, setSearching]       = useState(false);
  const [searched, setSearched]         = useState(false);

  /* ═══════════ Loaders ═══════════ */
  const loadStats = useCallback(async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/samples/stats?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/samples?facility_id=${DEFAULT_FACILITY_ID}&limit=20${dashFilters.status ? "&status=" + dashFilters.status : ""}${dashFilters.startDate ? "&start_date=" + dashFilters.startDate : ""}${dashFilters.endDate ? "&end_date=" + dashFilters.endDate : ""}`),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (rRes.ok) setRecentRacks((await rRes.json()).racks ?? []);
    } catch {}
  }, [dashFilters]);

  const loadRacks = useCallback(async () => {
    setRacksLoading(true);
    try {
      const p = new URLSearchParams({ facility_id: DEFAULT_FACILITY_ID });
      if (filters.status)    p.set("status",     filters.status);
      if (filters.startDate) p.set("start_date", filters.startDate);
      if (filters.endDate)   p.set("end_date",   filters.endDate);
      const res = await fetch(`/api/samples?${p}`);
      if (res.ok) setRacks((await res.json()).racks ?? []);
    } catch {}
    finally { setRacksLoading(false); }
  }, [filters]);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch(`/api/samples/pending?facility_id=${DEFAULT_FACILITY_ID}`);
      if (res.ok) setPendingRacks((await res.json()).racks ?? []);
    } catch {}
    finally { setPendingLoading(false); }
  }, []);

  const loadDiscarded = useCallback(async () => {
    setDiscardedLoading(true);
    try {
      const res = await fetch(`/api/samples/discarded?facility_id=${DEFAULT_FACILITY_ID}`);
      if (res.ok) setDiscarded((await res.json()).samples ?? []);
    } catch {}
    finally { setDiscardedLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (subTab === "racks")     loadRacks();    }, [subTab, loadRacks]);
  useEffect(() => { if (subTab === "pending")   loadPending();  }, [subTab, loadPending]);
  useEffect(() => { if (subTab === "discarded") loadDiscarded();}, [subTab, loadDiscarded]);

  /* ═══════════ Handlers ═══════════ */
  async function handleCreateRack(e: React.FormEvent) {
    e.preventDefault(); setCreating(true);
    try {
      const res = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: DEFAULT_FACILITY_ID, ...newRack }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setShowCreate(false);
      setNewRack({ rack_name: "", rack_date: new Date().toISOString().slice(0, 10), rack_type: "normal", description: "" });
      loadRacks(); loadStats();
    } catch { alert("Failed to create rack."); }
    finally { setCreating(false); }
  }

  async function handleDeleteRack() {
    if (!delRackConfirm) return;
    await fetch(`/api/samples/racks/${delRackConfirm.id}`, { method: "DELETE" });
    setDelRackConfirm(null);
    loadRacks(); loadStats();
  }

  async function handleDiscard() {
    if (!discardConfirm) return;
    try {
      const res = await fetch(`/api/samples/racks/${discardConfirm.id}/discard`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      setPendingMsg({ type: "ok", text: `Samples in "${discardConfirm.rack_name}" have been discarded` });
      setDiscardConfirm(null);
      loadPending(); loadStats();
      setTimeout(() => setPendingMsg(null), 4000);
    } catch {
      setPendingMsg({ type: "err", text: "Failed to discard rack" });
    }
  }

  async function handleDeleteDiscarded() {
    if (!delSampleConfirm) return;
    await fetch(`/api/samples/discarded/${delSampleConfirm.id}`, { method: "DELETE" });
    setDelSampleConfirm(null);
    loadDiscarded();
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true); setSearched(true);
    try {
      const p = new URLSearchParams({ facility_id: DEFAULT_FACILITY_ID, q: searchQuery.trim(), field: searchField });
      const res = await fetch(`/api/samples/search?${p}`);
      setSearchResults(res.ok ? (await res.json()).results ?? [] : []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }

  function exportRacksCSV() {
    const header = "Rack Name,Type,Date,Status,Samples\n";
    const rows = racks.map((r) => `"${r.rack_name}","${r.rack_type}","${r.rack_date}","${r.status}",${r.total_samples}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `lab_racks_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ═══════════ Stat cards ═══════════ */
  const statCards = [
    { label: "Total Racks",        value: stats?.total_racks ?? "—",        color: "text-slate-800",   tab: "racks"     as SubTab },
    { label: "Total Samples",      value: stats?.total_samples ?? "—",      color: "text-sky-700", tab: "racks"     as SubTab },
    { label: "Partial Racks",      value: stats?.rack_status?.partial ?? "—", color: "text-amber-700", tab: "racks"     as SubTab },
    { label: "Pending Discarding", value: stats?.pending_discarding ?? "—", color: "text-red-600",     tab: "pending"   as SubTab },
  ];

  /* ════════════════════════ RENDER ═════════════════════════════════ */
  return (
    <div className="max-w-[1400px] space-y-5">
      {/* Page header */}
      <div className="animate-slide-up">
        <p className="text-eyebrow mb-1">Samples</p>
        <h1 className="text-slate-900" style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
          Sample Management
        </h1>
        <p className="text-slate-500 mt-0.5 text-sm">
          Rack management, sample tracking, discarding workflow and search.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto animate-slide-up">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setSubTab(id); setViewRackId(null); }}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              subTab === id
                ? "border-sky-500 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">

        {/* ════════════ DASHBOARD TAB ════════════ */}
        {subTab === "dashboard" && (
          <div className="space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map(({ label, value, color, tab }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSubTab(tab)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:shadow-md hover:border-sky-200 transition-all"
                >
                  <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </button>
              ))}
            </div>

            {/* Recent racks */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold text-slate-800">Recent Racks</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDashFilters((f) => ({ ...f, showFilters: !f.showFilters }))}
                    className={btnSecondary + " !py-1.5 !px-3 !text-xs"}
                  >
                    <Filter size={12} /> {dashFilters.showFilters ? "Hide" : "Show"} Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab("racks")}
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                  >
                    View all
                  </button>
                </div>
              </div>

              {dashFilters.showFilters && (
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Start Date</label>
                    <input type="date" value={dashFilters.startDate}
                      onChange={(e) => setDashFilters((f) => ({ ...f, startDate: e.target.value }))}
                      className={inputCls + " w-36"} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">End Date</label>
                    <input type="date" value={dashFilters.endDate}
                      onChange={(e) => setDashFilters((f) => ({ ...f, endDate: e.target.value }))}
                      className={inputCls + " w-36"} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Status</label>
                    <select value={dashFilters.status}
                      onChange={(e) => setDashFilters((f) => ({ ...f, status: e.target.value }))}
                      className={inputCls + " w-32"}>
                      <option value="">All</option>
                      <option value="empty">Empty</option>
                      <option value="partial">Partial</option>
                      <option value="full">Full</option>
                    </select>
                  </div>
                  <button onClick={loadStats} className={btnPrimary}>Apply</button>
                </div>
              )}

              {recentRacks.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No racks yet — create one in the Racks tab</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {recentRacks.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => { setSubTab("racks"); setViewRackId(r.id); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">{r.rack_name}</p>
                        <p className="text-xs text-slate-400">{new Date(r.rack_date).toLocaleDateString()} &bull; {r.rack_type}</p>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                      <div className="w-24">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${Math.round((r.total_samples / CAPACITY(r.rack_type)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 text-right">{r.total_samples}/{CAPACITY(r.rack_type)}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ RACKS TAB ════════════ */}
        {subTab === "racks" && (
          viewRackId ? (
            <RackGridView rackId={viewRackId} onBack={() => { setViewRackId(null); loadRacks(); loadStats(); }} />
          ) : (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setShowCreate(true)} className={btnPrimary}>
                  <Plus size={14} /> New Rack
                </button>
                <button onClick={exportRacksCSV} className={btnSecondary}>
                  <Download size={14} /> Export CSV
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
                  <Filter size={12} /> Filters
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Start Date</label>
                  <input type="date" value={filters.startDate}
                    onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                    className={inputCls + " w-36"} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">End Date</label>
                  <input type="date" value={filters.endDate}
                    onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                    className={inputCls + " w-36"} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Status</label>
                  <select value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    className={inputCls + " w-32"}>
                    <option value="">All</option>
                    <option value="empty">Empty</option>
                    <option value="partial">Partial</option>
                    <option value="full">Full</option>
                  </select>
                </div>
                <button onClick={() => loadRacks()} className={btnPrimary}>Apply Filters</button>
              </div>

              {/* Rack cards grid */}
              {racksLoading ? (
                <div className="py-16 text-center text-sm text-slate-400">Loading racks…</div>
              ) : racks.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">No racks found.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {racks.map((r) => {
                    const cap    = CAPACITY(r.rack_type);
                    const fillPct = Math.round((r.total_samples / cap) * 100);
                    return (
                      <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-sky-200 transition-all flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{r.rack_name}</h3>
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold flex-shrink-0 ${statusBadge(r.status)}`}>
                            {r.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
                          <div><p className="text-[9px] uppercase text-slate-400">Date</p>{new Date(r.rack_date).toLocaleDateString()}</div>
                          <div><p className="text-[9px] uppercase text-slate-400">Type</p>{r.rack_type === "igra" ? "IGRA" : "Normal"}</div>
                          <div className="col-span-2">
                            <p className="text-[9px] uppercase text-slate-400">Samples</p>
                            {r.total_samples} / {cap}
                          </div>
                          {r.description && <div className="col-span-2 text-slate-400 text-[10px] italic truncate">{r.description}</div>}
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewRackId(r.id)}
                            className={btnPrimary + " flex-1 justify-center !py-1.5 !text-xs"}
                          >
                            View Rack
                          </button>
                          <button
                            type="button"
                            onClick={() => setDelRackConfirm(r)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* ════════════ PENDING DISCARDING TAB ════════════ */}
        {subTab === "pending" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Pending Discarding</p>
              <p className="text-xs text-slate-500 mt-0.5">Racks older than 2 weeks that still have non-discarded samples.</p>
            </div>

            {pendingMsg && (
              <div className={`px-4 py-3 rounded-xl text-sm ${pendingMsg.type === "ok" ? "bg-sky-50 border border-sky-200 text-sky-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {pendingMsg.text}
              </div>
            )}

            {pendingLoading ? (
              <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
            ) : pendingRacks.length === 0 ? (
              <div className="py-16 text-center">
                <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No racks pending discarding</p>
                <p className="text-xs text-slate-400 mt-1">Racks older than 2 weeks will appear here automatically</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  {pendingRacks.length} rack{pendingRacks.length > 1 ? "s" : ""} pending discarding — older than 2 weeks.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingRacks.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl border border-amber-200 p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm">{r.rack_name}</h3>
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">Pending Discard</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
                        <div><p className="text-[9px] uppercase text-slate-400">Date</p>{new Date(r.rack_date).toLocaleDateString()}</div>
                        <div><p className="text-[9px] uppercase text-slate-400">Age</p><span className="text-red-600 font-semibold">{rackAge(r.rack_date)} days old</span></div>
                        <div><p className="text-[9px] uppercase text-slate-400">Samples</p>{r.total_samples} / {CAPACITY(r.rack_type)}</div>
                        <div><p className="text-[9px] uppercase text-slate-400">Type</p>{r.rack_type === "igra" ? "IGRA" : "Normal"}</div>
                      </div>
                      {r.description && <p className="text-xs text-slate-400 italic">{r.description}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setSubTab("racks"); setViewRackId(r.id); }}
                          className={btnSecondary + " flex-1 justify-center !py-1.5 !text-xs"}>
                          View Details
                        </button>
                        <button type="button" onClick={() => setDiscardConfirm(r)}
                          className={btnDanger + " flex-1 justify-center"}>
                          <Trash2 size={13} /> Discard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════ DISCARDED TAB ════════════ */}
        {subTab === "discarded" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Discarded Samples</p>
              <p className="text-xs text-slate-500 mt-0.5">Record of all samples that have been discarded.</p>
            </div>

            {discardedLoading ? (
              <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
            ) : discarded.length === 0 ? (
              <div className="py-16 text-center">
                <Archive size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No discarded samples yet</p>
                <p className="text-xs text-slate-400 mt-1">Samples discarded from Pending Discarding will appear here</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Barcode","Patient ID","Type","Position","Rack","Collected","Discarded",""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {discarded.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-800">{s.barcode}</td>
                          <td className="px-4 py-3 text-slate-600">{s.patient_id || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{s.sample_type || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">{positionLabel(s.position)}</td>
                          <td className="px-4 py-3 text-slate-500">{(s.lab_racks as { rack_name: string } | undefined)?.rack_name || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.collection_date ? new Date(s.collection_date).toLocaleDateString() : "—"}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.discarded_at ? new Date(s.discarded_at).toLocaleString() : "—"}</td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setDelSampleConfirm(s)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ SEARCH TAB ════════════ */}
        {subTab === "search" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Search Samples</h3>
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Radio group */}
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500 font-medium">Search in:</span>
                  {([["all","All Fields"],["barcode","Barcode"],["patient_id","Patient ID"]] as const).map(([val, lbl]) => (
                    <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" value={val} checked={searchField === val}
                        onChange={() => setSearchField(val)}
                        className="accent-sky-600" />
                      <span className="text-sm text-slate-700">{lbl}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      placeholder="Search by barcode, patient ID or sample type…"
                      className={inputCls + " pl-9"}
                    />
                  </div>
                  <button type="submit" disabled={searching || !searchQuery.trim()} className={btnPrimary}>
                    <Search size={14} /> {searching ? "Searching…" : "Search"}
                  </button>
                  {searched && (
                    <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); setSearched(false); }} className={btnSecondary}>
                      <X size={14} /> Clear
                    </button>
                  )}
                </div>
              </form>
            </div>

            {searched && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Search Results</p>
                  <span className="text-xs text-slate-500">{searchResults.length} {searchResults.length === 1 ? "sample" : "samples"} found</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">No samples found matching your search</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {searchResults.map((s) => (
                      <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="font-mono text-sm font-semibold text-slate-800">{s.barcode}</span>
                            {s.discarded_at ? (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Discarded</span>
                            ) : (
                              <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">Active</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            {s.patient_id && <span>Patient: {s.patient_id}</span>}
                            {s.sample_type && <span>Type: {s.sample_type}</span>}
                            <span>Position: {positionLabel(s.position)}</span>
                            {s.lab_racks && <span>Rack: {(s.lab_racks as { rack_name: string }).rack_name}</span>}
                            {s.collection_date && <span>Collected: {new Date(s.collection_date).toLocaleDateString()}</span>}
                          </div>
                          {s.notes && <p className="text-xs text-slate-400 mt-1 italic">{s.notes}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSubTab("racks"); setViewRackId(s.rack_id); }}
                          className={btnSecondary + " !py-1.5 !text-xs flex-shrink-0"}
                        >
                          View Rack <ChevronRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════ MODALS ══════ */}

      {/* Create Rack */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-base">Create New Rack</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateRack} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rack Name *</label>
                <input required value={newRack.rack_name}
                  onChange={(e) => setNewRack((r) => ({ ...r, rack_name: e.target.value }))}
                  className={inputCls} placeholder="e.g. Morning Batch 001" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rack Type</label>
                <select value={newRack.rack_type}
                  onChange={(e) => setNewRack((r) => ({ ...r, rack_type: e.target.value }))}
                  className={inputCls}>
                  <option value="normal">Normal Rack (100 positions — 10×10)</option>
                  <option value="igra">IGRA Rack (40 positions — 10 columns × 4 rows)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={newRack.rack_date}
                  onChange={(e) => setNewRack((r) => ({ ...r, rack_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea rows={3} value={newRack.description}
                  onChange={(e) => setNewRack((r) => ({ ...r, description: e.target.value }))}
                  className={inputCls + " resize-none"} placeholder="Optional notes…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className={btnPrimary + " flex-1 justify-center"}>
                  <Plus size={14} /> {creating ? "Creating…" : "Create Rack"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className={btnSecondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rack */}
      {delRackConfirm && (
        <Confirm
          title="Delete Rack?"
          message={<>Delete <strong>&ldquo;{delRackConfirm.rack_name}&rdquo;</strong> and all its samples? This cannot be undone.</>}
          confirmLabel="Delete Rack"
          onConfirm={handleDeleteRack}
          onCancel={() => setDelRackConfirm(null)}
        />
      )}

      {/* Discard Rack */}
      {discardConfirm && (
        <Confirm
          title="Discard Rack?"
          message={<>Mark all samples in <strong>&ldquo;{discardConfirm.rack_name}&rdquo;</strong> as discarded? They will be moved to the Discarded log.</>}
          confirmLabel="Discard Rack"
          variant="warning"
          onConfirm={handleDiscard}
          onCancel={() => setDiscardConfirm(null)}
        />
      )}

      {/* Delete Discarded Record */}
      {delSampleConfirm && (
        <Confirm
          title="Delete Discarded Record?"
          message={<>Permanently delete record <strong>&ldquo;{delSampleConfirm.barcode}&rdquo;</strong>? This cannot be undone.</>}
          confirmLabel="Delete Record"
          onConfirm={handleDeleteDiscarded}
          onCancel={() => setDelSampleConfirm(null)}
        />
      )}
    </div>
  );
}
