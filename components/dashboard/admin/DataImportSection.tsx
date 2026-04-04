"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, FileUp, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { LoadingBars } from "@/components/ui/PageLoader";

type DataImportSectionProps = {
  embedded?: boolean;
};

export function DataImportSection({ embedded = false }: DataImportSectionProps) {
  const { facilityAuth, facilityAuthLoading } = useAuth();
  const router = useRouter();
  const facilityId = facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    job_id: string;
    total_rows: number;
    inserted: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.canAccessAdminPanel) {
      router.replace("/dashboard/home");
    }
  }, [facilityAuthLoading, facilityAuth, router]);

  const onSubmit = useCallback(async () => {
    if (!facilityId || !file) {
      setToast({ type: "error", message: "Choose a CSV or JSON file" });
      return;
    }
    setUploading(true);
    setToast(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("facility_id", facilityId);
      fd.set("file", file);
      const res = await fetch("/api/admin/data-import", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Import failed");
      setResult({
        job_id: data.job_id,
        total_rows: data.total_rows,
        inserted: data.inserted,
        skipped: data.skipped,
        failed: data.failed,
      });
      setToast({ type: "success", message: "Import finished" });
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }, [facilityId, file]);

  if (facilityAuthLoading || !facilityAuth?.canAccessAdminPanel) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingBars />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
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
          <FileUp size={24} className="text-[var(--module-primary)]" />
          Data import
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload historical test requests (CSV or JSON, max 10MB). Rows are deduplicated per facility, lab number,
          test, section, and day. <code className="text-xs bg-slate-100 px-1 rounded">purge_after</code> is set from
          your lab number retention setting.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">File</label>
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
            className="block w-full text-sm text-slate-600"
          />
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={uploading || !file}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--module-primary)] text-white text-sm font-medium disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
          {uploading ? "Importing…" : "Run import"}
        </button>
      </div>

      {result && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 space-y-1">
          <p>
            <span className="font-medium">Job</span>{" "}
            <code className="text-xs bg-white px-1 rounded">{result.job_id}</code>
          </p>
          <p>
            Rows: {result.total_rows} · inserted {result.inserted} · skipped {result.skipped} · failed{" "}
            {result.failed}
          </p>
        </div>
      )}

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
