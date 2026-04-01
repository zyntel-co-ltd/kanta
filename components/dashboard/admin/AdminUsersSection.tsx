"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Key, Check, X, Mail, RefreshCw, XCircle } from "lucide-react";
import {
  assignableFacilityRoles,
  facilityRoleLabel,
  isFacilityRole,
  normalizeFacilityRoleInput,
  roleRank,
  type FacilityRole,
} from "@/lib/auth/roles";
import Tooltip from "@/components/ui/Tooltip";
import { useAuth } from "@/lib/AuthContext";
import { LoadingBars } from "@/components/ui/PageLoader";

export type FacilityUserRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  role_label?: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string | null;
  avatar_url?: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

function initialsFromName(name: string, email: string) {
  const base = name?.trim() || email?.split("@")[0] || "U";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

function formatJoined(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function AdminUsersSection({
  facilityId,
  onToast,
}: {
  facilityId: string;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}) {
  const { user, facilityAuth } = useAuth();
  const currentUserId = user?.id ?? "";
  const actorRole = (facilityAuth?.role && isFacilityRole(facilityAuth.role)
    ? facilityAuth.role
    : null) as FacilityRole | null;
  const isSuperAdmin = !!facilityAuth?.isSuperAdmin;
  const assignable = assignableFacilityRoles(actorRole, isSuperAdmin);

  const [users, setUsers] = useState<FacilityUserRow[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<FacilityRole>("lab_technician");
  const [inviteSending, setInviteSending] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "lab_technician" as FacilityRole,
  });
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const [uRes, iRes] = await Promise.all([
        fetch(`/api/admin/users?facility_id=${facilityId}`),
        fetch(`/api/invites?facility_id=${facilityId}`),
      ]);
      if (uRes.ok) {
        const data = await uRes.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setUsers([]);
      }
      if (iRes.ok) {
        const data = await iRes.json();
        setInvites(Array.isArray(data) ? data : []);
      } else {
        setInvites([]);
      }
    } catch {
      onToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [facilityId, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      onToast("Enter a valid email", "error");
      return;
    }
    if (!assignable.includes(inviteRole)) {
      onToast("You cannot assign this role", "error");
      return;
    }
    setInviteSending(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facilityId,
          email,
          role: inviteRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to send invite");
      onToast(data.email_sent ? "Invite sent" : "Invite created (email may be pending)", "success");
      setInviteEmail("");
      await load();
    } catch (e) {
      onToast((e as Error).message || "Invite failed", "error");
    } finally {
      setInviteSending(false);
    }
  };

  const handleRoleChange = async (fuId: string, newRole: FacilityRole) => {
    if (!assignable.includes(newRole)) {
      onToast("You cannot assign this role", "error");
      return;
    }
    setRoleSavingId(fuId);
    try {
      const res = await fetch(`/api/admin/users/${fuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Update failed");
      onToast("Role updated", "success");
      await load();
    } catch (e) {
      onToast((e as Error).message || "Failed to update role", "error");
    } finally {
      setRoleSavingId(null);
    }
  };

  const handleToggleActive = async (id: string, userId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast(isActive ? "User deactivated" : "User reactivated", "success");
      await load();
    } catch (e) {
      onToast((e as Error).message || "Failed to toggle", "error");
    }
  };

  const handleCreateUser = async () => {
    try {
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
      onToast("User created", "success");
      setUserModalOpen(false);
      await load();
    } catch (e) {
      onToast((e as Error).message || "Error", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal || !resetPasswordValue.trim()) return;
    try {
      const res = await fetch(
        `/api/admin/users/${resetPasswordModal.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: resetPasswordValue }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast("Password reset", "success");
      setResetPasswordModal(null);
      setResetPasswordValue("");
    } catch (e) {
      onToast((e as Error).message || "Failed", "error");
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      onToast("Invite cancelled", "success");
      await load();
    } catch {
      onToast("Failed to cancel invite", "error");
    }
  };

  const handleSyncSupabaseUsers = async () => {
    if (!isSuperAdmin) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: facilityId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Sync failed");
      onToast(`Synced ${typeof data.synced === "number" ? data.synced : 0} user(s)`, "success");
      await load();
    } catch (e) {
      onToast((e as Error).message || "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const resendInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invites/${inviteId}/resend`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      onToast(data.email_sent ? "Invite resent" : "Resend queued", "success");
    } catch (e) {
      onToast((e as Error).message || "Resend failed", "error");
    }
  };

  const inviteExpired = (expiresAt: string) =>
    new Date(expiresAt) < new Date();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold text-emerald-900 mb-1">Users & access</p>
        <ul className="list-disc list-inside space-y-1 text-emerald-900/90">
          <li>
            <strong>Invite by email</strong> — the recipient accepts the invite and sets their
            password. Prefer this for new staff.
          </li>
          <li>
            <strong>Direct create</strong> (advanced) — only when you must set a temporary password
            in-app.
          </li>
          <li>
            Accounts are scoped to this facility. <strong>Deactivate</strong> users who should no
            longer access Kanta — accounts are not deleted.
          </li>
        </ul>
      </div>

      {/* Invite */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Invite user</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@hospital.org"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as FacilityRole)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {assignable.map((r) => (
                <option key={r} value={r}>
                  {facilityRoleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={inviteSending}
            onClick={() => void handleInvite()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            <Mail size={16} />
            {inviteSending ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="font-semibold text-slate-800">Pending invites</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Role</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Expires</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5">{inv.email}</td>
                    <td className="px-4 py-2.5">{facilityRoleLabel(inv.role)}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatJoined(inv.expires_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      {inviteExpired(inv.expires_at) ? (
                        <span className="text-amber-700">Expired</span>
                      ) : (
                        <span className="text-emerald-700">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <Tooltip label="Resend email">
                          <button
                            type="button"
                            onClick={() => void resendInvite(inv.id)}
                            disabled={inviteExpired(inv.expires_at)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                            aria-label="Resend invite"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Cancel invite">
                          <button
                            type="button"
                            onClick={() => void cancelInvite(inv.id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            aria-label="Cancel invite"
                          >
                            <XCircle size={14} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="font-semibold text-slate-800">Facility users</span>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {isSuperAdmin && (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void handleSyncSupabaseUsers()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync Supabase users"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setUserForm({
                  username: "",
                  email: "",
                  password: "",
                  role: "lab_technician",
                });
                setUserModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              <Plus size={14} />
              Advanced: create with password
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Full name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date joined</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <div className="flex justify-center">
                      <LoadingBars />
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.user_id === currentUserId;
                  const rowRole = normalizeFacilityRoleInput(u.role);
                  const canManageRow =
                    !isSelf &&
                    (isSuperAdmin ||
                      (actorRole !== null && roleRank(rowRole) <= roleRank(actorRole)));
                  const canEditRole = canManageRow && assignable.includes(rowRole);
                  return (
                    <tr key={u.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {u.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                              {initialsFromName(u.full_name, u.email)}
                            </div>
                          )}
                          <span className="font-medium text-slate-900 truncate">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 break-all max-w-[220px]">
                        {u.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {canEditRole ? (
                          <select
                            value={u.role}
                            disabled={roleSavingId === u.id}
                            onChange={(e) =>
                              void handleRoleChange(u.id, e.target.value as FacilityRole)
                            }
                            className="max-w-[11rem] rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium"
                          >
                            {assignable.map((r) => (
                              <option key={r} value={r}>
                                {facilityRoleLabel(r)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {u.role_label ?? facilityRoleLabel(u.role)}
                            {isSelf && (
                              <span className="ml-1 text-slate-500">(you)</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="text-emerald-700 font-medium">Active</span>
                        ) : (
                          <span className="text-slate-500">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatJoined(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Tooltip
                            label={
                              !canManageRow
                                ? "You cannot modify this user"
                                : "Reset password"
                            }
                          >
                            <button
                              type="button"
                              disabled={!canManageRow}
                              onClick={() =>
                                setResetPasswordModal({
                                  id: u.id,
                                  label: u.full_name,
                                })
                              }
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label="Reset password"
                            >
                              <Key size={14} />
                            </button>
                          </Tooltip>
                          <Tooltip
                            label={
                              isSelf
                                ? "You cannot deactivate your own account"
                                : !canManageRow
                                  ? "You cannot modify this user"
                                  : u.is_active
                                    ? "Deactivate user"
                                    : "Reactivate user"
                            }
                          >
                            <button
                              type="button"
                              disabled={isSelf || !canManageRow}
                              onClick={() =>
                                void handleToggleActive(u.id, u.user_id, u.is_active)
                              }
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label={u.is_active ? "Deactivate" : "Activate"}
                            >
                              {u.is_active ? <X size={14} /> : <Check size={14} />}
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && users.length === 0 && (
          <div className="p-8 text-center text-slate-500">No users in this facility yet.</div>
        )}
      </div>

      {userModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Create user (advanced)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Creates Supabase Auth account + facility membership. Prefer invites when possible.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  placeholder="name@hospital.org"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Display name <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm((p) => ({
                      ...p,
                      role: e.target.value as FacilityRole,
                    }))
                  }
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  {assignable.map((r) => (
                    <option key={r} value={r}>
                      {facilityRoleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateUser()}
                disabled={!userForm.email?.trim() || !userForm.password}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Reset password: {resetPasswordModal.label}
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setResetPasswordModal(null);
                  setResetPasswordValue("");
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={!resetPasswordValue.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
