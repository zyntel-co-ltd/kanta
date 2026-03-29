"use client";

import Link from "next/link";
import { ScanSearch, Timer, ClipboardList, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const BASE_ACTIONS = [
  { label: "Scan equipment", href: "/dashboard/scan", icon: ScanSearch },
  { label: "View TAT", href: "/dashboard/tat", icon: Timer },
  { label: "QC Data Entry", href: "/dashboard/qc?tab=data", icon: ClipboardList },
];

export default function QuickActions() {
  const { facilityAuth, facilityAuthLoading } = useAuth();

  const actions = facilityAuthLoading
    ? BASE_ACTIONS
    : [
        ...BASE_ACTIONS,
        ...(facilityAuth?.canAccessAdminPanel
          ? [{ label: "Admin panel", href: "/dashboard/admin", icon: Shield }]
          : []),
      ];

  return (
    <div className="animate-slide-up stagger-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 block">
        Quick actions
      </span>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
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
