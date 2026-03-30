"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { LoadingBars } from "@/components/ui/PageLoader";
import { hospitalDisplayName } from "@/lib/hospitalDisplayName";
import { LRIDS_PROGRESS_STYLES, type LridsProgressCssClass } from "@/lib/lrids/progressDisplay";

const REFRESH_INTERVAL_SEC = 30;

type LridsRow = {
  id: string;
  lab_number: string | null;
  test_name: string;
  section: string;
  section_label: string;
  status_text: string;
  status_css_class: LridsProgressCssClass;
};

type Props = {
  facilityId: string;
  initialToken: string;
};

const FALLBACK_LOGO = process.env.NEXT_PUBLIC_HOSPITAL_LOGO_URL || "";

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hhmmss = time.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const dateLine = time.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="text-right">
      <p
        className="font-bold tabular-nums text-white tracking-tight leading-none"
        style={{ fontSize: "clamp(2.5rem, 4vw, 4rem)" }}
      >
        {hhmmss}
      </p>
      <p className="text-lg sm:text-xl text-emerald-300 mt-2 font-medium">{dateLine}</p>
    </div>
  );
}

export default function LridsBoardClient({ facilityId, initialToken }: Props) {
  const [rows, setRows] = useState<LridsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hospitalName, setHospitalName] = useState(() => hospitalDisplayName(null));
  const [hospitalLogoUrl, setHospitalLogoUrl] = useState(FALLBACK_LOGO);
  const [error, setError] = useState<string | null>(null);
  const [refreshIn, setRefreshIn] = useState(REFRESH_INTERVAL_SEC);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({
        facilityId,
        token: initialToken,
      });
      const res = await fetch(`/api/lrids/data?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Failed to load");
        setRows([]);
        return;
      }
      setHospitalName(hospitalDisplayName(j.hospital_name as string | null));
      setHospitalLogoUrl(
        (typeof j.hospital_logo_url === "string" && j.hospital_logo_url) || FALLBACK_LOGO
      );
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch {
      setError("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, initialToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      setRefreshIn((s) => {
        if (s <= 1) {
          void load();
          return REFRESH_INTERVAL_SEC;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #042f2e 0%, #065f46 50%, #0f172a 100%)" }}
    >
      <header
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-6 sm:px-10 py-5 sm:py-6 border-b"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          {hospitalLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={hospitalLogoUrl}
              alt=""
              className="h-12 sm:h-16 w-auto object-contain flex-shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <Building2 size={28} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight truncate">
              {hospitalName}
            </h1>
            <p className="text-emerald-300 text-sm sm:text-base mt-1 font-medium">
              Laboratory Report Information Display System (LRIDS)
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <LiveClock />
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tabular-nums"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            Next refresh in {refreshIn}s
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-8 lg:px-10 py-4 sm:py-6 overflow-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center min-h-[14rem]">
            <LoadingBars onDark />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[14rem] text-center px-4">
            <p className="text-xl text-red-300 font-semibold">{error}</p>
            <p className="text-sm text-white/50 mt-2">Ask your administrator for a new display link.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[14rem] gap-2 text-center">
            <p className="text-2xl text-white/50 font-medium">No active requests in this window</p>
            <p className="text-lg text-white/30">Results will appear here automatically</p>
          </div>
        ) : (
          <div
            className="rounded-2xl sm:rounded-3xl overflow-hidden overflow-x-auto"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <table className="w-full min-w-[960px] text-left border-collapse">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {["Lab number", "Test(s)", "Status", "Section"].map((h) => (
                    <th
                      key={h}
                      className="px-4 sm:px-6 py-4 text-white/80 font-bold uppercase tracking-widest"
                      style={{ fontSize: "clamp(0.65rem, 1.1vw, 0.85rem)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const st = LRIDS_PROGRESS_STYLES[row.status_css_class] ?? LRIDS_PROGRESS_STYLES["progress-pending"];
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      }}
                    >
                      <td
                        className="px-4 sm:px-6 py-4 font-mono font-bold text-white align-middle"
                        style={{ fontSize: "clamp(1.1rem, 2vw, 1.75rem)" }}
                      >
                        {row.lab_number ?? "—"}
                      </td>
                      <td
                        className="px-4 sm:px-6 py-4 text-white/90 align-middle font-medium"
                        style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.25rem)" }}
                      >
                        {row.test_name}
                      </td>
                      <td className="px-4 sm:px-6 py-4 align-middle">
                        <span
                          className="inline-block"
                          style={{ color: st.color, fontWeight: st.fontWeight, fontSize: "clamp(0.95rem, 1.4vw, 1.25rem)" }}
                        >
                          {row.status_text}
                        </span>
                      </td>
                      <td
                        className="px-4 sm:px-6 py-4 text-white/85 align-middle"
                        style={{ fontSize: "clamp(0.9rem, 1.3vw, 1.15rem)" }}
                      >
                        {row.section_label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer
        className="px-6 sm:px-10 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <p className="text-xs sm:text-sm text-white/30">{hospitalName} · Powered by Kanta</p>
        <p className="text-xs text-white/25 tabular-nums">Data refresh every {REFRESH_INTERVAL_SEC} seconds</p>
      </footer>
    </div>
  );
}
