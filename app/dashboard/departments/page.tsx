"use client";

import { useEffect, useState } from "react";
import { fetchDepartments, fetchEquipment } from "@/lib/api";
import type { Department } from "@/types";
import type { Equipment } from "@/types";
import { Building2, ChevronDown, ChevronUp, Users, Package } from "lucide-react";

import { DEFAULT_HOSPITAL_ID } from "@/lib/constants";

type DeptWithStats = Department & {
  equipmentCount: number;
  operationalCount: number;
  healthScore: number;
  technicians?: { name: string; avatar_initials?: string }[];
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DeptWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [deptsRes, equipRes] = await Promise.all([
          fetchDepartments(DEFAULT_HOSPITAL_ID),
          fetchEquipment(DEFAULT_HOSPITAL_ID),
        ]);

        if (deptsRes.error) {
          setError(deptsRes.error);
          setDepartments([]);
          return;
        }

        const depts = deptsRes.data ?? [];
        const equipment = (equipRes.data ?? []) as Equipment[];

        const countsByDept: Record<string, { total: number; operational: number }> = {};
        for (const eq of equipment) {
          const did = eq.department_id;
          if (!countsByDept[did]) countsByDept[did] = { total: 0, operational: 0 };
          countsByDept[did].total++;
          if (eq.status === "operational") countsByDept[did].operational++;
        }

        const withStats: DeptWithStats[] = depts.map((d: Department) => {
          const counts = countsByDept[d.id] ?? { total: 0, operational: 0 };
          const healthScore =
            counts.total > 0 ? Math.round((counts.operational / counts.total) * 100) : 0;
          const ext = d as DeptWithStats & { equipment?: unknown[]; technicians?: unknown[] };
          return {
            ...d,
            equipmentCount: counts.total,
            operationalCount: counts.operational,
            healthScore,
            technicians: ext.technicians as DeptWithStats["technicians"],
          };
        });

        setDepartments(withStats);
      } catch (err) {
        setError(String(err));
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Departments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All hospital departments with equipment and staff overview.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Departments</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          All hospital departments with equipment and staff overview.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {departments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No departments</p>
          <p className="text-sm text-slate-400 mt-1">Departments will appear once configured.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => {
            const isOpen = expanded === dept.id;
            const healthColor =
              dept.healthScore >= 90
                ? "bg-emerald-100 text-emerald-700"
                : dept.healthScore >= 70
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700";

            return (
              <div
                key={dept.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpanded(isOpen ? null : dept.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-emerald-600">
                          {dept.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{dept.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Package size={12} />
                          {dept.equipmentCount} equipment
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {dept.equipmentCount > 0 && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${healthColor}`}
                        >
                          {dept.healthScore}%
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronUp size={18} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-50">
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Package size={14} />
                        <span>{dept.operationalCount} operational</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users size={14} />
                        <span>Health: {dept.healthScore}%</span>
                      </div>
                    </div>
                    {dept.technicians && dept.technicians.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-50">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                          On duty
                        </p>
                        <div className="space-y-2">
                          {dept.technicians.map((t, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                                {t.avatar_initials ?? t.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm text-slate-700">{t.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
