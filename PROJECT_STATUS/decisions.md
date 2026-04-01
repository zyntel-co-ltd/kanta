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
| ENG-154 (2026-04-01) | RLS enabled on `login_audit`, `qc_results`, `platform_admins`, `facility_invites`, `lab_sections`, `lab_shifts`. Function `search_path` hardened on `audit_trigger_fn`, `update_rack_status`, `custom_access_token_hook`, `update_updated_at`. `facility_invites.token` revoked for anon/authenticated SELECT. Leaked password protection to be enabled in Supabase Auth dashboard. | Close Supabase linter ERRORs before new hospital onboarding | 2026-04 |
| ENG-81 (2026-04-01) | Module colors locked as brand identifiers. Per-module theme alternatives cancelled. Current palette is permanent: Home/Admin/AI=Emerald `#059669`, Lab Metrics=Navy `#21336a`, Quality/Samples=Sky `#0284c7`, Assets=Slate `#475569`. | Recognition anchors for hospital staff; no theme switcher | 2026-04 |
