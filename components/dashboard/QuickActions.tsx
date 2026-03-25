"use client";

import Link from "next/link";
import { ScanSearch, Timer, ClipboardList } from "lucide-react";

const ACTIONS = [
  { label: "Scan equipment", href: "/dashboard/scan", icon: ScanSearch },
  { label: "View TAT", href: "/dashboard/tat", icon: Timer },
  { label: "QC Data Entry", href: "/dashboard/qc?tab=data", icon: ClipboardList },
];

/**
 * Quick access to common tasks on the home page.
 */
export default function QuickActions() {
  return (
    <div className="animate-slide-up stagger-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 block">
        Quick actions
      </span>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Icon size={16} strokeWidth={2} />
              {a.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
