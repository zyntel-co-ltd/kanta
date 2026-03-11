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
  assetValueDataByPeriod,
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
    const alertsCard = kpiCards.find((k) => k.id === "alerts")!;
    const scannedCard = kpiCards.find((k) => k.id === "scanned")!;
    const maintCard = kpiCards.find((k) => k.id === "maintenance")!;
    const healthCard = kpiCards.find((k) => k.id === "health")!;
    const mockStats: DashboardStats = {
      kpi: {
        critical_alerts: alertsCard.value as number,
        equipment_scanned_this_week: scannedCard.value as number,
        maintenance_due: maintCard.value as number,
        fleet_health_score: healthCard.value as number,
        scanned_change: scannedCard.change,
        maintenance_change: maintCard.change,
        health_change: healthCard.change,
        critical_alerts_change: (alertsCard as { change?: number }).change ?? 0,
        severity_breakdown: (alertsCard as { severity?: { critical: number; warning: number; info: number } }).severity ?? { critical: 0, warning: 0, info: 0 },
        maintenance_compliance: (maintCard as { compliance?: { completed: number; total: number; overdue: number } }).compliance ?? { completed: 0, total: 0, overdue: 0 },
        sparklines: {
          alerts: [8, 11, 9, 13, 10, 12, 14],
          scanned: [180, 210, 240, 265, 290, 300, 312],
          maintenance: [82, 79, 85, 80, 76, 78, 74],
          health: [78, 80, 79, 81, 82, 83, 84],
        },
      },
      equipment_by_category: equipmentCategoryData,
      daily_scans: dailyScanData,
      equipment_status_monthly: equipmentStatusData,
      asset_value_by_period: assetValueDataByPeriod,
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
      getAssetValueByPeriod,
      getInventoryFromEquipment,
    } = await import("@/lib/db");

    const [kpi, byCategory, dailyScans, statusMonthly, assetValue, inventory] = await Promise.all([
      getDashboardKpi(hospitalId),
      getEquipmentByCategory(hospitalId),
      getDailyScans(hospitalId),
      getEquipmentStatusMonthly(hospitalId),
      getAssetValueByPeriod(hospitalId),
      getInventoryFromEquipment(hospitalId),
    ]);

    const stats: DashboardStats = {
      kpi,
      equipment_by_category: byCategory,
      daily_scans: dailyScans,
      equipment_status_monthly: statusMonthly,
      asset_value_by_period: assetValue,
      inventory,
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
