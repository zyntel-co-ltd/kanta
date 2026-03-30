import { WifiOff } from "lucide-react";

/** ENG-109: gate live-network-only UI when offline (use with `useSyncQueue`). */
export default function AvailableWhenOnline({
  title = "Available when online",
  detail = "Reconnect to use this feature.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center"
      role="status"
    >
      <WifiOff className="h-10 w-10 text-amber-600" aria-hidden />
      <p className="text-sm font-semibold text-amber-950">{title}</p>
      <p className="max-w-sm text-xs text-amber-800/90">{detail}</p>
    </div>
  );
}
