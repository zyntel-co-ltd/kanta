## Kanta production database restore runbook

This runbook describes how to restore the Kanta production PostgreSQL database from the automated R2 backups.

### What you need

- **Target database URL**: a Postgres connection string you intend to restore *into* (local Postgres, a temporary restore environment, or a replacement Supabase project).
- **R2 credentials**: retrieve from **1Password → Infrastructure vault**:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - Optional: `R2_ENDPOINT_URL`
  - Optional: `BACKUP_REPO_PREFIX` (defaults to `backups/kanta`)
- **CLI tools installed**:
  - `aws` CLI (S3-compatible commands used for R2)
  - `gunzip`
  - `psql`

### Backup paths in R2

Backups are stored in the R2 bucket under the configured prefix:

- **Database dumps**: `${BACKUP_REPO_PREFIX}/daily/kanta_backup_YYYY-MM-DD.sql.gz`
- **CSV snapshots**: `${BACKUP_REPO_PREFIX}/csv/YYYY-MM-DD/<table>.csv`

If `BACKUP_REPO_PREFIX` is not set, use the default `backups/kanta`.

### 1) Download the backup from R2

Pick the date you want to restore (UTC).

```bash
export RESTORE_DATE="YYYY-MM-DD"
export BACKUP_REPO_PREFIX="backups/kanta"   # or your configured prefix

export R2_BUCKET_NAME="..."                 # from 1Password
export R2_ACCOUNT_ID="..."                  # from 1Password
export R2_ENDPOINT_URL="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

aws s3 cp \
  "s3://${R2_BUCKET_NAME}/${BACKUP_REPO_PREFIX}/daily/kanta_backup_${RESTORE_DATE}.sql.gz" \
  "./kanta_backup_${RESTORE_DATE}.sql.gz" \
  --endpoint-url "${R2_ENDPOINT_URL}"
```

### 2) Decompress with gunzip

```bash
gunzip -k "./kanta_backup_${RESTORE_DATE}.sql.gz"
```

This will produce `kanta_backup_YYYY-MM-DD.sql`.

### 3) Restore with psql

Restore into the target database URL.

```bash
export TARGET_DATABASE_URL="postgresql://..."

psql "${TARGET_DATABASE_URL}" < "./kanta_backup_${RESTORE_DATE}.sql"
```

### 4) Verify restore with basic sanity queries

```bash
psql "${TARGET_DATABASE_URL}" -c "SELECT COUNT(*) FROM equipment;"
psql "${TARGET_DATABASE_URL}" -c "SELECT COUNT(*) FROM facilities;"
```

### 5) Redeploy on Vercel

Redeploy Kanta on Vercel to ensure the app restarts cleanly against the restored database.

### Notes / pitfalls

- **Do not store credentials in this repo**: keep all DB/R2 credentials in **1Password → Infrastructure vault** and GitHub Actions secrets.
- **Encryption keys**: if Kanta introduces encrypted columns in the future, ensure any required encryption keys are also backed up and retrievable from 1Password (separate from DB backups).
