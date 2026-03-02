// ─── Core domain types for Kanta ───────────────────────────────────────────

export type EquipmentStatus = "operational" | "maintenance" | "offline" | "retired";

export type Department = {
  id: string;
  name: string;
  hospital_id: string;
  created_at: string;
};

export type Equipment = {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  qr_code: string;
  department_id: string;
  department?: Department;
  status: EquipmentStatus;
  last_scanned_at: string | null;
  last_scanned_by: string | null;
  location: string | null;
  next_maintenance_at: string | null;
  created_at: string;
};

export type ScanEvent = {
  id: string;
  equipment_id: string;
  equipment?: Equipment;
  scanned_by: string;
  status_at_scan: EquipmentStatus;
  location: string | null;
  notes: string | null;
  synced: boolean;
  created_at: string;
};

export type Technician = {
  id: string;
  name: string;
  avatar_initials: string;
  department_id: string;
  on_duty: boolean;
  shift_start: string | null;
};

// ─── API response shapes ────────────────────────────────────────────────────

export type DashboardKpi = {
  critical_alerts: number;
  equipment_scanned_this_week: number;
  maintenance_due: number;
  fleet_health_score: number;
  scanned_change: number;
  maintenance_change: number;
  health_change: number;
};

export type DashboardStats = {
  kpi: DashboardKpi;
  equipment_by_category: { name: string; value: number; color: string }[];
  daily_scans: { day: string; scans: number }[];
  equipment_status_monthly: {
    month: string;
    operational: number;
    maintenance: number;
    retired: number;
  }[];
  inventory: {
    accuracy: number;
    restock_due_days: number;
    breakdown: { label: string; value: number; color: string }[];
  };
};

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };
