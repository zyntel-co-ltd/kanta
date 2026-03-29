import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { LoadingBars } from "@/components/ui/PageLoader";

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div style={{ fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif" }}>
        <LoadingBars />
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
