// Kanta Dashboard — Mock Data
// Swap these with Supabase queries when backend is ready

export const kpiCards = [
  {
    id: "alerts",
    label: "Critical Alerts",
    value: 14,
    change: +3,
    changeLabel: "since yesterday",
    trend: "up" as const,
    color: "red",
    // severity breakdown: critical / warning / info
    severity: { critical: 3, warning: 5, info: 6 },
  },
  {
    id: "scanned",
    label: "Equipment Scanned",
    value: 312,
    change: +47,
    changeLabel: "this week",
    trend: "up" as const,
    color: "indigo",
  },
  {
    id: "maintenance",
    label: "Maintenance Compliance",
    value: 74,
    unit: "%",
    change: -4,
    changeLabel: "18 of 28 completed on time",
    trend: "down" as const,
    color: "amber",
    // raw counts for tooltip
    compliance: { completed: 18, total: 28, overdue: 10 },
  },
  {
    id: "health",
    label: "Fleet Health Score",
    value: 84,
    unit: "%",
    change: +2,
    changeLabel: "vs last month",
    trend: "up" as const,
    color: "emerald",
  },
];

// ── Asset Value Chart ────────────────────────────────────────────────────────

export const assetValueDataByPeriod = {
  "7d": [
    { day: "O", operational: 180, maintenance: 40 },
    { day: "S", operational: 220, maintenance: 30 },
    { day: "M", operational: 260, maintenance: 55 },
    { day: "T", operational: 190, maintenance: 45 },
    { day: "W", operational: 310, maintenance: 60 },
    { day: "T", operational: 275, maintenance: 35 },
    { day: "F", operational: 240, maintenance: 50 },
  ],
  "30d": [
    { day: "W1", operational: 240, maintenance: 48 },
    { day: "W2", operational: 270, maintenance: 52 },
    { day: "W3", operational: 295, maintenance: 44 },
    { day: "W4", operational: 310, maintenance: 60 },
  ],
  "90d": [
    { day: "Jan", operational: 280, maintenance: 40 },
    { day: "Feb", operational: 295, maintenance: 35 },
    { day: "Mar", operational: 310, maintenance: 50 },
  ],
};

// Legacy export kept for backward compat
export const assetValueData = assetValueDataByPeriod["7d"];

// ── Category Donut Chart ─────────────────────────────────────────────────────

export const equipmentCategoryData = [
  { name: "Diagnostic", value: 142, color: "#059669" },
  { name: "Surgical", value: 87, color: "#6ee7b7" },
  { name: "Monitoring", value: 63, color: "#d1fae5" },
  { name: "Life Support", value: 38, color: "#c7d2fe" },
];

// ── Daily Scan Chart ─────────────────────────────────────────────────────────

export const dailyScanDataByPeriod = {
  "7d": [
    { day: "S", scans: 42 },
    { day: "M", scans: 88 },
    { day: "T", scans: 76 },
    { day: "W", scans: 124 },
    { day: "T", scans: 95 },
    { day: "F", scans: 110 },
    { day: "S", scans: 58 },
  ],
  "30d": [
    { day: "W1", scans: 480 },
    { day: "W2", scans: 530 },
    { day: "W3", scans: 510 },
    { day: "W4", scans: 593 },
  ],
  "90d": [
    { day: "Jan", scans: 1820 },
    { day: "Feb", scans: 2100 },
    { day: "Mar", scans: 2113 },
  ],
};

export const dailyScanData = dailyScanDataByPeriod["7d"];

// ── Equipment Status Chart ───────────────────────────────────────────────────

export const equipmentStatusDataByPeriod = {
  "3m": [
    { month: "Jan", operational: 280, maintenance: 40, retired: 5 },
    { month: "Feb", operational: 295, maintenance: 35, retired: 4 },
    { month: "Mar", operational: 310, maintenance: 50, retired: 6 },
  ],
  "6m": [
    { month: "Jan", operational: 280, maintenance: 40, retired: 5 },
    { month: "Feb", operational: 295, maintenance: 35, retired: 4 },
    { month: "Mar", operational: 310, maintenance: 50, retired: 6 },
    { month: "Apr", operational: 290, maintenance: 60, retired: 8 },
    { month: "May", operational: 320, maintenance: 45, retired: 7 },
    { month: "Jun", operational: 335, maintenance: 55, retired: 9 },
  ],
  "12m": [
    { month: "Jan", operational: 280, maintenance: 40, retired: 5 },
    { month: "Feb", operational: 295, maintenance: 35, retired: 4 },
    { month: "Mar", operational: 310, maintenance: 50, retired: 6 },
    { month: "Apr", operational: 290, maintenance: 60, retired: 8 },
    { month: "May", operational: 320, maintenance: 45, retired: 7 },
    { month: "Jun", operational: 335, maintenance: 55, retired: 9 },
    { month: "Jul", operational: 315, maintenance: 48, retired: 6 },
    { month: "Aug", operational: 340, maintenance: 42, retired: 5 },
    { month: "Sep", operational: 328, maintenance: 58, retired: 10 },
    { month: "Oct", operational: 350, maintenance: 38, retired: 7 },
    { month: "Nov", operational: 345, maintenance: 44, retired: 8 },
  ],
};

export const equipmentStatusData = equipmentStatusDataByPeriod["12m"];

export const inventoryData = {
  accuracy: 72,
  breakdown: [
    { label: "Fully Stocked", value: 50, color: "#059669" },
    { label: "Low Supply", value: 35, color: "#94a3b8" },
    { label: "Critical", value: 15, color: "#e2e8f0" },
  ],
  restockDue: "3 Days",
};

export const scanFeed = [
  {
    id: 1,
    equipment: "Philips Ultrasound X7",
    department: "Maternity",
    status: "operational",
    scannedBy: "Nurse Achieng",
    time: "2 min ago",
    location: "Ward 3B",
    purchaseYear: 2023,
  },
  {
    id: 2,
    equipment: "Mindray Ventilator MV50",
    department: "ICU",
    status: "maintenance",
    scannedBy: "Tech. Omondi",
    time: "8 min ago",
    location: "ICU Bay 2",
    purchaseYear: 2019,
  },
  {
    id: 3,
    equipment: "GE ECG Machine MAC 5500",
    department: "Casualty",
    status: "operational",
    scannedBy: "Dr. Nakato",
    time: "15 min ago",
    location: "A&E Room 1",
    purchaseYear: 2021,
  },
  {
    id: 4,
    equipment: "Autoclave 23L",
    department: "Theatre",
    status: "offline",
    scannedBy: "Tech. Mwangi",
    time: "22 min ago",
    location: "Theatre Prep",
    purchaseYear: 2016,
  },
  {
    id: 5,
    equipment: "Pulse Oximeter Set (x4)",
    department: "Paediatrics",
    status: "operational",
    scannedBy: "Nurse Zawadi",
    time: "31 min ago",
    location: "Paeds Ward",
    purchaseYear: 2024,
  },
];

// Full list of standard hospital departments
export const STANDARD_HOSPITAL_DEPARTMENTS = [
  "ICU", "Theatre", "Maternity", "Casualty", "Paediatrics", "Emergency",
  "Outpatient", "Radiology", "Laboratory", "Pharmacy", "Surgery",
  "Cardiology", "Orthopaedics", "Anaesthesia", "Neonatology", "Oncology",
  "Dialysis", "Physiotherapy", "Psychiatry", "General Medicine", "Ward",
];

export const departments = STANDARD_HOSPITAL_DEPARTMENTS.map((name, i) => ({
  id: `dept-${String(i + 1).padStart(2, "0")}`,
  name,
  equipmentCount: Math.floor(Math.random() * 50) + 5,
  technicianCount: Math.floor(Math.random() * 4) + 1,
  healthScore: 70 + Math.floor(Math.random() * 30),
  expanded: i === 0,
  technicians:
    i < 3
      ? [
          { name: `Tech. ${["Omondi", "Auma", "Mwangi", "Nakato"][i]}`, time: "08:00 AM", avatar: "TO" },
        ]
      : [],
}));

export const scheduleData = {
  month: "Mar",
  year: 2026,
  days: [1, 2, 3, 4, 5, 6],
  activeDay: 2,
  nextMaintenance: {
    equipment: "Mindray Ventilator MV50",
    department: "ICU",
    time: "10:00 AM",
    type: "Scheduled Service",
  },
};
