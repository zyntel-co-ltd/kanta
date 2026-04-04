"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { LoadingBars } from "@/components/ui/PageLoader";

/**
 * Root `/` gate: preserve Supabase recovery hash on client; send logged-in users to the app.
 */
function MarketingGateInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

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
        const url = `${window.location.origin}/auth/confirm${window.location.search}${window.location.hash}`;
        window.location.replace(url);
        return;
      }
    }

    if (!loading && user) {
      router.replace("/dashboard/home");
    }
  }, [router, searchParams, loading, user]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingBars />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}

export default function MarketingGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <LoadingBars />
        </div>
      }
    >
      <MarketingGateInner>{children}</MarketingGateInner>
    </Suspense>
  );
}
