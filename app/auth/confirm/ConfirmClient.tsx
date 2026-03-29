"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingBars } from "@/components/ui/PageLoader";

/** Supabase-js typings lag behind runtime API in some builds */
type AuthWithConfirm = {
  exchangeCodeForSession: (
    c: string
  ) => Promise<{ error: { message?: string } | null }>;
  verifyOtp: (p: {
    token_hash: string;
    type: "recovery" | "signup" | "email_change";
  }) => Promise<{ error: { message?: string } | null }>;
  setSession: (p: {
    access_token: string;
    refresh_token: string;
  }) => Promise<{ error: { message?: string } | null }>;
};

function parseHashParams(hash: string): Record<string, string> {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export default function ConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Confirming link…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const auth = supabase.auth as unknown as AuthWithConfirm;

      const nextRaw = searchParams.get("next") ?? "/password-reset";
      const safeNext = nextRaw.startsWith("/") ? nextRaw : "/password-reset";

      const oauthError = searchParams.get("error");
      if (oauthError) {
        router.replace("/auth/error");
        return;
      }

      // 1) PKCE / server-style redirect: ?code=...
      const code = searchParams.get("code");
      if (code) {
        setStatus("Signing you in…");
        const { error } = await auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          console.error("exchangeCodeForSession", error);
          router.replace("/auth/error");
          return;
        }
        router.replace(safeNext);
        return;
      }

      // 2) Email OTP link (some templates): ?token_hash=&type=recovery
      const token_hash = searchParams.get("token_hash");
      const otpType = searchParams.get("type");
      if (token_hash && otpType) {
        setStatus("Verifying reset link…");
        const { error } = await auth.verifyOtp({
          token_hash,
          type: otpType as "recovery" | "signup" | "email_change",
        });
        if (cancelled) return;
        if (error) {
          console.error("verifyOtp", error);
          router.replace("/auth/error");
          return;
        }
        router.replace(safeNext);
        return;
      }

      // 3) Implicit / legacy redirect: #access_token=&refresh_token=&type=recovery
      if (typeof window !== "undefined" && window.location.hash) {
        const h = parseHashParams(window.location.hash);
        const access_token = h.access_token;
        const refresh_token = h.refresh_token;
        const type = h.type;
        if (access_token && refresh_token && (type === "recovery" || type === "signup")) {
          setStatus("Signing you in…");
          const { error } = await auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          if (error) {
            console.error("setSession", error);
            router.replace("/auth/error");
            return;
          }
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`
          );
          router.replace(safeNext);
          return;
        }
      }

      router.replace("/auth/error");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="flex flex-col items-center gap-4">
        <LoadingBars onDark />
        <p className="text-sm text-slate-400">{status}</p>
      </div>
    </div>
  );
}
