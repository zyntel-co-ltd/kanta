# Kanta Data Classification Policy

> Version 1.0 — March 2026  
> Owner: Zyntel Co. Ltd, Engineering & Legal

---

## 1. Purpose

This document defines, in writing, the boundary between **operational data** and **patient-adjacent data** within the Kanta platform. This line is architectural — it determines what may enter AI/ML training pipelines, what is anonymised before leaving a facility's data scope, and what is never used for any purpose beyond direct service delivery.

---

## 2. Data Categories

### Class A — Operational Data (may be used for platform improvement with customer consent)

These fields describe *how the lab runs*, not *who the patient is*.

| Field | Table | Notes |
|---|---|---|
| `received_at` | `test_requests` | Timestamp only |
| `result_at` | `test_requests` | Timestamp only |
| `tat_minutes` | `test_requests`, `tat_anomaly_baselines` | Derived duration, no identity |
| `section` | `test_requests` | e.g. "Haematology" |
| `test_name` | `test_requests` | e.g. "FBC", "CD4" |
| `status` | `test_requests` | "pending", "resulted", etc. |
| `equipment_id` | `equipment`, `test_requests` | Internal UUID, not a person |
| `z_score`, `deviation_pct` | `tat_anomaly_flags` | Derived statistics |
| `rack_type`, `rack_name` | `lab_racks` | Physical logistics only |
| QC result values (aggregate) | `qc_results` | Only when de-identified |

### Class B — Patient-Adjacent Data (never enters training pipelines)

These fields can, alone or in combination, identify a specific patient.

| Field | Table | Restriction |
|---|---|---|
| `patient_id` | `test_requests`, `lab_samples` | **Never** in AI context |
| `lab_number`, `barcode` | `test_requests`, `lab_samples` | **Never** in AI context |
| `patient_name` | Any | **Never** stored or transmitted to AI |
| Clinical result values | `test_requests` | **Never** in AI context |
| `notes` (free text) | Any | May contain patient info — excluded |
| Date of birth, gender, age | Any | **Never** in AI context |

### Class C — Facility-Identifying Data (hashed before training)

| Field | Handling |
|---|---|
| `facility_id` | Replaced with `SHA-256(facility_id + FACILITY_HASH_SALT)` before any training export |
| `facility_name` | Never included in training datasets |
| Staff / user IDs | Never included in training datasets |

---

## 3. AI Inference Data Policy

**Every AI call must comply with the following:**

1. Only Class A fields may be passed to external AI models (Anthropic, OpenAI, etc.)
2. The system prompt explicitly prohibits clinical or patient inference in all AI features
3. Every inference is logged in `ai_inference_log` with: model, feature, data sources, row count, output hash, latency
4. Logs are retained for 24 months for compliance auditing
5. No raw patient records are ever passed — only aggregated statistics and anonymised operational metrics

---

## 4. Data Flywheel — Training Pipeline Rules

When `DATA_FLYWHEEL_ENABLED=true` (requires customer ToS acceptance):

- Only Class A fields are exported
- `facility_id` is hashed with rotating salt (`FACILITY_HASH_SALT`)
- Export pipeline uses **read-only** Supabase service role, restricted to aggregated views
- No raw `test_requests` rows — only pre-computed baselines and anomaly flags
- Training datasets are stored in isolated S3-equivalent storage, access-logged
- Facility-specific data is indistinguishable from other facilities in the training set

---

## 5. Anonymisation Standard

The anonymisation process for cross-facility model training:

```
Input:  { facility_id, section, test_name, tat_minutes, z_score, hour_of_day, day_of_week }
Output: { anon_facility_id = SHA256(facility_id + SALT), section, test_name, tat_minutes, z_score, hour, dow }
```

- Salt rotates annually
- No geographic metadata included
- No staff counts or bed counts (could identify facility)
- Minimum 50 records per facility before inclusion in any cross-facility model

---

## 6. Regulatory Alignment

| Framework | How Kanta Complies |
|---|---|
| Uganda DPA 2019 | Patient data never leaves the facility's Supabase project scope |
| Kenya DPA 2019 | Same isolation. Data processing agreement available on request |
| GDPR (international clients) | Class B data subject to DPA. Class A operational data is not personal data under GDPR Art. 4 |
| ISO 15189 | Audit trail maintained in `ai_inference_log` |

---

*Approved by: Zyntel Engineering Lead*  
*Next review: March 2027*
