/**
 * Zyntel API v1 client — versioned REST API for Kanta.app
 * Same-origin in Phase 1 (Vercel). Phase 2: points to api.zyntel.app.
 *
 * Future: API key auth, rate limits, webhooks — designed for B2B (EMRs, insurance).
 */

const API_BASE = "/api/v1";

function url(path: string, params?: Record<string, string>): string {
  const pathStr = path.startsWith("/") ? path : `/${path}`;
  const full = `${API_BASE}${pathStr}`;
  if (params && Object.keys(params).length) {
    const search = new URLSearchParams(params).toString();
    return `${full}?${search}`;
  }
  return full;
}

export async function fetchDashboard(hospitalId: string) {
  const res = await fetch(url("/dashboard", { hospital_id: hospitalId }));
  return res.json();
}

export async function fetchScans(hospitalId: string, limit = 10) {
  const res = await fetch(url("/scans", { hospital_id: hospitalId, limit: String(limit) }));
  return res.json();
}

export async function logScan(payload: {
  equipment_id: string;
  hospital_id: string;
  scanned_by: string;
  status_at_scan: string;
  location?: string;
  notes?: string;
}) {
  const res = await fetch(url("/scans"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchEquipment(
  hospitalId: string,
  filters?: { status?: string; department_id?: string }
) {
  const params: Record<string, string> = { hospital_id: hospitalId };
  if (filters?.status) params.status = filters.status;
  if (filters?.department_id) params.department_id = filters.department_id;
  const res = await fetch(url("/equipment", params));
  return res.json();
}

export async function fetchDepartments(hospitalId: string) {
  const res = await fetch(url("/departments", { hospital_id: hospitalId }));
  return res.json();
}

export async function createEquipment(payload: {
  name: string;
  hospital_id: string;
  department_id: string;
  model?: string;
  serial_number?: string;
  category?: string;
  location?: string;
  next_maintenance_at?: string;
}) {
  const res = await fetch(url("/equipment"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateEquipmentStatus(
  equipmentId: string,
  status: "operational" | "maintenance" | "offline" | "retired"
) {
  const res = await fetch(`${API_BASE}/equipment/${equipmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function fetchEquipmentByQr(hospitalId: string, qrCode: string) {
  const res = await fetch(
    url("/equipment", { hospital_id: hospitalId, qr_code: qrCode })
  );
  return res.json();
}

export async function fetchMaintenanceDue(facilityId: string) {
  const res = await fetch(
    url("/maintenance/due", { facility_id: facilityId })
  );
  return res.json();
}

export async function markMaintained(payload: {
  equipment_id: string;
  facility_id: string;
  notes?: string;
}) {
  const res = await fetch(`${API_BASE}/maintenance/mark-maintained`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}
