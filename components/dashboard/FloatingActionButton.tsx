"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AddEquipmentModal, { type CreatedEquipment } from "./AddEquipmentModal";
import { useEquipmentStore } from "@/lib/EquipmentStore";
import type { Equipment } from "@/types";

export default function FloatingActionButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const { addSessionEquipment, triggerRefresh } = useEquipmentStore();

  const handleSuccess = (equipment: CreatedEquipment) => {
    const eq: Equipment = {
      ...equipment,
      model: equipment.model ?? "",
      serial_number: equipment.serial_number ?? "",
      last_scanned_at: null,
      last_scanned_by: null,
      next_maintenance_at: null,
      location: equipment.location ?? null,
      status: (equipment.status as Equipment["status"]) ?? "operational",
      department: equipment.department ? { ...equipment.department, hospital_id: "", created_at: "" } : undefined,
    };
    addSessionEquipment(eq);
    triggerRefresh();
    router.refresh();
    window.dispatchEvent(new CustomEvent("equipment-added"));
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-600 text-white text-sm font-semibold rounded-2xl shadow-xl shadow-slate-600/35 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="Add Equipment"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>Add Equipment</span>
      </button>
      <AddEquipmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
