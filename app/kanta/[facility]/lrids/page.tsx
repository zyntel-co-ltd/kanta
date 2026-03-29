"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useFlag } from "@/lib/featureFlags";

const REFRESH_MS = 30_000;
const HOSPITAL_NAME = process.env.NEXT_PUBLIC_HOSPITAL_NAME || "Zyntel Hospital";
const HOSPITAL_LOGO_URL = process.env.NEXT_PUBLIC_HOSPITAL_LOGO_URL || "";

type LRIDSItem = {
  id: string;
  lab_number?: string;
  status: string;
  resulted_at?: string;
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-4xl font-bold tabular-nums text-white tracking-tight leading-none">
        {time.toLocaleTimeString("en-UG", { hour12: true })}
      </p>
      <p className="text-lg text-emerald-300 mt-1">
        {time.toLocaleDateString("en-UG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

export default function LRIDSDisplayPage() {
  const params = useParams();
  const facilityId = (params.facility as string) ?? DEFAULT_FACILITY_ID;
  const showLrids = useFlag("show-lrids");

  const [data, setData] = useState<LRIDSItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!showLrids) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/tat/lrids?facility_id=${facilityId}&limit=100`
        );
        const json = await res.json();
        /* Sort: resulted first, then by resulted_at desc (most recent up) */
        const items: LRIDSItem[] = json.data ?? [];
        items.sort((a, b) => {
          const aTime = a.resulted_at ? new Date(a.resulted_at).getTime() : 0;
          const bTime = b.resulted_at ? new Date(b.resulted_at).getTime() : 0;
          return bTime - aTime;
        });
        setData(items);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const dataInterval = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(dataInterval);
  }, [facilityId, showLrids]);

  if (!showLrids) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-white"
        style={{ background: "linear-gradient(160deg, #042f2e 0%, #065f46 50%, #0f172a 100%)" }}
      >
        <Building2 size={40} className="text-emerald-300/80 mb-4" />
        <h1 className="text-xl font-semibold">LRIDS display is not enabled</h1>
        <p className="mt-2 text-sm text-emerald-100/80 max-w-md">
          This board is controlled for your facility by Zyntel. Contact your administrator if you need the live results display.
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #042f2e 0%, #065f46 50%, #0f172a 100%)" }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-10 py-6 border-b"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        {/* Hospital branding */}
        <div className="flex items-center gap-5">
          {HOSPITAL_LOGO_URL ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={HOSPITAL_LOGO_URL}
              alt={HOSPITAL_NAME}
              className="h-14 w-auto object-contain"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <Building2 size={28} className="text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">
              {HOSPITAL_NAME}
            </h1>
            <p className="text-emerald-300 text-base mt-1.5 font-medium">
              Laboratory Results Information Display
            </p>
          </div>
        </div>

        {/* Live clock */}
        <LiveClock />
      </header>

      {/* ── Results table ── */}
      <main className="flex-1 px-10 py-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-emerald-400 animate-spin"
              style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#34d399" }}
            />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-2xl text-white/50 font-medium">No results available at this time</p>
            <p className="text-lg text-white/30">Results will appear here automatically</p>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {/* Table header */}
            <div
              className="grid grid-cols-2 px-10 py-5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)" }}
            >
              <p className="text-xl font-bold text-white/80 uppercase tracking-widest">
                Patient Identifier
              </p>
              <p className="text-xl font-bold text-white/80 uppercase tracking-widest">
                Status
              </p>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {data.map((row, i) => {
                const isReady = row.status === "resulted";
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-2 px-10 items-center transition-colors"
                    style={{
                      paddingTop: "1.25rem",
                      paddingBottom: "1.25rem",
                      background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Patient identifier (lab number) */}
                    <p
                      className="font-mono font-bold text-white tracking-wide"
                      style={{ fontSize: "1.875rem" }}
                    >
                      {row.lab_number ?? "—"}
                    </p>

                    {/* Status badge */}
                    <div>
                      <span
                        className="inline-flex items-center gap-3 rounded-2xl font-bold"
                        style={{
                          fontSize: "1.5rem",
                          padding: "0.5rem 1.5rem",
                          background: isReady ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          color: isReady ? "#6ee7b7" : "#fcd34d",
                          border: `1px solid ${isReady ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"}`,
                        }}
                      >
                        <span
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${isReady ? "" : "animate-pulse"}`}
                          style={{ background: isReady ? "#10b981" : "#f59e0b" }}
                        />
                        {isReady ? "Ready for Collection" : "In Progress"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="px-10 py-4 border-t flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm text-white/30">
          {HOSPITAL_NAME} · Laboratory Information System · Powered by Kanta
        </p>
        <p className="text-sm text-white/20 tabular-nums">
          Auto-refreshes every 30 seconds
        </p>
      </footer>
    </div>
  );
}
