import { createBrowserClient } from "@supabase/ssr";

function sanitize(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']+|["']+$/g, "").trim();
}

const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL) || "";
const anonKey =
  sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  sanitize(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  "";

export function createClient() {
  return createBrowserClient(supabaseUrl, anonKey);
}
