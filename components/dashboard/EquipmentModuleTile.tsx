"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ModuleTile from "./ModuleTile";
import { getEquipmentPresence } from "@/lib/capability";
import type { CapabilityProfile } from "@/lib/capability";

import { DEFAULT_FACILITY_ID } from "@/lib/constants";

export default function EquipmentModuleTile() {
  const [presence, setPresence] = useState<"active" | "partial" | "locked">("active");
  const [equipmentCount, setEquipmentCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [capRes, eqRes] = await Promise.all([
          fetch(`/api/capability?facility_id=${DEFAULT_FACILITY_ID}`),
          fetch(`/api/v1/equipment?hospital_id=${DEFAULT_FACILITY_ID}`),
        ]);
        const capData = await capRes.json();
        const eqData = await eqRes.json();
        const profile = capData.data as CapabilityProfile | null;
        const count = Array.isArray(eqData.data) ? eqData.data.length : 0;
        setEquipmentCount(count);
        setPresence(getEquipmentPresence(profile, count));
      } catch {
        setPresence("active");
        setEquipmentCount(0);
      }
    };
    load();
  }, []);

  if (presence === "locked") {
    return (
      <ModuleTile
        moduleKey="equipment"
        presence="locked"
        title="Equipment"
        lockedMessage="Equipment module not configured"
      />
    );
  }

  if (presence === "partial") {
    return (
      <ModuleTile
        moduleKey="equipment"
        presence="partial"
        title="Equipment"
        href="/dashboard/equipment"
      >
        <p className="text-2xl font-bold text-slate-900">{equipmentCount}</p>
        <p className="text-sm text-slate-500">items · status only</p>
      </ModuleTile>
    );
  }

  return (
    <ModuleTile
      moduleKey="equipment"
      presence="active"
      title="Equipment"
      description="Full dashboard"
      href="/dashboard"
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        View full dashboard →
      </Link>
    </ModuleTile>
  );
}
