# Kanta — PostHog feature flags (inventory)

**Owner:** Zyntel Engineering  
**App:** Kanta (`github.com/zyntel-co-ltd/kanta`)  
**Code:** `lib/featureFlags.ts` exports `KANTA_FEATURE_FLAG_NAMES`, `useFlag()`, `getFlagValue()`.

Hospitals do **not** manage these from the product UI. Flags are evaluated per user/session in PostHog (with facility context where configured). When `NEXT_PUBLIC_POSTHOG_KEY` is unset (e.g. local dev), each flag falls back to `NEXT_PUBLIC_FLAG_<NAME>` — see `flagNameToDevEnvKey()` in `lib/featureFlags.ts`.

## Flag inventory

| PostHog flag key | Dev override (`NEXT_PUBLIC_*`) | Gated UI / behaviour | Default if PostHog off & env unset |
|------------------|--------------------------------|----------------------|-------------------------------------|
| `show-ai-intelligence` | `NEXT_PUBLIC_FLAG_SHOW_AI_INTELLIGENCE` | Sidebar **AI Insights**; `/dashboard/intelligence` page content | Off |
| `show-lrids` | `NEXT_PUBLIC_FLAG_SHOW_LRIDS` | Sidebar **LRIDS** (TAT); TAT **LRIDS** tab; public board `/kanta/[facility]/lrids` | Off |
| `show-reception-tab` | `NEXT_PUBLIC_FLAG_SHOW_RECEPTION_TAB` | TAT **Reception** tab | Off |
| `show-refrigerator-module` | `NEXT_PUBLIC_FLAG_SHOW_REFRIGERATOR_MODULE` | Sidebar Asset Management **Refrigerator**; home hub refrigerator tab; `/dashboard/refrigerator`, `/dashboard/refrigerator/[id]`; App tab bar (assets) | Off |

## PostHog setup notes

- Create **boolean** feature flags using the exact keys above (kebab-case).
- Use **release conditions** or **group / property** targeting to enable flags per customer facility as agreed with Zyntel.
- After changing a flag, clients pick up updates on the next `onFeatureFlags` callback (see `useFlag`).

## Related product decisions

- **ENG-84:** Feature toggles were removed from `/dashboard/settings`; profile and password remain there. Hospital branding is under **Admin → Hospital**.
- **`facility_capability_profile`:** Still used for adaptive presence (e.g. equipment tile states), not as a replacement for PostHog module on/off switches.
