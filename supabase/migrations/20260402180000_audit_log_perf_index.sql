-- ENG-159: Console audit lists `audit_log` ordered by `created_at DESC`.
-- `idx_audit_log_created` from 20250321000004_audit_log.sql already indexes `(created_at DESC)`.
-- No duplicate btree index added.

SELECT 1;
