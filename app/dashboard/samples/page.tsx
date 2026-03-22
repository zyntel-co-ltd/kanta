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
} from "lucide-react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

/* ── Types ── */
type Rack = {
  id: string;
  rack_name: string;
  rack_date: string;
  rack_type: "normal" | "igra";
  description?: string;
  status: "empty" | "partial" | "full";
  total_samples: number;
};

type SampleResult = {
  id: string;
  barcode: string;
  patient_id?: string;
  sample_type?: string;
  position: number;
  collection_date?: string;
  notes?: string;
  rack_id: string;
  discarded_at?: string;
  lab_racks?: { rack_name: string; rack_date: string };
};

type Stats = {
  total_racks: number;
  total_samples: number;
  pending_discarding: number;
  rack_status: { empty: number; partial: number; full: number };
};

type SubTab = "dashboard" | "racks" | "search";

const SUB_TABS: { id: SubTab; label: string; icon: typeof Grid3X3 }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "racks",     label: "Racks",     icon: Grid3X3   },
  { id: "search",    label: "Search",    icon: Search    },
];

/* ── Helpers ── */
const btnPrimary =
  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
  + " bg-emerald-700 hover:bg-emerald-800";
const btnSecondary =
  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200"
  + " text-slate-700 hover:bg-slate-50 transition-colors";
const inputCls =
  "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900"
  + " placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all";

function rackStatusColor(status: string) {
  if (status === "full")    return "bg-emerald-100 text-emerald-700";
  if (status === "partial") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

function positionLabel(position: number) {
  const row = Math.floor(position / 10);
  const col = (position % 10) + 1;
  return `${String.fromCharCode(65 + row)}${col}`;
}

/* ── Page component ── */
export default function SamplesPage() {
  const [subTab, setSubTab] = useState<SubTab>("dashboard");

  /* -- Stats -- */
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRacks, setRecentRacks] = useState<Rack[]>([]);

  /* -- Racks tab -- */
  const [racks, setRacks] = useState<Rack[]>([]);
  const [racksLoading, setRacksLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", status: "" });

  /* -- Create rack modal -- */
  const [showCreate, setShowCreate] = useState(false);
  const [newRack, setNewRack] = useState({
    rack_name: "",
    rack_date: new Date().toISOString().slice(0, 10),
    rack_type: "normal",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  /* -- Search tab -- */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [searchResults, setSearchResults] = useState<SampleResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  /* ── Fetch helpers ── */
  const loadStats = useCallback(async () => {
    try {
      const [statsRes, racksRes] = await Promise.all([
        fetch(`/api/samples/stats?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/samples?facility_id=${DEFAULT_FACILITY_ID}&limit=5`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (racksRes.ok) {
        const j = await racksRes.json();
        setRecentRacks(j.racks ?? []);
      }
    } catch {}
  }, []);

  const loadRacks = useCallback(async () => {
    setRacksLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: DEFAULT_FACILITY_ID });
      if (filters.status)    params.set("status",     filters.status);
      if (filters.startDate) params.set("start_date", filters.startDate);
      if (filters.endDate)   params.set("end_date",   filters.endDate);
      const res = await fetch(`/api/samples?${params}`);
      if (res.ok) {
        const j = await res.json();
        setRacks(j.racks ?? []);
      }
    } catch {}
    finally { setRacksLoading(false); }
  }, [filters]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (subTab === "racks") loadRacks(); }, [subTab, loadRacks]);

  /* ── Create rack ── */
  async function handleCreateRack(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: DEFAULT_FACILITY_ID, ...newRack }),
      });
      if (!res.ok) throw new Error("failed");
      setShowCreate(false);
      setNewRack({ rack_name: "", rack_date: new Date().toISOString().slice(0, 10), rack_type: "normal", description: "" });
      loadRacks(); loadStats();
    } catch { alert("Failed to create rack."); }
    finally { setCreating(false); }
  }

  /* ── Delete rack ── */
  async function handleDeleteRack(id: string, name: string) {
    if (!confirm(`Delete rack "${name}" and all its samples?`)) return;
    try {
      await fetch(`/api/samples/rack?id=${id}`, { method: "DELETE" });
      loadRacks(); loadStats();
    } catch { alert("Failed to delete rack."); }
  }

  /* ── Export CSV ── */
  async function handleExport() {
    const params = new URLSearchParams({ facility_id: DEFAULT_FACILITY_ID });
    if (filters.status)    params.set("status",     filters.status);
    if (filters.startDate) params.set("start_date", filters.startDate);
    if (filters.endDate)   params.set("end_date",   filters.endDate);

    const res = await fetch(`/api/samples?${params}`);
    if (!res.ok) { alert("Export failed."); return; }
    const j = await res.json();
    const rackList: Rack[] = j.racks ?? [];

    const header = "Rack Name,Type,Date,Status,Samples\n";
    const rows = rackList.map((r) =>
      `"${r.rack_name}","${r.rack_type}","${r.rack_date}","${r.status}",${r.total_samples}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lab_racks_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ── Search ── */
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true); setSearched(true);
    try {
      const params = new URLSearchParams({
        facility_id: DEFAULT_FACILITY_ID,
        q: searchQuery.trim(),
        field: searchField,
      });
      const res = await fetch(`/api/samples/search?${params}`);
      setSearchResults(res.ok ? (await res.json()).results ?? [] : []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }

  /* ── Stat cards ── */
  const statCards = [
    { label: "Total Racks",   value: stats?.total_racks ?? "—",   color: "text-slate-800" },
    { label: "Total Samples", value: stats?.total_samples ?? "—", color: "text-emerald-700" },
    { label: "Partial Racks", value: stats?.rack_status?.partial ?? "—", color: "text-amber-700" },
    { label: "Pending Discard", value: stats?.pending_discarding ?? "—", color: "text-slate-600" },
  ];

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{ letterSpacing: "-0.025em" }}>
            Samples
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sample rack management — powered by Supabase
          </p>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subTab === id
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Dashboard tab ── */}
      {subTab === "dashboard" && (
        <div className="space-y-5 animate-fade-in">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Recent racks */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Recent Racks</p>
              <button onClick={() => setSubTab("racks")} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                View all
              </button>
            </div>
            {recentRacks.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No racks yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Rack</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Type</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Date</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Samples</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentRacks.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{r.rack_name}</td>
                      <td className="px-5 py-3 text-slate-500 capitalize">{r.rack_type}</td>
                      <td className="px-5 py-3 text-slate-500">{r.rack_date}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${rackStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700 tabular-nums">{r.total_samples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Racks tab ── */}
      {subTab === "racks" && (
        <div className="space-y-4 animate-fade-in">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowCreate(true)} className={btnPrimary}>
              <Plus size={14} /> New Rack
            </button>
            <button onClick={handleExport} className={btnSecondary}>
              <Download size={14} /> Export CSV
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className={inputCls + " w-36"}
              >
                <option value="">All statuses</option>
                <option value="empty">Empty</option>
                <option value="partial">Partial</option>
                <option value="full">Full</option>
              </select>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                className={inputCls + " w-40"}
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                className={inputCls + " w-40"}
              />
              <button onClick={() => loadRacks()} className={btnSecondary}>
                <Filter size={14} /> Apply
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {racksLoading ? (
              <div className="py-16 text-center text-sm text-slate-400">Loading racks…</div>
            ) : racks.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">
                No racks found. Create your first rack above.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Rack Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Samples</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Description</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {racks.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{r.rack_name}</td>
                      <td className="px-5 py-3 text-slate-500 capitalize">{r.rack_type}</td>
                      <td className="px-5 py-3 text-slate-500">{r.rack_date}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${rackStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700 tabular-nums">{r.total_samples}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{r.description ?? "—"}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDeleteRack(r.id, r.rack_name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Search tab ── */}
      {subTab === "search" && (
        <div className="space-y-4 animate-fade-in">
          <form onSubmit={handleSearch} className="flex gap-2">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className={inputCls + " w-36 flex-shrink-0"}
            >
              <option value="all">All fields</option>
              <option value="barcode">Barcode</option>
              <option value="patient_id">Patient ID</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search barcode or patient ID…"
              className={inputCls + " flex-1"}
            />
            <button type="submit" disabled={searching} className={btnPrimary}>
              <Search size={14} />
              {searching ? "Searching…" : "Search"}
            </button>
            {searched && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setSearchResults([]); setSearched(false); }}
                className={btnSecondary}
              >
                <X size={14} /> Clear
              </button>
            )}
          </form>

          {searched && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No samples found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Barcode</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Patient ID</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Position</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Rack</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Collected</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Discarded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {searchResults.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-slate-800 text-xs">{s.barcode}</td>
                        <td className="px-5 py-3 text-slate-600">{s.patient_id ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-500 capitalize">{s.sample_type ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono">{positionLabel(s.position)}</td>
                        <td className="px-5 py-3 text-slate-500">{s.lab_racks?.rack_name ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-500">{s.collection_date ?? "—"}</td>
                        <td className="px-5 py-3">
                          {s.discarded_at ? (
                            <span className="text-xs text-red-500">Discarded</span>
                          ) : (
                            <span className="text-xs text-emerald-600">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Create rack modal ── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-base">New Rack</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateRack} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rack Name *</label>
                <input
                  required
                  value={newRack.rack_name}
                  onChange={(e) => setNewRack((r) => ({ ...r, rack_name: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. RACK-2026-001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newRack.rack_type}
                  onChange={(e) => setNewRack((r) => ({ ...r, rack_type: e.target.value }))}
                  className={inputCls}
                >
                  <option value="normal">Normal (100 positions)</option>
                  <option value="igra">IGRA (40 positions)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newRack.rack_date}
                  onChange={(e) => setNewRack((r) => ({ ...r, rack_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <input
                  value={newRack.description}
                  onChange={(e) => setNewRack((r) => ({ ...r, description: e.target.value }))}
                  className={inputCls}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className={btnPrimary + " flex-1 justify-center"}>
                  {creating ? "Creating…" : "Create Rack"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className={btnSecondary}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
