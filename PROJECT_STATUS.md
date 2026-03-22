# Kanta — Project Status

**Last updated:** 22 March 2026 (evening)  
**Updated by:** Cursor

---

## What This Project Is

Kanta is the flagship SaaS product — Hospital Operational Intelligence Platform. Equipment tracking (QR, sensors), TAT intelligence, departmental workflow visibility for hospitals. Lab-first launch strategy. MVP in active development.

---

## Current State

**Status:** In development  
**Phase:** MVP — Phases 1–7 implemented, deployed to Vercel. UI/UX redesign (Phase 8) complete.

### What Is Built and Working

- [x] Next.js 16 app with Supabase
- [x] **Auth** — Email/password login (`/login`), password reset flow, middleware protection for `/dashboard/*`, cookie-based session (`@supabase/ssr`)
- [x] **Post-login home** — `/dashboard/home` rebuilt as 3-app workspace hub (see Phase 8 below)
- [x] **App-contextual tab navigation** — Replaces sidebar; horizontal `AppTabBar` renders the relevant tabs based on current route (Lab Metrics / Quality Management / Asset Management)
- [x] **Admin users** — Admins add users via **Admin → Users** (creates Supabase Auth user + `facility_users` row). Real **email required** for sign-in
- [x] Dashboard layout (top bar, app tab bar — sidebar removed in Phase 8)
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
- [x] **Phase 8: UI/UX Redesign** *(completed 22 March 2026)* — see section below
- [x] **Phase 8b: Theme refinement & Login redesign** *(22 March 2026)* — neutral palette, split-layout login

### What Is In Progress

- [ ] JWT `facility_id` claim + RLS tied to `auth.uid()` (currently DEFAULT_FACILITY_ID in several API paths)
- [ ] Offline-first PWA sync
- [ ] Vercel env vars for `development` preview environment — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` must be added to the **Preview** environment in Vercel dashboard (production env vars are already set and working)

### What Is Planned (Next Up)

- [ ] First paying hospital on equipment module
- [ ] Lab-hub QC integration (live)

---

## Phase 8 — UI/UX Redesign (22 March 2026)

### Design Direction
Inspired by **Typeform** typography and the **Medicare Dashboard** (Dribbble) aesthetic:
- **Font:** Inter (300–800 weights) via `next/font/google` — tight tracking, large bold headings
- **Background:** Smooth lavender → white → periwinkle gradient (`#f5f3ff → #fff → #eff6ff`)
- **Cards:** Clean white with subtle shadows, coloured gradient accents

### Homepage — 3-App Workspace Model
`/dashboard/home` rebuilt from a flat grid of 12 tiles into **3 hero app cards**:

| App | Accent | Tabs |
|-----|--------|------|
| **Lab Metrics** | Indigo → Violet | TAT · Tests · Numbers · Meta · Revenue |
| **Quality Management** | Emerald → Teal | QC Overview · L-J Charts · Westgard · Qualitative QC |
| **Asset Management** | Amber → Orange | Assets Overview · Scan · Equipment · Maintenance · Refrigerator · Analytics · Reports |

### Navigation — Sidebar Removed
The full sidebar is replaced by a context-aware **AppTabBar** (`components/dashboard/AppTabBar.tsx`):
- Renders as a slim horizontal pill-tab bar below the TopBar
- Automatically shows the correct app's tabs based on the current pathname
- Includes a ← Home link and app badge on every app page
- Hidden on `/dashboard/home` and system pages (Admin, Settings, etc.)

### Scoped Components
- **Live Feed (TickerBar)** — moved from global layout to Assets Overview page only (`/dashboard`)
- **Add Equipment FAB** — moved from global layout to Assets Overview page only
- **Quick Access links** — removed from homepage (navigation now lives in the tab bars)
- **TopBar** — sidebar toggle controls removed (no sidebar)

### Files Changed

| File | Change |
|------|--------|
| `app/layout.tsx` | Added Inter font via `next/font/google` |
| `app/globals.css` | Typeform typography utilities, neutral warm-white background, animations |
| `app/dashboard/layout.tsx` | Removed Sidebar/TickerBar/FAB; added AppTabBar; neutral background |
| `app/dashboard/home/page.tsx` | Full redesign — 3 app cards, softened palette, removed quick links |
| `app/dashboard/page.tsx` | Added scoped TickerBar + FAB |
| `components/dashboard/AppTabBar.tsx` | **New** — context-aware horizontal tab navigation |
| `components/dashboard/Sidebar.tsx` | Nav groups restructured to 3-app model (retained for reference) |
| `components/dashboard/TopBar.tsx` | Removed sidebar toggle controls |
| `app/login/page.tsx` | Light loading fallback |
| `app/login/LoginForm.tsx` | **Full redesign** — split layout (dark brand panel + light form panel) |

---

## Phase 8b — Theme Refinement & Login Redesign (22 March 2026)

### Theme Changes
- **Background:** Switched from purple-tinted (`#f5f3ff`) to clean neutral slate-white (`#f8fafc → #fff → #f1f5f9`) — easier on the eyes, more clinical/professional
- **Card gradients:** Removed via/multi-stop gradients in favour of single-direction two-stop gradients (e.g. `from-indigo-500 to-indigo-700`) — less saturated, more refined
- **Tab bar:** Solid `bg-white` border-b instead of blurred glass — simpler and cleaner
- **Accent colours:** Dialled back saturation across Lab Metrics (indigo), Quality Mgmt (emerald), Asset Mgmt (orange)

### Login Page — Full Redesign
Replaced the dark glassmorphism card with a **split-screen layout**:

| Side | Content |
|------|---------|
| **Left (hidden mobile)** | Dark deep-indigo panel with Kanta brand, hero heading, 3 feature bullets (Lab Intelligence, Quality Management, Asset Management), subtle radial glow decorations |
| **Right** | Clean `#f8fafc` background, Inter-typed form card — email, password with inline "Forgot password?" link, indigo CTA with spinner state, error inline display |

- Inputs: white background, `border-slate-200`, indigo focus ring — clear and accessible
- Submit button: solid `bg-indigo-600` with `ArrowRight` icon, loading spinner replaces text
- Mobile: left panel hidden, brand shown inline above form instead

### Files Changed (Phase 8b)

| File | Change |
|------|--------|
| `app/globals.css` | Neutral CSS variables, softer gradient utilities |
| `app/dashboard/layout.tsx` | Updated background gradient to neutral slate |
| `app/dashboard/home/page.tsx` | Softened card gradients and blob colours |
| `components/dashboard/AppTabBar.tsx` | Solid white bar, cleaner active states |
| `app/login/page.tsx` | Light loading fallback |
| `app/login/LoginForm.tsx` | Full split-layout redesign |

---

## Stack & Infrastructure

| Layer | Technology | Environment |
|-------|------------|-------------|
| Frontend | Next.js 16 + TypeScript | Vercel |
| Backend | Next.js API Routes | Vercel |
| Database | Supabase PostgreSQL | Kanta project |
| Cache | Upstash Redis | Upstash |
| Font | Inter via next/font/google | — |
| Monitoring | Sentry, PostHog | — |

---

## Environment Status

| Environment | URL | Branch | Status |
|-------------|-----|--------|--------|
| Production | app.zyntel.net | `main` | Deployed — Phase 8 live |
| Preview | app-preview.zyntel.net | `development` | Deployed — needs Supabase env vars added for Preview environment |
| Local dev | http://localhost:3000 | any | Standard |

---

## Active Issues / Blockers

| Issue | Status | Notes |
|-------|--------|-------|
| Invalid supabaseUrl on development preview | Open | Env vars not set for Preview environment in Vercel. Go to Vercel → Settings → Environment Variables → tick **Preview** for each Supabase/Redis var, then redeploy. Production (`main`) is unaffected. |
| Invalid supabaseUrl (general) | Fixed | Env vars may have quotes — code sanitizes. Set values in Vercel without surrounding quotes. |
| Redis URL invalid | Fixed | Same quote-stripping applied to Redis env vars. |

---

## Key Decisions Made

| Decision | Outcome | Date |
|----------|---------|------|
| Lab-first launch | Laboratory is department one; radiology, pharmacy follow | March 2026 |
| Repo structure | kanta — standalone Next.js | — |
| Env var handling | Sanitize quotes from Vercel env vars in lib/supabase.ts and lib/redis.ts | March 2026 |
| User provisioning | No public self-signup; **admins** add users in Admin panel (Auth + facility_users) | March 2026 |
| Default after login | `/dashboard/home` (3-app workspace hub); deep links unchanged | March 2026 |
| Navigation model | Sidebar replaced by contextual horizontal AppTabBar per app domain | March 2026 |
| Font | Inter (next/font/google) — Typeform-style tight tracking, variable weights | March 2026 |
| Homepage structure | 3 hero app cards (Lab Metrics / Quality Mgmt / Asset Mgmt) replace flat module grid | March 2026 |

---

## Branch State

| Branch | Purpose | Last commit | Status |
|--------|---------|-------------|--------|
| `main` | Production | `78feb67` — Phase 8b theme + login redesign | Live on Vercel |
| `development` | Integration / Preview | `78feb67` — in sync with main | Live on Vercel (needs Preview env vars) |
| `staging` | Staging | Mirrors main | March 2026 |

---

## How to Run This Project Locally

```bash
git clone git@github.com:zyntel-co-ltd/kanta.git
cd kanta

npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Fill in UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

npm run dev
```

Open **http://localhost:3000** → redirects to `/dashboard/home` when logged in, or `/login` when not.

---

## Vercel Environment Variables

Set these in Vercel **without surrounding quotes** — for **both Production and Preview** environments:

- `NEXT_PUBLIC_SUPABASE_URL` — e.g. `https://xxx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL` — e.g. `https://xxx.upstash.io`
- `UPSTASH_REDIS_REST_TOKEN`

---

## Cursor Context (Read Before Writing Any Code)

- **Base branch:** `main` (or `development` for features)
- **Navigation model:** No sidebar. AppTabBar (`components/dashboard/AppTabBar.tsx`) handles all in-app navigation. Homepage (`/dashboard/home`) is the app selector.
- **3 app domains:**
  - **Lab Metrics** → `/dashboard/tat`, `/dashboard/tests`, `/dashboard/numbers`, `/dashboard/meta`, `/dashboard/revenue`
  - **Quality Management** → `/dashboard/qc`
  - **Asset Management** → `/dashboard`, `/dashboard/scan`, `/dashboard/equipment`, `/dashboard/maintenance`, `/dashboard/refrigerator`, `/dashboard/analytics`, `/dashboard/reports`
- **Key files:**
  - `app/dashboard/home/page.tsx` — 3-app workspace hub (homepage)
  - `app/dashboard/page.tsx` — Assets Overview (KPIs / charts / TickerBar / FAB)
  - `components/dashboard/AppTabBar.tsx` — Context-aware horizontal tab navigation
  - `components/dashboard/TopBar.tsx` — Top bar (search, sync status, user)
  - `lib/SidebarLayoutContext.tsx` — Retained for TopBar compatibility
  - `lib/AuthContext.tsx` — Client auth state
  - `lib/supabase.ts` — Admin client; `lib/supabase/client.ts` — browser session
  - `lib/redis.ts` — Redis client (sanitizes env quotes)
  - `supabase/migrations/` — Database migrations
- **Do not touch:** Supabase schema without a migration file
- **Code style:** TypeScript strict — see `.cursor/rules/`

---

*For management overview, see: [knowledge/zyntel-playbook/06-operations/projects-status.md](../../knowledge/zyntel-playbook/06-operations/projects-status.md)*
