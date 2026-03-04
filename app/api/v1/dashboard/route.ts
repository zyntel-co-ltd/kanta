/**
 * GET /api/v1/dashboard?hospital_id=xxx
 * Zyntel API v1 — Dashboard KPI and chart data.
 * Designed for future B2B consumers (EMRs, insurance, health registries).
 */

import { NextRequest, NextResponse } from "next/server";
import type { DashboardStats, ApiResponse } from "@/types";
import {
  kpiCards,
  equipmentCategoryData,
  dailyScanData,
  equipmentStatusData,
  inventoryData,
} from "@/lib/data";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<DashboardStats>>> {
  const hospitalId = req.nextUrl.searchParams.get("hospital_id");

  if (!hospitalId) {
    return NextResponse.json(
      { data: null, error: "hospital_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    const mockStats: DashboardStats = {
      kpi: {
        critical_alerts: kpiCards.find((k) => k.id === "alerts")!.value as number,
        equipment_scanned_this_week: kpiCards.find((k) => k.id === "scanned")!.value as number,
        maintenance_due: kpiCards.find((k) => k.id === "maintenance")!.value as number,
        fleet_health_score: kpiCards.find((k) => k.id === "health")!.value as number,
        scanned_change: kpiCards.find((k) => k.id === "scanned")!.change,
        maintenance_change: kpiCards.find((k) => k.id === "maintenance")!.change,
        health_change: kpiCards.find((k) => k.id === "health")!.change,
      },
      equipment_by_category: equipmentCategoryData,
      daily_scans: dailyScanData,
      equipment_status_monthly: equipmentStatusData,
      inventory: {
        accuracy: inventoryData.accuracy,
        restock_due_days: 3,
        breakdown: inventoryData.breakdown,
      },
    };

    return NextResponse.json({ data: mockStats, error: null });
  }

  try {
    const {
      getDashboardKpi,
      getEquipmentByCategory,
      getDailyScans,
      getEquipmentStatusMonthly,
    } = await import("@/lib/db");

    const [kpi, byCategory, dailyScans, statusMonthly] = await Promise.all([
      getDashboardKpi(hospitalId),
      getEquipmentByCategory(hospitalId),
      getDailyScans(hospitalId),
      getEquipmentStatusMonthly(hospitalId),
    ]);

    const stats: DashboardStats = {
      kpi,
      equipment_by_category: byCategory,
      daily_scans: dailyScans,
      equipment_status_monthly: statusMonthly,
      inventory: {
        accuracy: 72,
        restock_due_days: 3,
        breakdown: inventoryData.breakdown,
      },
    };

    return NextResponse.json({ data: stats, error: null });
  } catch (err) {
    console.error("[/api/v1/dashboard]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
