# Kanta — Live Production Checklist

Use this checklist before going live with a paying client.

---

## 1. Supabase Setup

- [ ] **Project** — Kanta Supabase project created (or existing)
- [ ] **Region** — Nairobi or nearest (latency for East Africa)
- [ ] **Migrations** — Run all migrations in `supabase/migrations/` in order:
  - `20250321000001_add_facility_id.sql`
  - `20250321000002_facility_capability_profile.sql`
  - `20250321000003_facility_users_rbac.sql`
  - `20250321000004_audit_log.sql`
  - `20250321000005_maintenance_schedule.sql`
- [ ] **RLS** — Verify Row Level Security policies (replace dev `using (true)` with `facility_id = auth.jwt() ->> 'facility_id'` when Auth is enabled)
- [ ] **Pro tier** — Upgrade to Pro for 7-day PITR before any paying client (required for production)
- [ ] **Secrets** — `SUPABASE_SERVICE_ROLE_KEY` stored in Vercel (Production only, never Preview)
- [ ] **Auth redirect URLs** — In Supabase Dashboard → Auth → URL Configuration, add:
  - `https://your-domain.com/auth/confirm`
  - `http://localhost:3000/auth/confirm` (for local dev)
- [ ] **Password reset email** — Ensure "Reset Password" template uses `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (or `&next=/password-reset` appended)

---

## 2. Vercel Setup

- [ ] **Project** — Connect Kanta repo to Vercel
- [ ] **Framework** — Next.js detected
- [ ] **Environment variables** — Set all from `.env.example`:
  - Production only: `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_AUTH_TOKEN`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `NEON_DATABASE_URL` (if used)
  - Production + Preview: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`
  - **Important:** Enter values WITHOUT surrounding quotes in Vercel (e.g. `https://xxx.supabase.co` not `"https://xxx.supabase.co"`)
- [ ] **Domain** — Custom domain configured (e.g. `kanta.zyntel.net`)

---

## 3. Sentry Setup

- [ ] **Project** — Create Kanta project at sentry.io
- [ ] **DSN** — Add `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` to Vercel
- [ ] **Auth token** — `SENTRY_AUTH_TOKEN` for source map uploads (Production only)
- [ ] **Source maps** — Add to GitHub Actions deploy:
  ```yaml
  - run: npx @sentry/cli releases files ${{ github.sha }} upload-sourcemaps .next
    env:
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
      SENTRY_ORG: zyntel
      SENTRY_PROJECT: kanta
  ```
- [ ] **Alerts** — Configure alert rules for errors, performance

---

## 4. PostHog Setup

- [ ] **Project** — Create project at posthog.com (EU instance)
- [ ] **Key** — Add `NEXT_PUBLIC_POSTHOG_KEY` to Vercel
- [ ] **Feature flags** — Create flags: `qc-module`, `fridge-monitor` for rollout

---

## 5. Upstash Redis (optional but recommended)

- [ ] **Database** — Create Redis database at upstash.com
- [ ] **URL + Token** — Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel (without quotes)
- [ ] **Use cases** — Capability profile cache, rate limiting, idempotency keys, KPI cache

---

## 6. Resend (alert emails)

- [ ] **Account** — Sign up at resend.com
- [ ] **API key** — Add `RESEND_API_KEY` to Vercel (Production only)
- [ ] **Domain** — Verify sending domain (e.g. `kanta@zyntel.net`)

---

## 7. Security

- [ ] **Service role key** — Never in Preview environment (preview URLs are guessable)
- [ ] **CORS** — Restrict to known origins if needed
- [ ] **Rate limiting** — Upstash Ratelimit on telemetry, QC import, TAT webhook
- [ ] **Admin panel** — Cloudflare Zero Trust on `admin.zyntel.net` (allow list: Ntale + CTO)

---

## 8. Monitoring

- [ ] **Health endpoint** — `/api/health` returns 200 when DB + Redis OK
- [ ] **Uptime** — External monitor (e.g. Better Uptime, Cronitor) pings `/api/healthcheck` every 5 min
- [ ] **Sentry** — Error alerts configured
- [ ] **Vercel** — Deployment notifications, analytics

---

## 9. Backups

- [ ] **Supabase Pro** — 7-day PITR enabled
- [ ] **Weekly dump** — GitHub Action runs `pg_dump` and uploads to Cloudflare R2 (optional)
- [ ] **Retention** — Keep 12 weeks of cold backups

---

## 10. Performance

- [ ] **Bundle size** — First-load JS < 200KB (run `ANALYZE=true npm run build`)
- [ ] **Loading states** — `loading.tsx` at module level (skeleton screens)
- [ ] **Optimize** — `optimizePackageImports` for recharts, Sentry in `next.config`

---

## Quick reference — env vars by scope

| Variable | Production | Preview | Local |
|----------|------------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✗ | ✓ |
| `NEXT_PUBLIC_SENTRY_DSN` | ✓ | ✓ | ✓ |
| `SENTRY_AUTH_TOKEN` | ✓ | ✗ | — |
| `NEXT_PUBLIC_POSTHOG_KEY` | ✓ | ✓ | ✓ |
| `UPSTASH_REDIS_REST_URL` | ✓ | ✓ | ✓ |
| `UPSTASH_REDIS_REST_TOKEN` | ✓ | ✗ | ✓ |
| `RESEND_API_KEY` | ✓ | ✗ | — |

---

*Last updated: 21 March 2026*
