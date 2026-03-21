/**
 * Server-side Supabase client for API routes.
 * Uses service role when available; otherwise anon key.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function sanitize(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']+|["']+$/g, "").trim();
}

const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY);
const anonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function createClient() {
  const key = serviceRoleKey || anonKey;
  return createSupabaseClient(supabaseUrl, key, {
    auth: serviceRoleKey
      ? { autoRefreshToken: false, persistSession: false }
      : undefined,
  });
}
