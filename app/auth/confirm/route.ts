import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type"); // e.g. "recovery" for password reset
  const next = searchParams.get("next") ?? "/password-reset";

  if (token_hash && type) {
    const supabase = await createClient();
    // verifyOtp exchanges token for session (recovery, signup, etc.)
    const { error } = await (supabase.auth as { verifyOtp: (p: { type: string; token_hash: string }) => Promise<{ error: unknown }> }).verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
