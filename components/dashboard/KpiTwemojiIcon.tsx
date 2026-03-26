"use client";

import type { ComponentType } from "react";
import {
  CheckCircle2,
  Clock3,
  Upload,
  CalendarDays,
  TrendingUp,
  BarChart3,
  Wallet,
  Banknote,
  XCircle,
  Inbox,
  AlarmClock,
  AlertTriangle,
} from "lucide-react";

/**
 * Twemoji asset keys (72×72 PNG on jsDelivr).
 * TAT + shared Lab Metrics KPIs (Tests, Numbers, Revenue, Performance).
 */
export type KpiTwemojiId =
  | "onTime"
  | "delayed"
  | "notUploaded"
  | "hourly"
  | "calendar"
  | "chartTrending"
  | "barChart"
  | "moneyBag"
  | "banknote"
  | "crossMark"
  | "pending"
  | "testsResulted"
  | "testsReceived"
  | "avgTat"
  | "breaches";

const ICONS: Record<KpiTwemojiId, ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  onTime: CheckCircle2,
  delayed: Clock3,
  notUploaded: Upload,
  hourly: AlarmClock,
  calendar: CalendarDays,
  chartTrending: TrendingUp,
  barChart: BarChart3,
  moneyBag: Wallet,
  banknote: Banknote,
  crossMark: XCircle,
  pending: Clock3,
  testsResulted: CheckCircle2,
  testsReceived: Inbox,
  avgTat: Clock3,
  breaches: AlertTriangle,
};

/**
 * Neutral Lucide icon tile for KPI cards.
 */
export default function KpiTwemojiIcon({
  id,
  size = 40,
}: {
  id: KpiTwemojiId;
  /** Pixel size of the emoji graphic */
  size?: number;
}) {
  const Icon = ICONS[id];
  const pad = 10;
  return (
    <div
      className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-white via-white to-slate-100 shadow-[0_4px_14px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/70 flex items-center justify-center"
      style={{ width: size + pad * 2, height: size + pad * 2 }}
      aria-hidden
    >
      <Icon size={size * 0.72} strokeWidth={1.8} className="text-slate-700" />
    </div>
  );
}
