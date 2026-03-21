# Kanta — Project Status

**Last updated:** 21 March 2026  
**Updated by:** Cursor

---

## What This Project Is

Kanta is the flagship SaaS product — Hospital Operational Intelligence Platform. Equipment tracking (QR, sensors), TAT intelligence, departmental workflow visibility for hospitals. Lab-first launch strategy. MVP in development.

---

## Current State

**Status:** In development  
**Phase:** MVP — Phases 1–7 implemented, deployed to Vercel

### What Is Built and Working

- [x] Next.js 16 app with Supabase
- [x] Dashboard layout (sidebar, top bar, ticker)
- [x] Equipment API routes (CRUD), departments, scans
- [x] Dashboard KPI cards, charts (equipment status, daily scans, category donut, asset value)
- [x] QR code scanning (html5-qrcode)
- [x] PWA setup (@ducanh2912/next-pwa)
- [x] Multi-tenant foundation — facility_id migrations, facility_capability_profile, facility_users RBAC, audit_log, maintenance_schedule
- [x] Infrastructure — health/healthcheck endpoints, Sentry, PostHog, Upstash Redis, error boundaries
- [x] Phase 2: Equipment A/B/C, maintenance due, sync status
- [x] Phase 3: TAT module (test_requests, tat_targets, tat_breaches), LRIDS
- [x] Phase 4: Revenue module
- [x] Phase 5: Refrigerator monitoring (telemetry API)
- [x] Phase 6: QC module (Westgard, Levey-Jennings, Lab-hub import)
- [x] Phase 7: ModuleTile, operational_alerts, milestones
- [x] Tests module (volume vs target, charts)
- [x] Meta module (test metadata CRUD)

### What Is In Progress

- [ ] Supabase Auth + JWT facility_id claim
- [ ] Offline-first PWA sync
- [ ] Vercel env vars: ensure `NEXT_PUBLIC_SUPABASE_URL`, `UPSTASH_REDIS_REST_URL` set without quotes

### What Is Planned (Next Up)

- [ ] First paying hospital on equipment module
- [ ] Lab-hub QC integration (live)

---

## Stack & Infrastructure

| Layer | Technology | Environment |
|-------|------------|-------------|
| Frontend | Next.js 16 + TypeScript | Vercel |
| Backend | Next.js API Routes | Vercel |
| Database | Supabase PostgreSQL | Kanta project |
| Cache | Upstash Redis | Upstash |
| Monitoring | Sentry, PostHog | — |

---

## Environment Status

| Environment | URL | Status |
|-------------|-----|--------|
| Production | app.zyntel.net | Deployed (Vercel) |
| Staging | — | Same as main |
| Local dev | http://localhost:3000 | Standard |

---

## Active Issues / Blockers

| Issue | Status | Notes |
|-------|--------|-------|
| Invalid supabaseUrl | Fixed | Env vars may have quotes — code now sanitizes. Set values in Vercel without quotes. |
| Redis URL invalid | Fixed | Same quote-stripping applied to Redis env vars. |

---

## Key Decisions Made

| Decision | Outcome | Date |
|----------|---------|------|
| Lab-first launch | Laboratory is department one; radiology, pharmacy follow | March 2026 |
| Repo structure | kanta — standalone Next.js | — |
| Env var handling | Sanitize quotes from Vercel env vars in lib/supabase.ts and lib/redis.ts | March 2026 |

---

## Branch State

| Branch | Purpose | Last active |
|--------|---------|-------------|
| `main` | Production | March 2026 |
| `staging` | Staging (mirrors main) | March 2026 |
| `development` | Integration | March 2026 |

---

## How to Run This Project Locally

```bash
git clone git@github.com:zyntel-co-ltd/kanta.git
cd kanta

npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

npm run dev
```

---

## Vercel Environment Variables

Set these in Vercel **without surrounding quotes**:

- `NEXT_PUBLIC_SUPABASE_URL` — e.g. `https://xxx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL` — e.g. `https://xxx.upstash.io`
- `UPSTASH_REDIS_REST_TOKEN`

---

## Cursor Context (Read Before Writing Any Code)

- **Base branch:** `main` (or `development` for features)
- **Key files:**
  - `app/dashboard/page.tsx` — Dashboard
  - `lib/supabase.ts` — Supabase client (sanitizes env quotes)
  - `lib/redis.ts` — Redis client (sanitizes env quotes)
  - `supabase/migrations/` — Database migrations
- **Do not touch:** Supabase schema without migration
- **Code style:** TypeScript strict — see `.cursor/rules/`

---

*For management overview, see: [knowledge/zyntel-playbook/06-operations/projects-status.md](../../knowledge/zyntel-playbook/06-operations/projects-status.md)*
