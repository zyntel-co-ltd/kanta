"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Root `/` must not server-redirect before the browser can read the hash.
 * Supabase password recovery often lands on Site URL with #access_token=…
 * which is never sent to the server — a server redirect would drop it.
 */
function HomeGateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const q = searchParams.toString();
      router.replace(`/auth/confirm?${q}`);
      return;
    }

    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash;
      if (
        hash.includes("access_token") ||
        hash.includes("type=recovery") ||
        hash.includes("type%3Drecovery")
      ) {
        // Full navigation so the hash is not dropped by client-side routing
        const url = `${window.location.origin}/auth/confirm${window.location.search}${window.location.hash}`;
        window.location.replace(url);
        return;
      }
    }

    router.replace("/dashboard/home");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function HomeGate() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeGateInner />
    </Suspense>
  );
}
