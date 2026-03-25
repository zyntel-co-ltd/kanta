import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function sanitize(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']+|["']+$/g, "").trim();
}

const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL) || "";
const anonKey =
  sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  sanitize(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  "";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          response.cookies.set(name, value)
        );
      },
    },
  });

  const { data: { user } } = await (supabase.auth as { getUser: () => Promise<{ data: { user: unknown } }> }).getUser();

  return { response, user };
}
