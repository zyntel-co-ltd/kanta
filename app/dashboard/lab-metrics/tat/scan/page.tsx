"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { queuedFetch, responseWasQueued } from "@/lib/sync-queue/queuedFetch";
import { parseTatQrPayload } from "@/lib/tat/qrPayload";

const QrScanner = dynamic(
  () => import("@/components/dashboard/QrScanner").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" /> }
);

type ScanCandidate = {
  id: string;
  lab_number: string | null;
  test_name: string;
  section: string;
  status: string;
  requested_at: string | null;
  section_time_in: string | null;
  section_time_out: string | null;
};

type ScanLookupResponse = {
  notFound: boolean;
  message?: string;
  patient?: {
    lab_number: string | null;
    requested_at: string | null;
  };
  pending_sections?: string[];
  candidates?: ScanCandidate[];
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function TatScanResultsPage() {
  const { facilityAuth } = useAuth();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  const canUse = !!facilityAuth?.canWrite;

  const [scanInput, setScanInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [lastScannedPayload, setLastScannedPayload] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [action, setAction] = useState<"receive" | "result">("receive");
  const [lookup, setLookup] = useState<ScanLookupResponse | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runLookup = useCallback(
    async (rawPayload: string) => {
      const trimmed = rawPayload.trim();
      if (!trimmed) return;

      setLookupLoading(true);
      setError(null);
      setFeedback(null);
      setLookup(null);

      try {
        const res = await fetch(
          `/api/tat/scan?${new URLSearchParams({
            facility_id: facilityId,
            qr_payload: trimmed,
          }).toString()}`,
          { cache: "no-store" }
        );
        const json = (await res.json().catch(() => null)) as ScanLookupResponse | null;
        if (!res.ok || !json) {
          setError((json as { error?: string } | null)?.error ?? "Failed to decode QR code");
          return;
        }
        setLookup(json);

        const firstPending = (json.candidates ?? []).find(
          (r) => r.status !== "resulted" || !r.section_time_out
        );
        setSelectedRequestId(firstPending?.id ?? "");
        setLastScannedPayload(trimmed);
      } catch {
        setError("Network error while scanning.");
      } finally {
        setLookupLoading(false);
      }
    },
    [facilityId]
  );

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      await runLookup(decodedText);
    },
    [runLookup]
  );

  const pendingRows = useMemo(() => {
    return (lookup?.candidates ?? []).filter(
      (r) => r.status !== "resulted" || !r.section_time_out
    );
  }, [lookup]);

  const submitCapture = useCallback(async () => {
    if (!selectedRequestId) {
      setError("Select a pending section request first.");
      return;
    }
    setSaveLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await queuedFetch("/api/tat/scan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facilityId,
          request_id: selectedRequestId,
          action,
        }),
      });
      const queued = responseWasQueued(res);
      if (!res.ok && !queued) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Failed to save capture");
      }
      setFeedback(
        queued
          ? "Saved offline. This section capture will sync when you reconnect."
          : `${action === "receive" ? "Receive" : "Result"} captured successfully.`
      );
      if (lastScannedPayload) {
        await runLookup(lastScannedPayload);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save capture");
    } finally {
      setSaveLoading(false);
    }
  }, [action, facilityId, lastScannedPayload, runLookup, selectedRequestId]);

  if (!canUse) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          Scan Results is available for lab technicians and above.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Scan Results</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Scan a sample QR to capture section time-in or time-out.
            </p>
          </div>
          <Link href="/dashboard/tat?tab=reception" className="text-sm font-medium text-[#21336a] hover:underline">
            <ArrowLeft size={16} className="inline mr-1" />
            Back
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-700">
            <Camera size={16} />
            <span className="text-sm font-medium">Camera scanner</span>
          </div>
          <QrScanner onScan={handleDecoded} onError={setError} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Manual QR payload
          </label>
          <div className="flex gap-2">
            <input
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runLookup(scanInput)}
              placeholder="Paste payload (e.g. LAB123:facility-id)"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => runLookup(scanInput)}
              disabled={lookupLoading}
              className="rounded-xl bg-[#21336a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : "Lookup"}
            </button>
          </div>
          {!!scanInput && (
            <p className="text-xs text-slate-500">
              Decoded: {parseTatQrPayload(scanInput).labNumber ?? "invalid payload"}
            </p>
          )}
        </div>

        {lookup?.notFound && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {lookup.message ?? "No active test request found for this QR code. Please rescan."}
          </div>
        )}

        {lookup && !lookup.notFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">
                Lab #{lookup.patient?.lab_number ?? "—"}
              </p>
              <p className="text-slate-600">Requested: {fmtDate(lookup.patient?.requested_at ?? null)}</p>
              <p className="text-slate-600">
                Pending sections: {(lookup.pending_sections ?? []).join(", ") || "None"}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending requests</p>
              {pendingRows.length === 0 ? (
                <p className="text-sm text-slate-600">No pending sections remaining.</p>
              ) : (
                <div className="space-y-2">
                  {pendingRows.map((row) => (
                    <label
                      key={row.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <input
                        type="radio"
                        name="selected-request"
                        checked={selectedRequestId === row.id}
                        onChange={() => setSelectedRequestId(row.id)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <p className="font-medium text-slate-900">{row.test_name}</p>
                        <p className="text-slate-600">
                          {row.section} · status {row.status}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAction("receive")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  action === "receive"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Receive (time-in)
              </button>
              <button
                type="button"
                onClick={() => setAction("result")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  action === "result"
                    ? "bg-[#21336a] text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Result (time-out)
              </button>
              <button
                type="button"
                onClick={submitCapture}
                disabled={saveLoading || !selectedRequestId}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
                Confirm capture
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={16} />
            {feedback}
          </div>
        )}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </div>
    </div>
  );
}
