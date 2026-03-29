import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";
import { LoadingBars } from "@/components/ui/PageLoader";

function Fallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <LoadingBars onDark />
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ConfirmClient />
    </Suspense>
  );
}
