import type { Metadata } from "next";
import LridsBoardClient from "@/components/lrids/LridsBoardClient";
import { isLridsJwtConfigured, verifyLridsToken } from "@/lib/lrids/jwt";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ facilityId: string }>;
}): Promise<Metadata> {
  const { facilityId } = await params;
  return {
    title: "LRIDS",
    robots: { index: false, follow: false },
    description: `Laboratory display board · facility ${facilityId}`,
  };
}

export default async function LridsStandalonePage({
  params,
  searchParams,
}: {
  params: Promise<{ facilityId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { facilityId } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  if (!isLridsJwtConfigured()) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-white"
        style={{ background: "linear-gradient(160deg, #042f2e 0%, #0f172a 100%)" }}
      >
        <h1 className="text-xl font-semibold">LRIDS is not configured</h1>
        <p className="mt-2 text-sm text-white/60 max-w-md">
          Set <code className="text-emerald-200/90">LRIDS_TOKEN_SECRET</code> on the server (see .env.example), then redeploy.
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-white"
        style={{ background: "linear-gradient(160deg, #042f2e 0%, #0f172a 100%)" }}
      >
        <h1 className="text-xl font-semibold">Missing display token</h1>
        <p className="mt-2 text-sm text-white/60 max-w-md">
          Open this board from the dashboard using the LRIDS link so a valid link is generated.
        </p>
      </div>
    );
  }

  const valid = await verifyLridsToken(token, facilityId);
  if (!valid) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-white"
        style={{ background: "linear-gradient(160deg, #042f2e 0%, #0f172a 100%)" }}
      >
        <h1 className="text-xl font-semibold">Invalid or expired link</h1>
        <p className="mt-2 text-sm text-white/60 max-w-md">
          Display links expire after 24 hours. Open a fresh board from the LRIDS item in the dashboard sidebar.
        </p>
      </div>
    );
  }

  return <LridsBoardClient facilityId={facilityId} initialToken={token} />;
}
