"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import { useDashboardData } from "@/lib/DashboardDataContext";

type DeptWithExtras = {
  id: string;
  name: string;
  equipmentCount?: number;
  healthScore?: number;
  technicians?: { name: string; time?: string; avatar_initials?: string }[];
};

export default function DepartmentsPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { departments, loading } = useDashboardData();

  const depts: DeptWithExtras[] = departments.map((d: DeptWithExtras & { equipment?: unknown[] }) => ({
    id: d.id,
    name: d.name,
    equipmentCount: Array.isArray(d.equipment) ? d.equipment.length : undefined,
    healthScore: d.healthScore ?? 0,
    technicians: d.technicians ?? [],
  }));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="h-48 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Departments</h3>
        <button className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white hover:bg-emerald-600 transition-colors">
          <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="space-y-1.5">
        {depts.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No departments</p>
        ) : (
          depts.map((dept) => {
            const isOpen = expanded === dept.id;
            const healthScore = dept.healthScore ?? 0;
            const healthColor =
              healthScore >= 90
                ? "text-emerald-600 bg-emerald-50"
                : healthScore >= 80
                ? "text-emerald-600 bg-emerald-50"
                : "text-amber-600 bg-amber-50";
            const techs = dept.technicians ?? [];

            return (
              <div
                key={dept.id}
                className="border border-slate-100 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : dept.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-600">
                        {dept.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {dept.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {dept.equipmentCount ?? 0} items
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {healthScore > 0 && (
                      <span className={clsx("text-xs font-bold px-1.5 py-0.5 rounded-full", healthColor)}>
                        {healthScore}%
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronUp size={13} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={13} className="text-slate-400" />
                    )}
                  </div>
                </button>

                {isOpen && techs.length > 0 && (
                  <div className="px-3 pb-3 pt-2 space-y-2 border-t border-slate-50">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      On Duty
                    </p>
                    {techs.map((tech, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                          {tech.avatar_initials ?? tech.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {tech.name}
                          </p>
                          {tech.time && (
                            <p className="text-xs text-slate-400">{tech.time}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
