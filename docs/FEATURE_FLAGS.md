# Kanta feature flags (PostHog)

**ENG-84:** Product gating is controlled in PostHog (and `NEXT_PUBLIC_FLAG_*` env fallbacks when PostHog is off). Hospitals do not toggle these in-app.

Canonical keys live in `lib/featureFlags.ts` (`KANTA_FEATURE_FLAG_NAMES`).

| PostHog flag key | Dev env override | Gated behaviour |
|------------------|------------------|-----------------|
| `show-ai-intelligence` | `NEXT_PUBLIC_FLAG_SHOW_AI_INTELLIGENCE` | AI Insights module |
| `show-lrids` | `NEXT_PUBLIC_FLAG_SHOW_LRIDS` | LRIDS sidebar + standalone board token mint |
| `show-reception-tab` | `NEXT_PUBLIC_FLAG_SHOW_RECEPTION_TAB` | TAT Reception tab |
| `show-refrigerator-module` | `NEXT_PUBLIC_FLAG_SHOW_REFRIGERATOR_MODULE` | Refrigerator asset submodule |
| `show-sample-scan` | `NEXT_PUBLIC_FLAG_SHOW_SAMPLE_SCAN` | **ENG-90:** Scan page “Sample lookup” mode (barcode → `/api/test-requests/lookup`) |
| `show-tat-test-level` | `NEXT_PUBLIC_FLAG_SHOW_TAT_TEST_LEVEL` | Professional test-level TAT tracker at `/dashboard/lab-metrics/tat/tests` |

---

## ENG-90 — zyntel-dashboard vs Kanta table/view audit (high level)

Reference: `zyntel-dashboard/frontend/src/pages/` (Nakasero on‑prem).

| zyntel page | Kanta equivalent / notes |
|-------------|----------------------------|
| `Dashboard.tsx` | `/dashboard/home`, Lab hub |
| `TAT.tsx` | `/dashboard/tat` (overview + tabs) |
| `Performance.tsx` | `/dashboard/tat` Performance tab, `/dashboard/performance` |
| `Numbers.tsx` | `/dashboard/numbers` |
| `Revenue.tsx` | `/dashboard/revenue` |
| `Meta.tsx` | `/dashboard/meta` |
| `Tests.tsx` / `TestAnalytics.tsx` | `/dashboard/tests`, TAT Tests Level tab, lab-metrics test tracker (flag) |
| `Tracker.tsx` | `/dashboard/tracker`, TAT Tests Level API |
| `Progress.tsx` | `/dashboard/progress` |
| `Reception.tsx` | TAT Reception tab (flag) |
| `Results.tsx` | Partially covered by TAT / QC flows; no 1:1 page |
| `LRIDS.tsx` | `/lrids/[facilityId]?token=...` (ENG-101) |
| `LabGuruInsights.tsx` | `/dashboard/intelligence` (AI, separate flag) |
| `Admin.tsx` | `/dashboard/admin` |

Remaining differences are mostly naming, LIMS field coverage, and flags — not missing wholesale modules for the Phase 16 scope.
