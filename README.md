This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database backups (Production)

Kanta runs an automated PostgreSQL backup workflow daily at **02:00 UTC** via GitHub Actions. Backups are created with `pg_dump`, compressed with `gzip`, and uploaded to Cloudflare R2.

For the full restore procedure, see `docs/RESTORE_RUNBOOK.md`.

### Storage path

- **R2 key prefix**: `${BACKUP_REPO_PREFIX}/daily/` (defaults to `backups/kanta/daily/`)
- **Object naming**: `kanta_backup_YYYY-MM-DD.sql.gz`

CSV snapshots are also uploaded for key tables:

- **R2 key prefix (CSV)**: `${BACKUP_REPO_PREFIX}/csv/YYYY-MM-DD/` (defaults to `backups/kanta/csv/YYYY-MM-DD/`)

### Retention

- **Daily**: keep the 7 most recent backups
- **Weekly**: keep Sunday snapshots for 4 weeks

### Required GitHub Actions secrets

- `DATABASE_URL` (Supabase direct connection string; not pooled)
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `BACKUP_REPO_PREFIX` (optional; defaults to `backups/kanta`)

### Restore (manual)

Download a backup from R2, then restore into a target Postgres database.

```bash
# Example: restore to a local Postgres (be careful with the target DB)
gunzip -c kanta_backup_YYYY-MM-DD.sql.gz | psql "$TARGET_DATABASE_URL"
```
