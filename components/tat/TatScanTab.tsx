"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, QrCode, Search, RefreshCw } from "lucide-react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";

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

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const colorClass =
    s === "resulted" || s === "completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : s === "in_progress" || s === "processing" || s === "received"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : s === "cancelled"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-amber-100 text-amber-700 border-amber-200";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
    </span>
  );
}

function QrCodeDisplay({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}&margin=10`;
  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt="Patient results QR code"
        width={220}
        height={220}
        className="rounded-xl border border-slate-200 shadow-sm"
      />
      <p className="text-xs text-slate-400 font-mono break-all text-center max-w-xs">{url}</p>
    </div>
  );
}

export default function TatScanTab() {
  const { facilityAuth } = useAuth();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;

  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<LookupMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [lridsUrl, setLridsUrl] = useState<string | null>(null);
  const [lridsLoading, setLridsLoading] = useState(false);

  const fetchLridsUrl = useCallback(async () => {
    if (!facilityId) return;
    setLridsLoading(true);
    try {
      const res = await fetch(`/api/lrids/token?facilityId=${encodeURIComponent(facilityId)}`);
      const j = await res.json().catch(() => ({})) as { token?: string };
      if (res.ok && j.token) {
        const url = `${window.location.origin}/lrids/${encodeURIComponent(facilityId)}?token=${encodeURIComponent(j.token)}`;
        setLridsUrl(url);
      }
    } finally {
      setLridsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    void fetchLridsUrl();
    inputRef.current?.focus();
  }, [fetchLridsUrl]);

  const runLookup = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      setError(null);
      setLoading(true);
      setMatches(null);
      try {
        const res = await fetch(
          `/api/test-requests/lookup?${new URLSearchParams({
            barcode: trimmed,
            facility_id: facilityId,
          })}`
        );
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof j.error === "string" ? j.error : "Lookup failed");
          return;
        }
        const found: LookupMatch[] = Array.isArray(j.matches) ? j.matches : [];
        setMatches(found);
        if (found.length === 0) {
          setError("No matching samples found. Ensure the LIMS connection is active.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [facilityId]
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <QrCode size={22} className="module-accent-text" />
          Patient Results QR Code
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Display this QR code in the waiting room so patients can scan it to see their results status. You can also look up a specific lab number below.
        </p>
      </div>

      {/* QR code for patients */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Patient Display Board QR Code</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchLridsUrl()}
            disabled={lridsLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={lridsLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          {lridsLoading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-slate-300" />
            </div>
          ) : lridsUrl ? (
            <>
              <QrCodeDisplay url={lridsUrl} />
              <p className="text-xs text-slate-500 text-center max-w-sm">
                Patients scan this code to view their sample status on the display board. Refresh the QR code periodically — display board links expire after 24 hours.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Could not generate QR code. Try refreshing.</p>
          )}
        </div>
      </div>

      {/* Manual staff lookup */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Search size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Staff Lookup — Enter Lab Number</span>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runLookup(barcodeInput)}
            placeholder="Lab number or accession number…"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]"
          />
          <button
            type="button"
            onClick={() => runLookup(barcodeInput)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl font-medium text-sm text-white transition-opacity disabled:opacity-50 flex items-center gap-2"
            style={{ background: "var(--module-primary)" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Lookup
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {matches && matches.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {matches.length} result{matches.length !== 1 ? "s" : ""} found
          </p>
          {matches.map((m, idx) => (
            <div
              key={`${m.test_name}-${idx}`}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{m.test_name}</p>
                  <p className="text-xs text-slate-500">{m.section}</p>
                </div>
                <StatusBadge status={m.current_status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-slate-500">Received: </span>
                  <span className="font-medium text-slate-700">{fmtShort(m.received_at)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Expected result: </span>
                  <span className="font-medium text-slate-700">{fmtShort(m.expected_result_at)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">TAT so far: </span>
                  <span className="font-medium text-slate-700">
                    {m.tat_so_far_minutes != null ? `${m.tat_so_far_minutes} min` : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
