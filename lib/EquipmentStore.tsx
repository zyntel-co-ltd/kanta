"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Equipment } from "@/types";

type EquipmentStoreContextValue = {
  sessionEquipment: Equipment[];
  addSessionEquipment: (eq: Equipment) => void;
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

  const clearSessionEquipment = useCallback(() => setSessionEquipment([]), []);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <EquipmentStoreContext.Provider
      value={{
        sessionEquipment,
        addSessionEquipment,
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
      clearSessionEquipment: () => {},
      refreshKey: 0,
      triggerRefresh: () => {},
    };
  }
  return ctx;
}
