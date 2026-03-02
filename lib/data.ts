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
    label: "Maintenance Due",
    value: 28,
    change: -5,
    changeLabel: "vs last week",
    trend: "down" as const,
    color: "amber",
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

export const assetValueData = [
  { day: "O", operational: 180, maintenance: 40 },
  { day: "S", operational: 220, maintenance: 30 },
  { day: "M", operational: 260, maintenance: 55 },
  { day: "T", operational: 190, maintenance: 45 },
  { day: "W", operational: 310, maintenance: 60 },
  { day: "T", operational: 275, maintenance: 35 },
  { day: "F", operational: 240, maintenance: 50 },
  { day: "S", operational: 200, maintenance: 25 },
];

export const equipmentCategoryData = [
  { name: "Diagnostic", value: 142, color: "#6366f1" },
  { name: "Surgical", value: 87, color: "#a5b4fc" },
  { name: "Monitoring", value: 63, color: "#e0e7ff" },
  { name: "Life Support", value: 38, color: "#c7d2fe" },
];

export const dailyScanData = [
  { day: "S", scans: 42 },
  { day: "M", scans: 88 },
  { day: "T", scans: 76 },
  { day: "W", scans: 124 },
  { day: "T", scans: 95 },
  { day: "F", scans: 110 },
  { day: "S", scans: 58 },
];

export const equipmentStatusData = [
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
];

export const inventoryData = {
  accuracy: 72,
  breakdown: [
    { label: "Fully Stocked", value: 50, color: "#6366f1" },
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
  },
  {
    id: 2,
    equipment: "Mindray Ventilator MV50",
    department: "ICU",
    status: "maintenance",
    scannedBy: "Tech. Omondi",
    time: "8 min ago",
    location: "ICU Bay 2",
  },
  {
    id: 3,
    equipment: "GE ECG Machine MAC 5500",
    department: "Casualty",
    status: "operational",
    scannedBy: "Dr. Nakato",
    time: "15 min ago",
    location: "A&E Room 1",
  },
  {
    id: 4,
    equipment: "Autoclave 23L",
    department: "Theatre",
    status: "offline",
    scannedBy: "Tech. Mwangi",
    time: "22 min ago",
    location: "Theatre Prep",
  },
  {
    id: 5,
    equipment: "Pulse Oximeter Set (x4)",
    department: "Paediatrics",
    status: "operational",
    scannedBy: "Nurse Zawadi",
    time: "31 min ago",
    location: "Paeds Ward",
  },
];

export const departments = [
  {
    id: "icu",
    name: "ICU",
    equipmentCount: 48,
    technicianCount: 3,
    healthScore: 91,
    expanded: true,
    technicians: [
      { name: "Tech. Omondi", time: "08:00 AM", avatar: "TO" },
      { name: "Tech. Auma", time: "10:30 AM", avatar: "TA" },
    ],
  },
  {
    id: "theatre",
    name: "Theatre",
    equipmentCount: 62,
    technicianCount: 4,
    healthScore: 87,
    expanded: false,
    technicians: [
      { name: "Tech. Mwangi", time: "07:00 AM", avatar: "TM" },
    ],
  },
  {
    id: "maternity",
    name: "Maternity",
    equipmentCount: 35,
    technicianCount: 2,
    healthScore: 94,
    expanded: false,
    technicians: [],
  },
  {
    id: "casualty",
    name: "Casualty",
    equipmentCount: 41,
    technicianCount: 3,
    healthScore: 78,
    expanded: false,
    technicians: [],
  },
];

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
