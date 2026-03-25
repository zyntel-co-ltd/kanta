"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/dashboard/home")}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-emerald-50/40 via-white to-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
