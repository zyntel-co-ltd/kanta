"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
} from "lucide-react";
import Link from "next/link";

const SEED_FACILITY_ID = "00000000-0000-0000-0000-000000000001";

const LAB_SECTIONS = [
  "CHEMISTRY",
  "HAEMATOLOGY",
  "MICROBIOLOGY",
  "REFERRAL",
  "SEROLOGY",
  "N/A",
];

const TAT_OPTIONS = [30, 45, 60, 90, 240, 1440, 4320, 7200, 17280];

type MetaRecord = {
  id: string;
  testName: string;
  section: string;
  price: number;
  tatMinutes: number;
};

function formatUgx(n: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MetaPage() {
  const [data, setData] = useState<MetaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MetaRecord | null>(null);
  const [form, setForm] = useState({
    testName: "",
    section: "CHEMISTRY",
    price: 0,
    tatMinutes: 60,
  });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: SEED_FACILITY_ID });
      if (section !== "all") params.set("section", section);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/meta?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [section, search]);

  const handleAdd = () => {
    setEditing(null);
    setForm({ testName: "", section: "CHEMISTRY", price: 0, tatMinutes: 60 });
    setModalOpen(true);
  };

  const handleEdit = (r: MetaRecord) => {
    setEditing(r);
    setForm({
      testName: r.testName,
      section: r.section,
      price: r.price,
      tatMinutes: r.tatMinutes,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editing ? `/api/meta/${editing.id}` : "/api/meta";
      const method = editing ? "PATCH" : "POST";
      const body = editing
        ? { testName: form.testName, section: form.section, price: form.price, tatMinutes: form.tatMinutes }
        : {
            facility_id: SEED_FACILITY_ID,
            testName: form.testName,
            section: form.section,
            price: form.price,
            tatMinutes: form.tatMinutes,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");
      setToast({ message: editing ? "Updated" : "Created", type: "success" });
      setModalOpen(false);
      fetchData();
    } catch {
      setToast({ message: "Failed to save", type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    try {
      const res = await fetch(`/api/meta/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setToast({ message: "Deleted", type: "success" });
      fetchData();
    } catch {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const handleExportCSV = () => {
    const headers = ["Test Name", "Section", "Price (UGX)", "TAT (min)"];
    const rows = data.map((r) => [r.testName, r.section, r.price, r.tatMinutes]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Meta-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Meta
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Test catalog: name, section, price, TAT.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tests"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Tests
          </Link>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={14} />
            Add Test
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search test name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm w-64"
          />
        </div>
        <div>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            <option value="all">All sections</option>
            {LAB_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Database size={16} className="text-indigo-600" />
          <span className="font-semibold text-slate-800">Test Catalog</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No tests. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">
                    Test Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">
                    Section
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">
                    Price
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">
                    TAT (min)
                  </th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.testName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.section}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatUgx(r.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.tatMinutes}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editing ? "Edit Test" : "Add New Test"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Test Name *
                </label>
                <input
                  type="text"
                  value={form.testName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, testName: e.target.value }))
                  }
                  placeholder="e.g. FBC"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  readOnly={!!editing}
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Section *
                </label>
                <select
                  value={form.section}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, section: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {LAB_SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price (UGX) *
                </label>
                <input
                  type="number"
                  value={form.price || ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      price: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  min={0}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  TAT (minutes) *
                </label>
                <select
                  value={form.tatMinutes}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      tatMinutes: parseInt(e.target.value, 10) || 60,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {TAT_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  !form.testName ||
                  !form.section ||
                  form.price <= 0 ||
                  form.tatMinutes <= 0
                }
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
