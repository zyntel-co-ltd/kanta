# Kanta — Active Issues & Blockers

**Last updated:** 2026-03-28  

| Issue | Status | Notes |
|-------|--------|-------|
| Invalid `supabaseUrl` on development preview | Open | Set Preview env vars in Vercel for all Supabase/Redis keys, then redeploy. Production unaffected. |
| Invalid `supabaseUrl` (general) | Fixed | Strip stray quotes in env — see `lib/supabase.ts`. |
| Redis URL invalid | Fixed | Quote-stripping in `lib/redis.ts`. |
