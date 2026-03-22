/**
 * Vercel Cron Job — Weekly Summary Generator
 * Configured in vercel.json to run every Monday at 07:00 UTC.
 *
 * Protected by CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const { data: facilities, error } = await supabase
      .from("hospitals")
      .select("id")
      .limit(100);

    if (error) throw error;

    const results = await Promise.allSettled(
      (facilities ?? []).map(async (f) => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/ai/weekly-summary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ facility_id: f.id }),
          }
        );
        return { facility_id: f.id, ok: res.ok };
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ succeeded, failed, total: facilities?.length ?? 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
