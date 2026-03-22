"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Layers, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

type AnomalyFlag = {
  id: string;
  section: string;
  test_name: string;
  tat_minutes: number;
  baseline_mean: number;
  z_score: number;
  deviation_pct: number;
  confidence_score: number;
  is_cluster: boolean;
  cluster_size: number;
  reason_text: string;
  flagged_at: string;
};

type AnomalyResponse = {
  anomaly_count: number;
  cluster_count: number;
  total_events: number;
  flags: AnomalyFlag[];
};

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "text-red-600 bg-red-50" : pct >= 60 ? "text-amber-600 bg-amber-50" : "text-slate-500 bg-slate-100";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${color}`}>
      {pct}% confidence
    </span>
  );
}

function ZScorePill({ z }: { z: number }) {
  const abs = Math.abs(z);
  const up = z > 0;
  const color = abs >= 3 ? "text-red-600 bg-red-50 border-red-200" : abs >= 2.5 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-slate-600 bg-slate-50 border-slate-200";
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold ${color}`}>
      <Icon size={11} />
      z={z.toFixed(2)}
    </span>
  );
}

export default function AnomalyPanel({
  facilityId = DEFAULT_FACILITY_ID,
  days = 7,
  compact = false,
}: {
  facilityId?: string;
  days?: number;
  compact?: boolean;
}) {
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tat/anomalies?facility_id=${facilityId}&days=${days}`);
      if (res.ok) setData(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, [facilityId, days]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-40 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data || data.anomaly_count === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">No anomalies detected</p>
          <p className="text-xs text-emerald-600">All TAT events within 2 standard deviations of the {days}-day baseline.</p>
        </div>
      </div>
    );
  }

  const displayFlags = showAll ? data.flags : data.flags.slice(0, compact ? 3 : 5);

  return (
    <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={14} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">
              TAT Anomaly Detection
            </p>
            <p className="text-xs text-amber-600">
              {data.anomaly_count} flag{data.anomaly_count !== 1 ? "s" : ""}
              {data.cluster_count > 0 && ` · ${data.cluster_count} cluster${data.cluster_count !== 1 ? "s" : ""}`}
              {" "}· {data.total_events} events analysed ({days}d)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Flags */}
      <div className="divide-y divide-slate-50">
        {displayFlags.map((flag) => {
          const isOpen = expanded === flag.id;
          return (
            <div key={flag.id} className="group">
              <button
                className="w-full text-left px-4 py-3 hover:bg-slate-50/80 transition-colors"
                onClick={() => setExpanded(isOpen ? null : flag.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {flag.is_cluster && (
                      <div title={`Cluster of ${flag.cluster_size}`}>
                        <Layers size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {flag.section}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600 truncate">{flag.test_name}</span>
                        {flag.is_cluster && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                            CLUSTER ×{flag.cluster_size}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <ZScorePill z={flag.z_score} />
                        <span className="text-xs text-slate-500">
                          {Math.round(flag.tat_minutes)} min
                          {" "}({flag.deviation_pct > 0 ? "+" : ""}{flag.deviation_pct.toFixed(0)}% vs {Math.round(flag.baseline_mean)} min baseline)
                        </span>
                        <ConfidenceBadge score={flag.confidence_score} />
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400 flex-shrink-0">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Reason — always visible, truncated */}
                {!isOpen && (
                  <p className="text-xs text-slate-500 mt-1.5 ml-0 line-clamp-1 leading-relaxed">
                    {flag.reason_text}
                  </p>
                )}
              </button>

              {/* Expanded reason */}
              {isOpen && (
                <div className="px-4 pb-3 pt-0">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p className="text-xs text-slate-600 leading-relaxed">{flag.reason_text}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Flagged {new Date(flag.flagged_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {data.flags.length > (compact ? 3 : 5) && (
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-emerald-700 font-medium hover:text-emerald-800"
          >
            {showAll ? "Show fewer" : `Show all ${data.anomaly_count} anomalies`}
          </button>
        </div>
      )}
    </div>
  );
}
