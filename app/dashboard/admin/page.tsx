"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  Ban,
  ClipboardList,
  Sliders,
  Save,
  Cog,
} from "lucide-react";
import Link from "next/link";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import AdminUsersSection from "@/components/dashboard/admin/AdminUsersSection";
import AdminConfigurationSection from "@/components/dashboard/admin/AdminConfigurationSection";
import { auditActionLabel } from "@/lib/auditLabels";
import { LoadingBars } from "@/components/ui/PageLoader";

const LAB_SECTIONS = [
  "CHEMISTRY",
  "HAEMATOLOGY",
  "MICROBIOLOGY",
  "SEROLOGY",
  "REFERRAL",
  "N/A",
];

const TAT_OPTIONS = [30, 45, 60, 90, 240, 1440, 4320, 7200, 17280];

type Tab = "users" | "configuration" | "unmatched" | "cancellations" | "audit" | "settings";

type UnmatchedTest = {
  id: string;
  test_name: string;
  source: string;
  first_seen: string;
  occurrence_count: number;
};

type Stats = {
  totalTests: number;
  totalUsers: number;
  unmatchedTests: number;
  recentCancellations: number;
};

const UNMATCHED_PAGE_SIZE = 15;

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [unmatchedTests, setUnmatchedTests] = useState<UnmatchedTest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cancellationAnalytics, setCancellationAnalytics] = useState<
    { reason: string; count: number }[]
  >([]);
  const [loginLogs, setLoginLogs] = useState<
    Array<{
      id: string;
      username: string;
      success: boolean;
      ip_address: string | null;
      created_at: string;
    }>
  >([]);
  const [opLogs, setOpLogs] = useState<
    Array<{
      id: string;
      action: string;
      table_name: string | null;
      record_id: string | null;
      created_at: string;
    }>
  >([]);
  const [, setAuditTotals] = useState({ login: 0, op: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const { facilityAuth, facilityAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (facilityAuthLoading) return;
    if (!facilityAuth?.canAccessAdminPanel) {
      router.replace("/dashboard/home");
    }
  }, [facilityAuthLoading, facilityAuth, router]);

  const [monthlyTarget, setMonthlyTarget] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    target: 1500000000,
  });
  const [testsTarget, setTestsTarget] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    target: 10000,
  });
  const [numbersTarget, setNumbersTarget] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    target: 15000,
  });

  const [unmatchedEdits, setUnmatchedEdits] = useState<
    Record<string, { labSection: string; tat: number; price: number }>
  >({});
  const [unmatchedSaving, setUnmatchedSaving] = useState<string | "all" | null>(null);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [cancellationFilters, setCancellationFilters] = useState({
    period: "thisMonth",
    labSection: "all",
  });
  const [auditSubTab, setAuditSubTab] = useState<"login" | "operations" | "compliance">("login");
  const [auditFilters, setAuditFilters] = useState({
    startDate: "",
    endDate: "",
    username: "",
    success: "",
    action: "",
    limit: 50,
  });
  const [compliancePage, setCompliancePage] = useState(1);
  const [complianceTotal, setComplianceTotal] = useState(0);
  const [complianceRows, setComplianceRows] = useState<
    Array<{
      id: string;
      action: string;
      entity_type: string | null;
      record_id: string | null;
      old_value: unknown;
      new_value: unknown;
      created_at: string;
      actor_display: string;
      actor_email: string;
    }>
  >([]);
  const [compliancePreset, setCompliancePreset] = useState<"7" | "30" | "90" | "custom">("30");
  const [complianceFrom, setComplianceFrom] = useState("");
  const [complianceTo, setComplianceTo] = useState("");

  const [facilityList, setFacilityList] = useState<{ id: string; name: string }[]>([]);
  const [facilityOverride, setFacilityOverride] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityAuth?.isSuperAdmin) return;
    fetch("/api/admin/facilities")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown) => {
        if (Array.isArray(rows)) setFacilityList(rows as { id: string; name: string }[]);
      });
  }, [facilityAuth?.isSuperAdmin]);

  useEffect(() => {
    if (!facilityAuth?.isSuperAdmin || facilityList.length === 0) return;
    if (facilityOverride === null) {
      const preferred =
        facilityAuth.facilityId &&
        facilityList.some((f) => f.id === facilityAuth.facilityId)
          ? facilityAuth.facilityId
          : facilityList[0].id;
      setFacilityOverride(preferred);
    }
  }, [facilityAuth?.isSuperAdmin, facilityAuth?.facilityId, facilityList, facilityOverride]);

  const facilityId = useMemo(() => {
    if (facilityAuth?.isSuperAdmin) {
      return facilityOverride ?? facilityAuth.facilityId ?? DEFAULT_FACILITY_ID;
    }
    return facilityAuth?.facilityId ?? DEFAULT_FACILITY_ID;
  }, [facilityAuth, facilityOverride]);

  const fetchTargets = useCallback(async () => {
    try {
      const [rev, tests, numbers] = await Promise.all([
        fetch(
          `/api/admin/targets/revenue?facility_id=${facilityId}&month=${monthlyTarget.month}&year=${monthlyTarget.year}`
        ),
        fetch(
          `/api/admin/targets/tests?facility_id=${facilityId}&month=${testsTarget.month}&year=${testsTarget.year}`
        ),
        fetch(
          `/api/admin/targets/numbers?facility_id=${facilityId}&month=${numbersTarget.month}&year=${numbersTarget.year}`
        ),
      ]);
      const [revJ, testsJ, numbersJ] = await Promise.all([
        rev.json(),
        tests.json(),
        numbers.json(),
      ]);
      if (revJ?.target != null) setMonthlyTarget((p) => ({ ...p, target: revJ.target }));
      if (testsJ?.target != null) setTestsTarget((p) => ({ ...p, target: testsJ.target }));
      if (numbersJ?.target != null) setNumbersTarget((p) => ({ ...p, target: numbersJ.target }));
    } catch (e) {
      console.error("Error fetching targets:", e);
    }
  }, [
    facilityId,
    monthlyTarget.month,
    monthlyTarget.year,
    testsTarget.month,
    testsTarget.year,
    numbersTarget.month,
    numbersTarget.year,
  ]);

  const fetchAudit = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("facility_id", facilityId);
    if (auditFilters.startDate) params.set("startDate", auditFilters.startDate);
    if (auditFilters.endDate) params.set("endDate", auditFilters.endDate);
    params.set("limit", String(auditFilters.limit));
    if (auditSubTab === "login") {
      if (auditFilters.username) params.set("username", auditFilters.username);
      if (auditFilters.success) params.set("success", auditFilters.success);
      const res = await fetch(`/api/audit/login?${params}`);
      const data = await res.json();
      setLoginLogs(data.rows ?? []);
      setAuditTotals((p) => ({ ...p, login: data.total ?? 0 }));
    } else {
      if (auditFilters.action) params.set("action", auditFilters.action);
      const res = await fetch(`/api/audit/logs?${params}`);
      const data = await res.json();
      setOpLogs(data.rows ?? []);
      setAuditTotals((p) => ({ ...p, op: data.total ?? 0 }));
    }
  }, [facilityId, auditSubTab, auditFilters]);

  const fetchComplianceAudit = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("facility_id", facilityId);
    params.set("page", String(compliancePage));
    params.set("limit", "50");
    let from = complianceFrom;
    let to = complianceTo;
    if (compliancePreset !== "custom") {
      const end = new Date();
      const start = new Date();
      const days = compliancePreset === "7" ? 7 : compliancePreset === "30" ? 30 : 90;
      start.setDate(start.getDate() - days);
      from = start.toISOString().slice(0, 10);
      to = end.toISOString().slice(0, 10);
    }
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setComplianceRows(data.rows ?? []);
      setComplianceTotal(data.total ?? 0);
    } catch {
      setComplianceRows([]);
      setComplianceTotal(0);
    }
  }, [facilityId, compliancePage, compliancePreset, complianceFrom, complianceTo]);

  useEffect(() => {
    if (activeTab === "audit" && auditSubTab === "compliance") {
      void fetchComplianceAudit();
    }
  }, [activeTab, auditSubTab, fetchComplianceAudit]);

  const fetchData = useCallback(async () => {
    if (activeTab === "users" || activeTab === "configuration") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (activeTab === "unmatched") {
        const [statsRes, unmatchedRes] = await Promise.all([
          fetch(`/api/admin/stats?facility_id=${facilityId}`),
          fetch(`/api/admin/unmatched-tests?facility_id=${facilityId}`),
        ]);
        const statsData = await statsRes.json();
        const unmatchedData = await unmatchedRes.json();
        setStats(statsData);
        setUnmatchedTests(Array.isArray(unmatchedData) ? unmatchedData : []);
      } else if (activeTab === "cancellations") {
        const params = new URLSearchParams();
        params.set("facility_id", facilityId);
        params.set("period", cancellationFilters.period);
        if (cancellationFilters.labSection !== "all")
          params.set("labSection", cancellationFilters.labSection);
        const res = await fetch(`/api/admin/cancellation-analytics?${params}`);
        const data = await res.json();
        setCancellationAnalytics(Array.isArray(data) ? data : []);
      } else if (activeTab === "audit") {
        fetchAudit();
      }
    } catch (e) {
      console.error("Admin fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, facilityId, cancellationFilters, fetchAudit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "settings") fetchTargets();
  }, [activeTab, fetchTargets]);

  if (facilityAuthLoading || !facilityAuth?.canAccessAdminPanel) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingBars />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "User Management", icon: <Users size={16} /> },
    { id: "configuration", label: "Configuration", icon: <Cog size={16} /> },
    { id: "cancellations", label: "Cancellations", icon: <Ban size={16} /> },
    { id: "audit", label: "Audit Trail", icon: <ClipboardList size={16} /> },
    { id: "settings", label: "Settings", icon: <Sliders size={16} /> },
  ];

  const getUnmatchedEdit = (t: UnmatchedTest) =>
    unmatchedEdits[t.id] ?? { labSection: "CHEMISTRY", tat: 60, price: 0 };

  const setUnmatchedEdit = (id: string, field: string, value: string | number) => {
    setUnmatchedEdits((p) => ({
      ...p,
      [id]: {
        ...(p[id] ?? { labSection: "CHEMISTRY", tat: 60, price: 0 }),
        [field]: value,
      },
    }));
  };

  const handleAddToMeta = async (id: string) => {
    const edit = unmatchedEdits[id] ?? { labSection: "CHEMISTRY", tat: 60, price: 0 };
    if (edit.price <= 0) {
      setToast({ message: "Price must be > 0", type: "error" });
      return;
    }
    setUnmatchedSaving(id);
    try {
      const res = await fetch(`/api/admin/unmatched-tests/${id}/add-to-meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setToast({ message: `Added to Meta`, type: "success" });
      setUnmatchedEdits((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
      fetchData();
    } catch (e) {
      setToast({ message: (e as Error).message || "Error", type: "error" });
    } finally {
      setUnmatchedSaving(null);
    }
  };

  const handleResolveUnmatched = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/unmatched-tests/${id}/resolve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: "Resolved", type: "success" });
      fetchData();
    } catch {
      setToast({ message: "Failed to resolve", type: "error" });
    }
  };

  const handleAddAllToMeta = async () => {
    const items = unmatchedTests
      .map((t) => ({ id: t.id, ...getUnmatchedEdit(t) }))
      .filter((i) => i.price > 0);
    if (items.length === 0) {
      setToast({ message: "Add section, TAT, and price for at least one test", type: "error" });
      return;
    }
    setUnmatchedSaving("all");
    try {
      const res = await fetch("/api/admin/unmatched-tests/add-multiple-to-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      const succeeded = (data.results ?? []).filter((r: { success: boolean }) => r.success).length;
      setToast({ message: `Added ${succeeded} test(s) to Meta`, type: "success" });
      setUnmatchedEdits({});
      fetchData();
    } catch (e) {
      setToast({ message: (e as Error).message || "Error", type: "error" });
    } finally {
      setUnmatchedSaving(null);
    }
  };

  const saveTarget = async (
    type: "revenue" | "tests" | "numbers",
    payload: { month: number; year: number; target: number }
  ) => {
    try {
      const res = await fetch(`/api/admin/targets/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: facilityId, ...payload }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: `${type} target saved`, type: "success" });
    } catch {
      setToast({ message: "Failed to save", type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Admin Panel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            User management, cancellations, audit, and settings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {facilityAuth?.isSuperAdmin && facilityList.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 shrink-0">Facility</span>
              <select
                value={facilityId}
                onChange={(e) => setFacilityOverride(e.target.value)}
                className="min-w-[12rem] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900"
              >
                {facilityList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Link
            href="/dashboard/home"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ← Home
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Stats (Unmatched tab) */}
      {stats && activeTab === "unmatched" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Tests", value: stats.totalTests, color: "text-slate-700" },
            { label: "Active Users", value: stats.totalUsers, color: "text-emerald-600" },
            { label: "Unmatched Tests", value: stats.unmatchedTests, color: "text-amber-600" },
            { label: "Recent Cancellations", value: stats.recentCancellations, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-slate-100 p-4 text-center"
            >
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading && activeTab !== "settings" && activeTab !== "users" && activeTab !== "configuration" ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center min-h-[16rem]">
          <LoadingBars />
        </div>
      ) : (
        <>
          {activeTab === "users" && (
            <AdminUsersSection
              facilityId={facilityId}
              onToast={(message, type) => setToast({ message, type })}
            />
          )}

          {activeTab === "configuration" && (
            <AdminConfigurationSection
              facilityId={facilityId}
              onToast={(message, type) => setToast({ message, type })}
            />
          )}

          {activeTab === "unmatched" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <span className="font-semibold text-slate-800">Unmatched Test Names</span>
              </div>
              {unmatchedTests.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <AlertTriangle size={40} className="mx-auto mb-4 text-emerald-500" />
                  <p>No unmatched tests found. All test names are properly configured.</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm">
                    Add section, TAT, and price for each test, then save to add to Meta.
                  </div>
                  <div className="p-4">
                    <button
                      onClick={handleAddAllToMeta}
                      disabled={unmatchedSaving === "all"}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {unmatchedSaving === "all" ? "Saving..." : "Save All to Meta"}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left px-4 py-3 font-medium text-slate-600">Test Name</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">Source</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">Occurrences</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">Section</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">TAT</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">Price</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unmatchedTests
                          .slice(
                            (unmatchedPage - 1) * UNMATCHED_PAGE_SIZE,
                            unmatchedPage * UNMATCHED_PAGE_SIZE
                          )
                          .map((t) => {
                            const edit = getUnmatchedEdit(t);
                            return (
                              <tr key={t.id} className="border-b border-slate-50">
                                <td className="px-4 py-3 font-mono font-medium">{t.test_name}</td>
                                <td className="px-4 py-3">{t.source || "—"}</td>
                                <td className="px-4 py-3">{t.occurrence_count}</td>
                                <td className="px-4 py-3">
                                  <select
                                    value={edit.labSection}
                                    onChange={(e) =>
                                      setUnmatchedEdit(t.id, "labSection", e.target.value)
                                    }
                                    className="rounded border border-slate-200 px-2 py-1 text-sm"
                                  >
                                    {LAB_SECTIONS.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={edit.tat}
                                    onChange={(e) =>
                                      setUnmatchedEdit(t.id, "tat", parseInt(e.target.value))
                                    }
                                    className="rounded border border-slate-200 px-2 py-1 text-sm"
                                  >
                                    {TAT_OPTIONS.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={edit.price || ""}
                                    onChange={(e) =>
                                      setUnmatchedEdit(t.id, "price", parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-4 py-3 flex gap-2">
                                  <button
                                    onClick={() => handleAddToMeta(t.id)}
                                    disabled={unmatchedSaving !== null || edit.price <= 0}
                                    className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 disabled:opacity-50"
                                  >
                                    {unmatchedSaving === t.id ? "Saving..." : "Add to Meta"}
                                  </button>
                                  <button
                                    onClick={() => handleResolveUnmatched(t.id)}
                                    disabled={unmatchedSaving !== null}
                                    className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 disabled:opacity-50"
                                  >
                                    Resolve
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {unmatchedTests.length > UNMATCHED_PAGE_SIZE && (
                    <div className="p-4 flex items-center justify-between border-t border-slate-100">
                      <span className="text-sm text-slate-500">
                        Page {unmatchedPage} of{" "}
                        {Math.ceil(unmatchedTests.length / UNMATCHED_PAGE_SIZE)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setUnmatchedPage((p) => Math.max(1, p - 1))}
                          disabled={unmatchedPage <= 1}
                          className="px-3 py-1 rounded border border-slate-200 text-sm disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <button
                          onClick={() =>
                            setUnmatchedPage((p) =>
                              Math.min(Math.ceil(unmatchedTests.length / UNMATCHED_PAGE_SIZE), p + 1)
                            )
                          }
                          disabled={
                            unmatchedPage >= Math.ceil(unmatchedTests.length / UNMATCHED_PAGE_SIZE)
                          }
                          className="px-3 py-1 rounded border border-slate-200 text-sm disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "cancellations" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                <span className="font-semibold text-slate-800">Cancellation Analytics</span>
                <select
                  value={cancellationFilters.period}
                  onChange={(e) =>
                    setCancellationFilters((f) => ({ ...f, period: e.target.value }))
                  }
                  className="rounded border border-slate-200 px-2 py-1 text-sm"
                >
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisQuarter">This Quarter</option>
                  <option value="lastQuarter">Last Quarter</option>
                  <option value="thisYear">This Year</option>
                </select>
                <select
                  value={cancellationFilters.labSection}
                  onChange={(e) =>
                    setCancellationFilters((f) => ({ ...f, labSection: e.target.value }))
                  }
                  className="rounded border border-slate-200 px-2 py-1 text-sm"
                >
                  <option value="all">All sections</option>
                  {LAB_SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {cancellationAnalytics.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No cancellations recorded for this period.
                </div>
              ) : (
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Reason</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cancellationAnalytics.map((r) => (
                        <tr key={r.reason} className="border-b border-slate-50">
                          <td className="px-4 py-3">{r.reason.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3 text-right font-medium">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <span className="font-semibold text-slate-800">Audit Trail</span>
              </div>
              <div className="p-4 flex gap-2 mb-4">
                <button
                  onClick={() => setAuditSubTab("login")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    auditSubTab === "login"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Login Audit
                </button>
                <button
                  onClick={() => setAuditSubTab("operations")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    auditSubTab === "operations"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Operational Actions
                </button>
                <button
                  onClick={() => {
                    setAuditSubTab("compliance");
                    setCompliancePage(1);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    auditSubTab === "compliance"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Configuration &amp; access
                </button>
              </div>
              {auditSubTab !== "compliance" && (
              <div className="p-4 flex flex-wrap gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Start (YYYY-MM-DD)"
                  value={auditFilters.startDate}
                  onChange={(e) =>
                    setAuditFilters((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className="rounded border border-slate-200 px-2 py-1 text-sm w-36"
                />
                <input
                  type="text"
                  placeholder="End (YYYY-MM-DD)"
                  value={auditFilters.endDate}
                  onChange={(e) =>
                    setAuditFilters((p) => ({ ...p, endDate: e.target.value }))
                  }
                  className="rounded border border-slate-200 px-2 py-1 text-sm w-36"
                />
                {auditSubTab === "login" && (
                  <>
                    <input
                      placeholder="Username"
                      value={auditFilters.username}
                      onChange={(e) =>
                        setAuditFilters((p) => ({ ...p, username: e.target.value }))
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-sm w-32"
                    />
                    <select
                      value={auditFilters.success}
                      onChange={(e) =>
                        setAuditFilters((p) => ({ ...p, success: e.target.value }))
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                    >
                      <option value="">All</option>
                      <option value="true">Success</option>
                      <option value="false">Failed</option>
                    </select>
                  </>
                )}
                {auditSubTab === "operations" && (
                  <input
                    placeholder="Action"
                    value={auditFilters.action}
                    onChange={(e) =>
                      setAuditFilters((p) => ({ ...p, action: e.target.value }))
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-sm w-40"
                  />
                )}
                <select
                  value={auditFilters.limit}
                  onChange={(e) =>
                    setAuditFilters((p) => ({ ...p, limit: parseInt(e.target.value) }))
                  }
                  className="rounded border border-slate-200 px-2 py-1 text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <button
                  onClick={fetchAudit}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  Apply
                </button>
              </div>
              )}
              {auditSubTab === "compliance" && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-slate-500">Range:</span>
                    {(
                      [
                        ["7", "Last 7 days"],
                        ["30", "Last 30 days"],
                        ["90", "Last 90 days"],
                        ["custom", "Custom"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setCompliancePreset(k);
                          setCompliancePage(1);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          compliancePreset === k
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    {compliancePreset === "custom" && (
                      <>
                        <input
                          type="date"
                          value={complianceFrom}
                          onChange={(e) => setComplianceFrom(e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-sm"
                        />
                        <span className="text-slate-400">—</span>
                        <input
                          type="date"
                          value={complianceTo}
                          onChange={(e) => setComplianceTo(e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-sm"
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => void fetchComplianceAudit()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Time</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Actor</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Action</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Entity</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Summary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complianceRows.map((r) => (
                          <tr key={r.id} className="border-b border-slate-50">
                            <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                              {new Date(r.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-800">{r.actor_display}</div>
                              {r.actor_email && (
                                <div className="text-xs text-slate-500 truncate max-w-[180px]">
                                  {r.actor_email}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">{auditActionLabel(r.action)}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">
                              {r.entity_type ?? "—"}
                              {r.record_id && (
                                <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                                  {r.record_id.slice(0, 8)}…
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 max-w-xs">
                              <details className="text-xs text-slate-600">
                                <summary className="cursor-pointer text-emerald-700">View change</summary>
                                <pre className="mt-1 p-2 bg-slate-50 rounded overflow-x-auto whitespace-pre-wrap break-all">
                                  {JSON.stringify({ before: r.old_value, after: r.new_value }, null, 0)}
                                </pre>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {complianceRows.length === 0 && (
                      <div className="p-8 text-center text-slate-500">No configuration audit events yet.</div>
                    )}
                  </div>
                  {complianceTotal > 0 && (
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>
                        Page {compliancePage} of {Math.ceil(complianceTotal / 50) || 1} ({complianceTotal}{" "}
                        total)
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={compliancePage <= 1}
                          onClick={() => setCompliancePage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={compliancePage * 50 >= complianceTotal}
                          onClick={() => setCompliancePage((p) => p + 1)}
                          className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {auditSubTab === "login" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Username</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginLogs.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50">
                          <td className="px-4 py-3">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">{r.username}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                r.success ? "text-emerald-600" : "text-red-600"
                              }
                            >
                              {r.success ? "Success" : "Failed"}
                            </span>
                          </td>
                          <td className="px-4 py-3">{r.ip_address || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {loginLogs.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      No login events. Click Apply to load.
                    </div>
                  )}
                </div>
              )}
              {auditSubTab === "operations" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Action</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Table</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opLogs.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50">
                          <td className="px-4 py-3">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
                          <td className="px-4 py-3">{r.table_name || "—"}</td>
                          <td className="px-4 py-3">{r.record_id ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {opLogs.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      No operational actions. Click Apply to load.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-8">
              <h3 className="text-lg font-semibold text-slate-800">Targets</h3>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Monthly Revenue Target (UGX)</h4>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Month</label>
                    <select
                      value={monthlyTarget.month}
                      onChange={(e) =>
                        setMonthlyTarget((p) => ({
                          ...p,
                          month: parseInt(e.target.value),
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Year</label>
                    <input
                      type="number"
                      value={monthlyTarget.year}
                      onChange={(e) =>
                        setMonthlyTarget((p) => ({
                          ...p,
                          year: parseInt(e.target.value),
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm w-24"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Target (UGX)</label>
                    <input
                      type="number"
                      value={monthlyTarget.target}
                      onChange={(e) =>
                        setMonthlyTarget((p) => ({
                          ...p,
                          target: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm w-40"
                    />
                  </div>
                  <button
                    onClick={() => saveTarget("revenue", monthlyTarget)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    <Save size={14} />
                    Save
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Monthly Tests Target</h4>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Month</label>
                    <select
                      value={testsTarget.month}
                      onChange={(e) =>
                        setTestsTarget((p) => ({
                          ...p,
                          month: parseInt(e.target.value),
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Year</label>
                    <input
                      type="number"
                      value={testsTarget.year}
                      onChange={(e) =>
                        setTestsTarget((p) => ({
                          ...p,
                          year: parseInt(e.target.value),
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm w-24"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Target (Tests)</label>
                    <input
                      type="number"
                      value={testsTarget.target}
                      onChange={(e) =>
                        setTestsTarget((p) => ({
                          ...p,
                          target: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm w-32"
                    />
                  </div>
                  <button
                    onClick={() => saveTarget("tests", testsTarget)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    <Save size={14} />
                    Save
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Monthly Numbers Target (Requests)</h4>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Month</label>
                    <select
                      value={numbersTarget.month}
                      onChange={(e) =>
                        setNumbersTarget((p) => ({
                          ...p,
                          month: parseInt(e.target.value),
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Year</label>
                    <input
                      type="number"
                      value={numbersTarget.year}
                      onChange={(e) =>
                        setNumbersTarget((p) => ({
                          ...p,
                          year: parseInt(e.target.value),
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm w-24"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Target (Requests)</label>
                    <input
                      type="number"
                      value={numbersTarget.target}
                      onChange={(e) =>
                        setNumbersTarget((p) => ({
                          ...p,
                          target: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="rounded border border-slate-200 px-3 py-2 text-sm w-32"
                    />
                  </div>
                  <button
                    onClick={() => saveTarget("numbers", numbersTarget)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    <Save size={14} />
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-slate-700 text-white"
          }`}
        >
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-2 opacity-80 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
