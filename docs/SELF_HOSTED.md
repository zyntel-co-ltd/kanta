# Self-hosted local database (Docker)

Kanta normally uses **Supabase** (hosted Postgres + Auth + storage). For offline schema work or experiments, you can run **Postgres only** with Docker.

## Prerequisites

- Docker Desktop or Docker Engine with Compose v2

## Start Postgres

From the `kanta` directory:

```bash
chmod +x scripts/create-local-db.sh
./scripts/create-local-db.sh
```

Or:

```bash
docker compose up -d postgres
```

Default URL:

`postgresql://postgres:postgres@127.0.0.1:54322/kanta`

## Environment

See `.env.local.docker.example` for a template `DATABASE_URL`. The Next.js app still expects Supabase URL and keys for auth and RLS-backed features; a raw Postgres container does **not** replace Supabase Auth. Use this stack mainly for running migrations, ad hoc SQL, or pairing with a full local Supabase CLI project if you add one later.

## Migrations

SQL migrations live in `supabase/migrations/`. Apply them with `psql`, a GUI, or Supabase CLI linked to this database.

## Stop

```bash
docker compose down
```

Data is kept in the `kanta_pgdata` volume until you remove it with `docker compose down -v`.
