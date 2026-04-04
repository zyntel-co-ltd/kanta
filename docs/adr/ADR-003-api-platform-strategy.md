# ADR-003: Public HTTP API platform strategy

## Status

Accepted

## Context

Hospital partners and integrators need read-oriented, facility-scoped access to operational metrics (equipment availability, TAT benchmarks) without interactive login. The dashboard remains the primary surface for humans; the API is for automation and future product surfaces.

## Decision

- **Authentication:** Per-facility API keys. Plaintext format `kanta_` + 32 random bytes (hex). Only a SHA-256 hash is stored (`api_keys` table). Keys are created and revoked from the admin panel.
- **Authorization:** Each key is bound to exactly one `facility_id`. URL paths include `{facilityId}`; handlers return 403 if it does not match the key’s facility.
- **Rate limiting:** Per-key sliding windows (minute and day) using Upstash Redis, with optional graceful degradation if Redis is unavailable. Global IP rate limiting in middleware is **skipped** for `/api/v1/*` so limits remain per-key and predictable.
- **Caching:** Equipment summary responses may be cached in Redis for five minutes to protect the database under polling clients.
- **Documentation:** A public page at `/api-platform` summarizes auth, limits, and endpoints for operators. This ADR records rationale.

## Consequences

- Key compromise is contained to one facility; rotating keys is an admin action.
- Service role Supabase access is required server-side; no direct anon access to `api_keys`.
- Clients must treat keys as secrets and store them in secure configuration.
