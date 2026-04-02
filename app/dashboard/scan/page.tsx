"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { fetchEquipment, fetchEquipmentByQr } from "@/lib/api";
import { useLogScan } from "@/lib/useLogScan";
import type { Equipment } from "@/types";
import { CheckCircle2, Search, ScanLine, Loader2, TestTube2 } from "lucide-react";

import { DEFAULT_FACILITY_ID, DEFAULT_HOSPITAL_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { useFlag } from "@/lib/featureFlags";
import { useSearchParams } from "next/navigation";

const DEFAULT_SCANNED_BY = "Staff"; // TODO: from auth

const QrScanner = dynamic(
  () => import("@/components/dashboard/QrScanner").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" /> }
);

const statusOptions = [
  { value: "operational", label: "Operational" },
  { value: "maintenance", label: "Maintenance" },
  { value: "offline", label: "Offline" },
  { value: "retired", label: "Retired" },
] as const;

type LookupMatch = {
  section: string;
  test_name: string;
  received_at: string | null;
  expected_result_at: string | null;
  current_status: string;
  tat_so_far_minutes: number | null;
};

function fmtShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export default function ScanPage() {
  const { facilityAuth } = useAuth();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  const showSampleScan = useFlag("show-sample-scan");
  const searchParams = useSearchParams();
  const requestedPurpose = searchParams.get("scanPurpose") ?? searchParams.get("purpose");

  const [scanPurpose, setScanPurpose] = useState<"equipment" | "sample">("equipment");
  const [mode, setMode] = useState<"scan" | "search">("scan");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [status, setStatus] = useState<(typeof statusOptions)[number]["value"]>("operational");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Equipment[]>([]);
  const [searching, setSearching] = useState(false);

  const [sampleBarcodeInput, setSampleBarcodeInput] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleMatches, setSampleMatches] = useState<LookupMatch[] | null>(null);

  const logScanFn = useLogScan();

  // Allow deep-linking into sample lookup mode from other modules (e.g. TAT → QR sample lookup).
  // Gated by `show-sample-scan` so we never render sample lookup when the feature flag is off.
  useEffect(() => {
    if (requestedPurpose === "sample" && showSampleScan) setScanPurpose("sample");
  }, [requestedPurpose, showSampleScan]);

  const runSampleLookup = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setError(null);
    setSampleLoading(true);
    setSampleMatches(null);
    try {
      const res = await fetch(
        `/api/test-requests/lookup?${new URLSearchParams({
          barcode: trimmed,
          facility_id: facilityId,
        }).toString()}`
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Lookup failed");
        setSampleLoading(false);
        return;
      }
      const matches = Array.isArray(j.matches) ? (j.matches as LookupMatch[]) : [];
      setSampleMatches(matches);
      if (matches.length === 0) {
        setError("Sample not found. Ensure this facility's LIMS is connected.");
      }
    } catch {
      setError("Network error");
      setSampleMatches(null);
    } finally {
      setSampleLoading(false);
    }
  }, [facilityId]);

  const handleQrDecode = useCallback(
    async (qrCode: string) => {
      if (scanPurpose === "sample") {
        await runSampleLookup(qrCode);
        return;
      }
      setError(null);
      setSuccess(false);
      const res = await fetchEquipmentByQr(DEFAULT_HOSPITAL_ID, qrCode);
      if (res.error) {
        setError(res.error);
        return;
      }
      const list = res.data ?? [];
      if (list.length === 0) {
        setError("Equipment not found. QR code may be invalid or not registered.");
        return;
      }
      setSelectedEquipment(list[0] as Equipment);
    },
    [scanPurpose, runSampleLookup]
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    const res = await fetchEquipment(DEFAULT_HOSPITAL_ID);
    setSearching(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const all = (res.data ?? []) as Equipment[];
    const q = searchQuery.trim().toLowerCase();
    const filtered = all.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.qr_code?.toLowerCase().includes(q) ||
        e.serial_number?.toLowerCase().includes(q)
    );
    setSearchResults(filtered);
    if (filtered.length === 0) setError("No equipment found.");
    else setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedEquipment) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    const result = await logScanFn({
      equipment_id: selectedEquipment.id,
      hospital_id: DEFAULT_HOSPITAL_ID,
      scanned_by: DEFAULT_SCANNED_BY,
      status_at_scan: status,
    });
    setSubmitting(false);
    if (result.success) {
      setSuccess(true);
      setSelectedEquipment(null);
      setSearchResults([]);
      setSearchQuery("");
      window.dispatchEvent(new CustomEvent("equipment-updated"));
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error ?? "Failed to log scan");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {scanPurpose === "equipment" ? "Scan equipment" : "Sample lookup"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {scanPurpose === "equipment"
              ? "Scan equipment QR codes or search the registry, then record status."
              : "Scan a sample barcode to look up test status (operational data only)."}
          </p>
        </div>
        <a
          href="/scan"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Open full-screen scanner (mobile) →
        </a>
      </div>

      {showSampleScan && (
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
          <button
            type="button"
            onClick={() => {
              setScanPurpose("equipment");
              setSampleMatches(null);
              setSampleBarcodeInput("");
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              scanPurpose === "equipment" ? "bg-white shadow text-emerald-600" : "text-slate-600"
            }`}
          >
            <ScanLine size={16} className="inline mr-2 -mt-0.5" />
            Equipment
          </button>
          <button
            type="button"
            onClick={() => {
              setScanPurpose("sample");
              setSelectedEquipment(null);
              setSearchResults([]);
              setSuccess(false);
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              scanPurpose === "sample" ? "bg-white shadow text-emerald-600" : "text-slate-600"
            }`}
          >
            <TestTube2 size={16} className="inline mr-2 -mt-0.5" />
            Sample lookup
          </button>
        </div>
      )}

      {scanPurpose === "equipment" && (
        <>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setMode("scan")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "scan" ? "bg-white shadow text-emerald-600" : "text-slate-600"
              }`}
            >
              <ScanLine size={16} className="inline mr-2 -mt-0.5" />
              Scan QR
            </button>
            <button
              type="button"
              onClick={() => setMode("search")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "search" ? "bg-white shadow text-emerald-600" : "text-slate-600"
              }`}
            >
              <Search size={16} className="inline mr-2 -mt-0.5" />
              Search
            </button>
          </div>

          {mode === "scan" && (
            <div className="relative">
              <QrScanner onScan={handleQrDecode} onError={setError} />
            </div>
          )}

          {mode === "search" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name, QR code, or serial..."
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {searching ? <Loader2 size={18} className="animate-spin" /> : "Search"}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {searchResults.map((eq) => (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => {
                        setSelectedEquipment(eq);
                        setSearchResults([]);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <p className="font-medium text-slate-800">{eq.name}</p>
                      <p className="text-xs text-slate-500">
                        {eq.department?.name ?? "—"} · {eq.qr_code}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(selectedEquipment || success) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              {success ? (
                <div className="flex items-center gap-3 text-emerald-600">
                  <CheckCircle2 size={24} />
                  <span className="font-medium">Scan recorded successfully</span>
                </div>
              ) : selectedEquipment ? (
                <>
                  <p className="text-sm font-medium text-slate-500 mb-2">Selected equipment</p>
                  <p className="font-semibold text-slate-800">{selectedEquipment.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedEquipment.department?.name ?? "—"} · {selectedEquipment.qr_code}
                  </p>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Current status</label>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatus(opt.value)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            status === opt.value
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                      Record scan
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEquipment(null)}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </>
      )}

      {scanPurpose === "sample" && (
        <div className="space-y-4">
          <div className="relative">
            <QrScanner onScan={handleQrDecode} onError={setError} mode="qr-and-barcode" />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={sampleBarcodeInput}
              onChange={(e) => setSampleBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSampleLookup(sampleBarcodeInput)}
              placeholder="Or type barcode / accession…"
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => runSampleLookup(sampleBarcodeInput)}
              disabled={sampleLoading}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {sampleLoading ? <Loader2 size={18} className="animate-spin" /> : "Lookup"}
            </button>
          </div>

          {sampleMatches && sampleMatches.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</p>
              {sampleMatches.map((m, idx) => (
                <div
                  key={`${m.test_name}-${idx}`}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm space-y-1.5"
                >
                  <p>
                    <span className="text-slate-500">Section:</span>{" "}
                    <span className="font-medium text-slate-800">{m.section}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Test:</span>{" "}
                    <span className="font-medium text-slate-800">{m.test_name}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Received:</span>{" "}
                    <span className="text-slate-800">{fmtShort(m.received_at)}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Expected result:</span>{" "}
                    <span className="text-slate-800">{fmtShort(m.expected_result_at)}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Status:</span>{" "}
                    <span className="font-medium text-slate-800">{m.current_status}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">TAT so far:</span>{" "}
                    <span className="text-slate-800">
                      {m.tat_so_far_minutes != null ? `${m.tat_so_far_minutes} min` : "—"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}
    </div>
  );
}
