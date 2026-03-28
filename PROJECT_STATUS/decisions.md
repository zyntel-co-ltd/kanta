# Kanta — Key Decisions

**Append-only. Never edit existing rows.**

| Decision | What was decided | Why | Date |
|----------|------------------|-----|------|
| Lab-first launch | Laboratory as first department | Radiology/pharmacy later | 2026-03 |
| Repo structure | Standalone Next.js repo `kanta` | — | — |
| Env var handling | Sanitize quotes in `lib/supabase.ts`, `lib/redis.ts` | Vercel copy/paste | 2026-03 |
| User provisioning | No public signup; admins add users | Security + tenant control | 2026-03 |
| Default after login | `/dashboard/home` | 3-app hub | 2026-03 |
| Navigation | Sidebar + app routing (see `Sidebar.tsx`) | UX | 2026-03 |
| Font | Inter via `next/font/google` | Brand readability | 2026-03 |
