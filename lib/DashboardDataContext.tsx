"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchDashboard, fetchScans, fetchDepartments } from "@/lib/api";
import type { DashboardStats, Department } from "@/types";
import type { ScanEvent } from "@/types";

const SEED_HOSPITAL_ID = "00000000-0000-0000-0000-000000000001";

type DashboardDataContextValue = {
  dashboard: DashboardStats | null;
  scans: ScanEvent[];
  departments: Department[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [scans, setScans] = useState<ScanEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, scansRes, deptsRes] = await Promise.all([
        fetchDashboard(SEED_HOSPITAL_ID),
        fetchScans(SEED_HOSPITAL_ID, 10),
        fetchDepartments(SEED_HOSPITAL_ID),
      ]);
      if (dashRes.data) setDashboard(dashRes.data);
      else setDashboard(null);
      if (scansRes.data) setScans(scansRes.data);
      else setScans([]);
      if (deptsRes.data) setDepartments(deptsRes.data);
      else setDepartments([]);
    } catch (err) {
      setError(String(err));
      setDashboard(null);
      setScans([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("equipment-added", handler);
    return () => window.removeEventListener("equipment-added", handler);
  }, []);

  return (
    <DashboardDataContext.Provider
      value={{ dashboard, scans, departments, loading, error, refresh: load }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    return {
      dashboard: null,
      scans: [],
      departments: [],
      loading: false,
      error: null,
      refresh: () => {},
    };
  }
  return ctx;
}
