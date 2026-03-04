# Kanta Deployment Guide (Phase 1)

**Phase 1 architecture:** Vercel + Supabase + Cloudflare. No Railway.

---

## Prerequisites

- [GitHub](https://github.com) account
- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) project (use Nairobi region)
- [Cloudflare](https://cloudflare.com) account (optional, for CDN/DNS)

---

## 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. **Set region to Nairobi** (or nearest African region) for latency.
3. Run schema: **SQL Editor** → paste and run `supabase/schema.sql`.
4. **Settings → API**: copy Project URL, anon key, service_role key.

---

## 2. Deploy on Vercel

### Via Dashboard

1. [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import your GitHub repo.
3. **Root Directory:** `kanta` (or `.` if repo root is kanta).
4. **Framework:** Next.js (auto-detected).

5. **Environment Variables:**

   | Variable | Value |
   |---------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |

6. **Deploy.**

### Via CLI

```bash
cd kanta
npm i -g vercel
vercel login
vercel --prod
# Add env vars in Vercel dashboard or:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

---

## 3. PWA Icons (Optional)

Add `public/icons/icon-192.png` and `public/icons/icon-512.png` for full install support. See `public/icons/README.md`.

---

## 4. Cloudflare (Optional)

Point your domain DNS to Cloudflare. Add a CNAME for your Vercel deployment. African PoPs improve load times.

---

## 5. Upgrade Path

**Before first paying customer:** Upgrade Supabase to Pro ($25/mo) — free tier pauses on inactivity.

**Phase 2:** Extract API to Fastify, deploy to AWS Fargate (af-south-1). See `ARCHITECTURE.md`.

---

## API Routes (Zyntel API v1)

| Route | Methods |
|-------|---------|
| `/api/v1/dashboard` | GET |
| `/api/v1/scans` | GET, POST |
| `/api/v1/equipment` | GET, POST |
| `/api/v1/departments` | GET, POST |

All require `hospital_id` query param for GET. Versioned from day one for future B2B integrations.
