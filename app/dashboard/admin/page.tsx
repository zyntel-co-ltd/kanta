"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  AlertTriangle,
  Ban,
  ClipboardList,
  Sliders,
  Plus,
  Pencil,
  Trash2,
  Key,
  Check,
  X,
  Save,
} from "lucide-react";
import Link from "next/link";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

const LAB_SECTIONS = [
  "CHEMISTRY",
  "HAEMATOLOGY",
  "MICROBIOLOGY",
  "SEROLOGY",
  "REFERRAL",
  "N/A",
];

const TAT_OPTIONS = [30, 45, 60, 90, 240, 1440, 4320, 7200, 17280];

type Tab = "users" | "unmatched" | "cancellations" | "audit" | "settings";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
};

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
  const [users, setUsers] = useState<User[]>([]);
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

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "technician" as string,
  });

  const [resetPasswordModal, setResetPasswordModal] = useState<{ id: string; username: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

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
  const [auditSubTab, setAuditSubTab] = useState<"login" | "operations">("login");
  const [auditFilters, setAuditFilters] = useState({
    startDate: "",
    endDate: "",
    username: "",
    success: "",
    action: "",
    limit: 50,
  });

  const facilityId = DEFAULT_FACILITY_ID;

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
  }, [facilityId, monthlyTarget.month, monthlyTarget.year, testsTarget.month, testsTarget.year, numbersTarget.month, numbersTarget.year]);

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === "users") {
        const res = await fetch(`/api/admin/users?facility_id=${facilityId}`);
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else if (activeTab === "unmatched") {
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "User Management", icon: <Users size={16} /> },
    { id: "unmatched", label: "Unmatched Tests", icon: <AlertTriangle size={16} /> },
    { id: "cancellations", label: "Cancellations", icon: <Ban size={16} /> },
    { id: "audit", label: "Audit Trail", icon: <ClipboardList size={16} /> },
    { id: "settings", label: "Settings", icon: <Sliders size={16} /> },
  ];

  const handleUserSubmit = async () => {
    try {
      if (editingUser) {
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: userForm.role,
            email: userForm.email,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to update");
        setToast({ message: "User updated", type: "success" });
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facility_id: facilityId,
            username: userForm.username.trim(),
            email: userForm.email?.trim() || "",
            password: userForm.password,
            role: userForm.role,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to create");
        setToast({ message: "User created", type: "success" });
      }
      setUserModalOpen(false);
      fetchData();
    } catch (e) {
      setToast({ message: (e as Error).message || "Error", type: "error" });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setToast({ message: "User deleted", type: "success" });
      fetchData();
    } catch {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: isActive ? "Deactivated" : "Activated", type: "success" });
      fetchData();
    } catch {
      setToast({ message: "Failed to toggle", type: "error" });
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal || !resetPasswordValue.trim()) return;
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordModal.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: "Password reset", type: "success" });
      setResetPasswordModal(null);
    } catch {
      setToast({ message: "Failed to reset password", type: "error" });
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Admin Panel
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            User management, unmatched tests, cancellations, audit, and settings.
          </p>
        </div>
        <Link
          href="/dashboard/home"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Home
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? "border-indigo-600 text-indigo-600"
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
      {isLoading && activeTab !== "settings" ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
          Loading...
        </div>
      ) : (
        <>
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950">
                <p className="font-semibold text-indigo-900 mb-1">How users work</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-900/90">
                  <li>
                    <strong>Admins add staff here</strong> — creates the Supabase Auth account and links them to
                    this facility with a role.
                  </li>
                  <li>
                    If you only created a user in the Supabase Dashboard, add a matching row in{" "}
                    <code className="text-xs bg-white/60 px-1 rounded">facility_users</code> or use{" "}
                    <strong>Add User</strong> below so they can sign in to Kanta.
                  </li>
                  <li>New users need a <strong>real email</strong> (they sign in with email + password).</li>
                </ul>
              </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="font-semibold text-slate-800">User Management</span>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUserForm({ username: "", email: "", password: "", role: "technician" });
                    setUserModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  <Plus size={14} />
                  Add User
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Display name</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50">
                        <td className="px-4 py-3">{u.email || "—"}</td>
                        <td className="px-4 py-3 font-medium">{u.username}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.role === "admin"
                                ? "bg-red-100 text-red-700"
                                : u.role === "manager"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.is_active ? (
                            <span className="text-emerald-600">Active</span>
                          ) : (
                            <span className="text-slate-400">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-3 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setUserForm({
                                username: u.username,
                                email: u.email || "",
                                password: "",
                                role: u.role,
                              });
                              setUserModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setResetPasswordModal({ id: u.id, username: u.username })}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                            title="Reset password"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                            title={u.is_active ? "Deactivate" : "Activate"}
                          >
                            {u.is_active ? <X size={14} /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <div className="p-8 text-center text-slate-500">No users yet.</div>
              )}
            </div>
            </div>
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
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
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
                                    className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200 disabled:opacity-50"
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
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Login Audit
                </button>
                <button
                  onClick={() => setAuditSubTab("operations")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    auditSubTab === "operations"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Operational Actions
                </button>
              </div>
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
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Apply
                </button>
              </div>
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
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
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
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
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
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
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

      {/* User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingUser ? "Edit User" : "Add User"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>{" "}
                  <span className="text-slate-400 font-normal">(sign-in)</span>
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                  disabled={!!editingUser}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  placeholder="name@hospital.org"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Display name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))}
                  disabled={!!editingUser}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Shown in the app header"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="technician">Technician</option>
                  <option value="viewer">Viewer</option>
                  <option value="reception">Reception</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setUserModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUserSubmit}
                disabled={!editingUser && (!userForm.email?.trim() || !userForm.password)}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingUser ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Reset Password: {resetPasswordModal.username}
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setResetPasswordModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!resetPasswordValue.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
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
