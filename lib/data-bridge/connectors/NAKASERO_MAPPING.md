# Nakasero (LabGuru) — reference LIMS mapping

This documents the **Nakasero Hospital** LabGuru PostgreSQL layout used by the legacy `zyntel-dashboard` scripts. Other facilities should copy this structure into `lims_connections.query_config` with their own table/column names.

## Source

- **Engine:** PostgreSQL (LabGuru internal DB)
- **Primary table:** `lab_requests` (example name; confirm against your LabGuru schema)
- **Typical columns** used for TAT and lab intelligence:

| LabGuru / LIMS column | Maps to `LIMSQueryConfig` | Kanta use |
|----------------------|---------------------------|-----------|
| Primary key or stable id | `idColumn` | `test_requests.lims_external_id` (dedupe) |
| `sample_no` | `sampleIdColumn` / `labNumberColumn` | Sample / lab number on dashboards |
| `received_time` | `receivedAtColumn` | TAT start; **required for TAT** when present |
| `result_time` | `resultAtColumn` | TAT end / resulted |
| `section_name` or `lab_section` | `sectionColumn` | Section grouping |
| `test_name` | `testNameColumn` | Test name |

## Example `query_config`

```json
{
  "testRequestTable": "lab_requests",
  "idColumn": "id",
  "sampleIdColumn": "sample_no",
  "labNumberColumn": "sample_no",
  "testNameColumn": "test_name",
  "sectionColumn": "section_name",
  "receivedAtColumn": "received_time",
  "resultAtColumn": "result_time",
  "updatedAtColumn": "received_time"
}
```

Adjust `idColumn` to the real primary key column in your LabGuru export.

## Example `connection_config` (encrypted at rest)

Plain shape before encryption (see `lib/data-bridge/crypto.ts`):

```json
{
  "host": "lims-db.example.com",
  "port": 5432,
  "database": "labguru",
  "user": "readonly_bridge",
  "password": "***",
  "ssl": true
}
```

Never commit passwords or log `connection_config` in production.

## Notes

- Incremental sync uses `updatedAtColumn` when set; otherwise `receivedAtColumn` (or the same column as in the example).
- If `received_time` is null for a row, TAT cannot be computed for that row; Kanta still stores the row with `received_at` null — see **REGRESSIVE DESIGN** comments in `lib/data-bridge/transformers/tat.ts`.
