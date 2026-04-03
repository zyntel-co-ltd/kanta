#!/usr/bin/env bash
# ENG-93: Start local Postgres via Docker Compose and wait until it accepts connections.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

docker compose up -d postgres

echo "Waiting for Postgres on port 54322…"
for i in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U postgres -d kanta >/dev/null 2>&1; then
    echo "Ready. Connection: postgresql://postgres:postgres@127.0.0.1:54322/kanta"
    echo "Apply SQL under supabase/migrations with your preferred tool, or use hosted Supabase for full stack."
    exit 0
  fi
  sleep 1
done

echo "Timeout waiting for Postgres" >&2
exit 1
