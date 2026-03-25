import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400" style={{ fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif" }}>Loading…</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
