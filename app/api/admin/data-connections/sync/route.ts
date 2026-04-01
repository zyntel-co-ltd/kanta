import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { runLIMSSync } from "@/lib/data-bridge/sync";

function sanitizeSyncError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.replace(/password=\S+/gi, "password=[redacted]");
}

/**
 * POST — manual LIMS sync for a connection (synchronous).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  const supabase = createAdminClient();
  let connectionId = typeof body.connection_id === "string" ? body.connection_id : "";

  if (!connectionId) {
    const { data: row } = await supabase
      .from("lims_connections")
      .select("id")
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    connectionId = row?.id ?? "";
  }

  if (!connectionId) {
    return NextResponse.json({ error: "No LIMS connection configured" }, { status: 400 });
  }

  const t0 = Date.now();
  try {
    const result = await runLIMSSync({ supabase, limsConnectionId: connectionId });
    const duration = Date.now() - t0;
    if (!result.success) {
      return NextResponse.json({
        success: false,
        recordsFetched: result.recordsFetched,
        recordsUpserted: result.recordsUpserted,
        duration,
        error: result.error ?? "Sync failed",
        syncLogId: result.syncLogId,
      });
    }
    return NextResponse.json({
      success: true,
      recordsFetched: result.recordsFetched,
      recordsUpserted: result.recordsUpserted,
      duration,
      syncLogId: result.syncLogId,
    });
  } catch (e) {
    const duration = Date.now() - t0;
    console.error("[POST /api/admin/data-connections/sync]");
    return NextResponse.json(
      {
        success: false,
        recordsFetched: 0,
        recordsUpserted: 0,
        duration,
        error: sanitizeSyncError(e),
      },
      { status: 500 }
    );
  }
}
