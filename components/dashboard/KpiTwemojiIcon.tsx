"use client";

import Image from "next/image";

const TWEMOJI_BASE =
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72";

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

const FILES: Record<KpiTwemojiId, string> = {
  onTime: "2705",
  delayed: "1f550",
  notUploaded: "1f4e4",
  hourly: "23f3",
  calendar: "1f4c5",
  chartTrending: "1f4c8",
  barChart: "1f4ca",
  moneyBag: "1f4b0",
  banknote: "1f4b5",
  crossMark: "274c",
  pending: "23f3",
  testsResulted: "2705",
  testsReceived: "1f4e5",
  avgTat: "23f3",
  breaches: "26a0",
};

export function kpiTwemojiSrc(id: KpiTwemojiId): string {
  return `${TWEMOJI_BASE}/${FILES[id]}.png`;
}

/**
 * Colorful Twemoji icon in a soft “app tile” frame (similar to glossy 3D-style emoji in dashboards).
 */
export default function KpiTwemojiIcon({
  id,
  size = 40,
}: {
  id: KpiTwemojiId;
  /** Pixel size of the emoji graphic */
  size?: number;
}) {
  const pad = 10;
  return (
    <div
      className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-white via-white to-slate-100 shadow-[0_4px_14px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/70 flex items-center justify-center"
      style={{ width: size + pad * 2, height: size + pad * 2 }}
      aria-hidden
    >
      <Image
        src={kpiTwemojiSrc(id)}
        alt=""
        width={size}
        height={size}
        className="object-contain select-none [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.1))]"
        unoptimized
      />
    </div>
  );
}
