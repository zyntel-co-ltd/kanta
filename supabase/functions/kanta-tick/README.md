# kanta-tick Edge Function

Simulates what Kanta users actually do in the app for Mazra General Hospital.
Runs every 60 minutes via Supabase Cron.

## Deploy

```bash
supabase functions deploy kanta-tick --no-verify-jwt
```

## Set environment variable

```bash
supabase secrets set KANTA_DEMO_FACILITY_ID=11111111-1111-4111-a111-111111111111
```

## Schedule (Supabase Cron / pg_cron)

```sql
SELECT cron.schedule(
  'kanta-tick',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/kanta-tick',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SUPABASE_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

## What it simulates per hour

| Action | When | Who |
|--------|------|-----|
| Equipment QR scans (2–5 items) | Day shift + handover | Biomedical engineer |
| QC result entry | 8am + 8pm EAT only | Day/night shift technician |
| Fridge temperature readings | Every tick | Automated (sensor sim) |
| Alert acknowledgements | Day shift, 2h lag | Senior technician / Director |
| Maintenance completion | Day shift, if overdue | Biomedical engineer |
| Equipment snapshots | 8am, 12pm, 4pm, 8pm | System |
| Data purge (45-day rolling) | Midnight EAT | System |
