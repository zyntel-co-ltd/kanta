import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API platform",
  description: "Kanta public HTTP API — authentication, endpoints, and rate limits.",
};

export default function ApiPlatformPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-sm font-medium text-emerald-700">Kanta</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">HTTP API platform</h1>
          <p className="mt-2 text-slate-600">
            Machine-to-machine access for facility-scoped operational data. Keys are created in the admin panel;
            each key is tied to one hospital (facility).
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-10">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Authentication</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Send a static bearer token on every request. The plaintext value is shown only once when the key is
            created; we store only a SHA-256 hash.
          </p>
          <pre className="text-xs bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto">
            {`Authorization: Bearer kanta_<32 hex chars>`}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Rate limits</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Per-key limits apply (defaults: 60 requests per minute and 1,000 per day). Responses include{" "}
            <code className="text-xs bg-slate-200 px-1 rounded">X-RateLimit-*</code> headers. IP-based edge limits
            do not apply to <code className="text-xs bg-slate-200 px-1 rounded">/api/v1</code> routes so key limits
            remain authoritative.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Endpoints</h2>
          <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5">
            <li>
              <code className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                GET /api/v1/facilities/{"{facilityId}"}/equipment/summary
              </code>{" "}
              — equipment counts, availability, maintenance due (cached ~5 minutes).
            </li>
            <li>
              <code className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                GET /api/v1/facilities/{"{facilityId}"}/tat/benchmarks
              </code>{" "}
              — rolling 30-day TAT benchmarks by section.
            </li>
          </ul>
          <p className="text-sm text-slate-600">
            The facility ID in the path must match the facility bound to the API key; otherwise the API returns{" "}
            <code className="text-xs bg-slate-200 px-1 rounded">403</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Architecture</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Strategy and trade-offs are documented in{" "}
            <code className="text-xs bg-slate-200 px-1 rounded">docs/adr/ADR-003-api-platform-strategy.md</code> in the
            Kanta source tree (ADR-003). This page is a concise operator summary.
          </p>
        </section>

        <p className="text-sm text-slate-500">
          <Link href="/login" className="text-emerald-700 underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          to open the dashboard and create keys under Admin → API keys.
        </p>
      </main>
    </div>
  );
}
