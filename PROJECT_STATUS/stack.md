# Kanta — Stack & Infrastructure

**Last updated:** 2026-03-28  

---

## Stack

| Layer | Technology | Provider | Environment | Notes |
|-------|------------|----------|-------------|-------|
| Frontend | Next.js 16 + TypeScript | Vercel | Production / Preview | |
| Backend | Next.js API Routes | Vercel | | |
| Database | Supabase PostgreSQL | Supabase | Kanta project | RLS — see `data-model.md` |
| Cache | Upstash Redis | Upstash | | Quote sanitization in `lib/redis.ts` |
| Font | Inter (`next/font/google`) | — | | |
| Monitoring | Sentry, PostHog | — | | |
| AI (Phase 10+) | Anthropic API | — | | NL queries, summaries |

---

## Environments

| Environment | URL | Branch | Status |
|-------------|-----|--------|--------|
| Production | app.zyntel.net | `main` | Live |
| Preview | app-preview.zyntel.net | `development` | Deployed — ensure Preview env vars in Vercel |
| Local | http://localhost:3000 | any | Standard |

---

## Environment Variables

Set in Vercel **without surrounding quotes** for Production and Preview:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/admin |
| `UPSTASH_REDIS_REST_URL` | Redis REST |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth |
| `ANTHROPIC_API_KEY` | AI features |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://app.zyntel.net` for cron |
| `CRON_SECRET` | Protect `/api/cron/*` |
| `DATA_FLYWHEEL_ENABLED` | Default `false` until ToS opt-in |
| `FACILITY_HASH_SALT` | 32-char rotate annually |

Values live in 1Password / Vercel; never commit secrets.

---

## How to Run Locally

```bash
git clone git@github.com:zyntel-co-ltd/kanta.git
cd kanta
npm install
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, UPSTASH_*, etc.
npm run dev
```

Open http://localhost:3000 — `/dashboard/home` when logged in, `/login` when not.
