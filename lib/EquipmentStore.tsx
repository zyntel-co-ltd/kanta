"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { Equipment } from "@/types";

type EquipmentStoreContextValue = {
  sessionEquipment: Equipment[];
  addSessionEquipment: (eq: Equipment) => void;
  updateSessionEquipment: (equipmentId: string, updates: Partial<Equipment>) => void;
  clearSessionEquipment: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
};

const EquipmentStoreContext = createContext<EquipmentStoreContextValue | null>(null);

export function EquipmentStoreProvider({ children }: { children: ReactNode }) {
  const [sessionEquipment, setSessionEquipment] = useState<Equipment[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const addSessionEquipment = useCallback((eq: Equipment) => {
    setSessionEquipment((prev) => {
      if (prev.some((e) => e.id === eq.id)) return prev;
      return [...prev, eq];
    });
  }, []);

  const updateSessionEquipment = useCallback((equipmentId: string, updates: Partial<Equipment>) => {
    setSessionEquipment((prev) =>
      prev.map((e) => (e.id === equipmentId ? { ...e, ...updates } : e))
    );
  }, []);

  const clearSessionEquipment = useCallback(() => setSessionEquipment([]), []);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <EquipmentStoreContext.Provider
      value={{
        sessionEquipment,
        addSessionEquipment,
        updateSessionEquipment,
        clearSessionEquipment,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </EquipmentStoreContext.Provider>
  );
}

export function useEquipmentStore() {
  const ctx = useContext(EquipmentStoreContext);
  if (!ctx) {
    return {
      sessionEquipment: [],
      addSessionEquipment: () => {},
      updateSessionEquipment: () => {},
      clearSessionEquipment: () => {},
      refreshKey: 0,
      triggerRefresh: () => {},
    };
  }
  return ctx;
}
