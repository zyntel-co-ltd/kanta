import { createClient } from "@supabase/supabase-js";

/** Strip surrounding quotes from env vars (Vercel sometimes adds them) */
function sanitizeEnv(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']+|["']+$/g, "").trim();
}

const supabaseUrl = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || "";
const supabaseAnonKey = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || "";

// Browser / client-side client (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (bypasses RLS — use only in API routes / server actions)
export function createAdminClient() {
  const serviceRoleKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL invalid. Set it in Vercel without quotes (e.g. https://xxx.supabase.co)."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
