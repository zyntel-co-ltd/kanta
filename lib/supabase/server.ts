import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function sanitize(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']+|["']+$/g, "").trim();
}

const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL) || "";
const anonKey =
  sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  sanitize(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  "";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore in Server Components
        }
      },
    },
  });
}
