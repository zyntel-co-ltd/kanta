# Terms of Service — Section 8: AI and Operational Data

> Draft clause for inclusion in Kanta Customer Agreement  
> Version 1.0 — March 2026 | Zyntel Co. Ltd

---

## Section 8 — Artificial Intelligence Features and Operational Data

### 8.1 AI-Powered Features

The Kanta platform includes artificial intelligence features ("AI Features") including but not limited to: TAT anomaly detection, natural language dashboard queries, and weekly operational summaries. These features process your facility's operational data solely for the purpose of delivering the Service to you.

### 8.2 Data Used in AI Features

AI Features use only **operational data** — timestamps, equipment identifiers, test codes, turnaround durations, and derived statistics. AI Features do not process, transmit, or analyse patient names, patient identifiers, clinical result values, or any data that individually identifies a patient. This boundary is enforced architecturally and is described in Zyntel's Data Classification Policy (available on request).

### 8.3 Platform Improvement — Opt-In

**Subject to your explicit opt-in below**, Zyntel may use anonymised operational data to improve the Kanta platform, including training and refining AI models that benefit all facilities on the network.

**What "anonymised" means:** Your facility identifier is replaced with a cryptographic hash before entering any shared analysis or training pipeline. No facility name, geographic data, or staff information is included. No patient data of any kind is included. The anonymisation standard is defined in Zyntel's Data Classification Policy.

**What we use it for:** Improving anomaly detection accuracy, refining TAT baseline models, identifying equipment degradation patterns that predict failures before they occur. The same logic that makes Stripe's fraud detection better as more transactions flow through it.

**Your opt-in status:**

☐ **I consent** to Zyntel using anonymised operational data (as defined above) for platform improvement and AI model training, in accordance with Section 8 and the Data Classification Policy.

☐ **I do not consent.** My facility's data will be used only to deliver the Service to my facility and will not be included in any cross-facility training pipeline.

*Your selection does not affect Service availability, pricing, or feature access. You may change your selection at any time by contacting support@kanta.app.*

### 8.4 Audit Trail

Every AI inference performed on your facility's data is logged in a tamper-evident audit log recording: the AI model used, the data sources referenced (by table name, never by content), the number of data rows referenced, a cryptographic hash of the output, and the time of the inference. This log is available to you upon request.

### 8.5 No Clinical Use

AI Features are operational tools for laboratory management. They do not provide clinical advice, diagnostic support, or any output that should be used to inform clinical decisions about individual patients. Any output that appears to reference patient-level information is a model error and should be reported to Zyntel immediately.

### 8.6 Data Residency

Your operational data remains within your Supabase project. Zyntel does not maintain a separate copy of your raw data. AI inference calls transmit only the minimum aggregated statistics necessary to answer the specific query, and these are not stored by Zyntel beyond the audit log entry described in Section 8.4.

---

*This clause is a draft for legal review. Final language to be approved by Zyntel legal counsel and, where required, customer legal counsel before execution.*
