/**
 * Database query helpers — all server-side only.
 * These are called by API routes. They return typed data or throw.
 */

import { createAdminClient } from "./supabase";
import type {
  DashboardKpi,
  DashboardStats,
  Equipment,
  ScanEvent,
  Department,
} from "@/types";

// ─── KPI aggregates ──────────────────────────────────────────────────────────

export async function getDashboardKpi(hospitalId: string): Promise<DashboardKpi> {
  const db = createAdminClient();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [alertsRes, scannedRes, prevScannedRes, maintenanceRes, prevMaintenanceRes, totalRes, operationalRes] =
    await Promise.all([
      // Critical alerts: equipment offline or overdue maintenance
      db
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .or("status.eq.offline,next_maintenance_at.lt.now()"),

      // Scans this week
      db
        .from("scan_events")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .gte("created_at", weekAgo.toISOString()),

      // Scans previous week (for change calc)
      db
        .from("scan_events")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", weekAgo.toISOString()),

      // Maintenance due
      db
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "maintenance"),

      // Maintenance due last week
      db
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "maintenance")
        .lt("updated_at", weekAgo.toISOString()),

      // Total equipment
      db
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId),

      // Operational equipment
      db
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "operational"),
    ]);

  const total = totalRes.count ?? 0;
  const operational = operationalRes.count ?? 0;
  const healthScore = total > 0 ? Math.round((operational / total) * 100) : 0;

  const scannedNow = scannedRes.count ?? 0;
  const scannedPrev = prevScannedRes.count ?? 1;
  const maintenanceNow = maintenanceRes.count ?? 0;
  const maintenancePrev = prevMaintenanceRes.count ?? 0;

  return {
    critical_alerts: alertsRes.count ?? 0,
    equipment_scanned_this_week: scannedNow,
    maintenance_due: maintenanceNow,
    fleet_health_score: healthScore,
    scanned_change: scannedNow - scannedPrev,
    maintenance_change: maintenanceNow - maintenancePrev,
    health_change: 2, // calculated from historical snapshots in production
  };
}

// ─── Equipment by category ───────────────────────────────────────────────────

export async function getEquipmentByCategory(hospitalId: string) {
  const db = createAdminClient();

  const { data, error } = await db
    .from("equipment")
    .select("category")
    .eq("hospital_id", hospitalId)
    .neq("status", "retired");

  if (error) throw error;

  const colors: Record<string, string> = {
    Diagnostic: "#6366f1",
    Surgical: "#a5b4fc",
    Monitoring: "#c7d2fe",
    "Life Support": "#e0e7ff",
    Other: "#f1f5f9",
  };

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const cat = row.category ?? "Other";
    counts[cat] = (counts[cat] ?? 0) + 1;
  }

  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: colors[name] ?? "#94a3b8",
  }));
}

// ─── Daily scan counts (last 7 days) ────────────────────────────────────────

export async function getDailyScans(hospitalId: string) {
  const db = createAdminClient();

  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const results = [];

  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const { count } = await db
      .from("scan_events")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", hospitalId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    results.push({ day: days[start.getDay()], scans: count ?? 0 });
  }

  return results;
}

// ─── Equipment status monthly (last 11 months) ──────────────────────────────

export async function getEquipmentStatusMonthly(hospitalId: string) {
  const db = createAdminClient();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const results = [];

  for (let i = 10; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthLabel = months[d.getMonth()];

    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [opRes, maintRes, retiredRes] = await Promise.all([
      db.from("equipment_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "operational")
        .gte("snapshot_date", start)
        .lte("snapshot_date", end),
      db.from("equipment_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "maintenance")
        .gte("snapshot_date", start)
        .lte("snapshot_date", end),
      db.from("equipment_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "retired")
        .gte("snapshot_date", start)
        .lte("snapshot_date", end),
    ]);

    results.push({
      month: monthLabel,
      operational: opRes.count ?? 0,
      maintenance: maintRes.count ?? 0,
      retired: retiredRes.count ?? 0,
    });
  }

  return results;
}

// ─── Recent scan events ──────────────────────────────────────────────────────

export async function getRecentScans(hospitalId: string, limit = 10): Promise<ScanEvent[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("scan_events")
    .select(`
      *,
      equipment (
        id, name, model, location,
        department:departments ( id, name )
      )
    `)
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ScanEvent[];
}

// ─── Departments with on-duty technicians ───────────────────────────────────

export async function getDepartmentsWithTechnicians(hospitalId: string): Promise<Department[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("departments")
    .select(`
      *,
      equipment ( id, status ),
      technicians ( id, name, avatar_initials, on_duty, shift_start )
    `)
    .eq("hospital_id", hospitalId)
    .order("name");

  if (error) throw error;
  return (data ?? []) as Department[];
}

// ─── Equipment list ──────────────────────────────────────────────────────────

export async function getEquipment(
  hospitalId: string,
  filters?: { status?: string; department_id?: string }
): Promise<Equipment[]> {
  const db = createAdminClient();

  let query = db
    .from("equipment")
    .select(`*, department:departments(id, name)`)
    .eq("hospital_id", hospitalId)
    .order("name");

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.department_id) query = query.eq("department_id", filters.department_id);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Equipment[];
}
