/**
 * Vercel Cron — automated LIMS sync for all active connections (ENG-89).
 * Schedule: every 15 minutes (`vercel.json`). Protect with `CRON_SECRET` (Authorization: Bearer).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { runLIMSSync } from "@/lib/data-bridge/sync";

// DATA BRIDGE FOUNDATION: Pattern 2 (Polling). Future patterns: webhook push (Pattern 1) when LIMS supports webhooks, scheduled export (Pattern 3) for legacy systems. See lib/data-bridge/connectors/base.ts for connector interface.

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: connections, error } = await supabase
    .from("lims_connections")
    .select("id")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message, synced: 0, errors: [error.message] }, { status: 500 });
  }

  const rows = connections ?? [];
  const errors: string[] = [];
  let synced = 0;
  const t0 = Date.now();
  const budgetMs = 24_000;

  for (const row of rows) {
    if (Date.now() - t0 > budgetMs) {
      errors.push(`time budget: skipped remaining connections (retry on next cron)`);
      break;
    }
    const id = row.id as string;
    const result = await runLIMSSync({ supabase, limsConnectionId: id });
    if (result.success) synced += 1;
    else errors.push(`${id}: ${result.error ?? "sync failed"}`);
  }

  return NextResponse.json({ synced, errors });
}
