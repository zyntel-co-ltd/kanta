"use client";

import { type ReactNode } from "react";
import { Lock, LayoutGrid, Zap } from "lucide-react";

export type ModulePresence = "active" | "partial" | "locked";

export type ModuleTileProps = {
  moduleKey: string;
  presence: ModulePresence;
  title: string;
  description?: string;
  href?: string;
  children?: ReactNode;
  lockedMessage?: string;
};

export default function ModuleTile({
  moduleKey,
  presence,
  title,
  description,
  href,
  children,
  lockedMessage = "Module not configured",
}: ModuleTileProps) {
  if (presence === "locked") {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center min-h-[140px]"
        data-module={moduleKey}
      >
        <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center mb-3">
          <Lock size={22} className="text-slate-500" />
        </div>
        <p className="font-semibold text-slate-600">{title}</p>
        <p className="text-sm text-slate-400 mt-0.5">{lockedMessage}</p>
      </div>
    );
  }

  if (presence === "partial") {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col min-h-[140px]"
        data-module={moduleKey}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <LayoutGrid size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-amber-600">Partial view</p>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col min-h-[140px] hover:shadow-md transition-shadow"
      data-module={moduleKey}
    >
      {href ? (
        <a href={href} className="flex items-center gap-2 mb-3 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
            <Zap size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 group-hover:text-emerald-600">{title}</p>
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
          </div>
        </a>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Zap size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{title}</p>
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
