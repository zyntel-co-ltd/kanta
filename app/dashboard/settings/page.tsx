"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, UserRound, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";

type BrowserAuth = {
  updateUser: (payload: {
    password?: string;
    data?: Record<string, unknown>;
  }) => Promise<{ error: Error | null }>;
  signInWithPassword: (payload: {
    email: string;
    password: string;
  }) => Promise<{ error: Error | null }>;
};

function initials(nameOrEmail: string) {
  const cleaned = nameOrEmail.trim();
  if (!cleaned) return "U";
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

type Toast = { message: string; type: "success" | "error" };

export default function SettingsPage() {
  const { user, displayName, avatarUrl, refreshUser } = useAuth();
  const client = useMemo(() => createClient(), []);
  const auth = client.auth as unknown as BrowserAuth;
  const [profileName, setProfileName] = useState(displayName);
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    setProfileName(displayName);
  }, [displayName]);

  const email = user?.email || "";
  const identityLabel = profileName?.trim() || email || "User";

  const onSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const name = profileName.trim();
    try {
      const { error } = await auth.updateUser({
        data: {
          display_name: name,
          username: name || user.user_metadata?.username || user.email?.split("@")[0] || "user",
        },
      });
      if (error) throw error;
      await refreshUser();
      setToast({ message: "Profile updated", type: "success" });
    } catch (e) {
      setToast({ message: (e as Error).message || "Failed to update profile", type: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  const onUploadAvatar = async (file?: File) => {
    if (!user || !file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setToast({ message: "Only JPEG or PNG files are allowed", type: "error" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ message: "File size must be 2MB or less", type: "error" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await client.storage.from("avatars").upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      const { data } = client.storage.from("avatars").getPublicUrl(path);
      const { error: updateError } = await auth.updateUser({
        data: { avatar_url: data.publicUrl },
      });
      if (updateError) throw updateError;
      await refreshUser();
      setToast({ message: "Avatar updated", type: "success" });
    } catch (e) {
      setToast({ message: (e as Error).message || "Avatar upload failed", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const onChangePassword = async () => {
    if (!email) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setToast({ message: "Fill all password fields", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ message: "New password and confirmation do not match", type: "error" });
      return;
    }
    if (newPassword.length < 8) {
      setToast({ message: "New password must be at least 8 characters", type: "error" });
      return;
    }
    setPasswordSaving(true);
    try {
      // Verify current password first.
      const { error: checkError } = await auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (checkError) throw new Error("Current password is incorrect");
      const { error } = await auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setToast({ message: "Password changed", type: "success" });
    } catch (e) {
      setToast({ message: (e as Error).message || "Failed to change password", type: "error" });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your profile, avatar, and security settings.</p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserRound size={18} className="module-accent-text" />
          <h2 className="text-lg font-semibold text-slate-800">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Display name</label>
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Your display name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
            <input value={email} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" />
          </div>
        </div>
        <button onClick={onSaveProfile} disabled={profileSaving} className="px-4 py-2 rounded-xl bg-[var(--module-primary)] text-white text-sm font-medium disabled:opacity-50">
          {profileSaving ? "Saving..." : "Save Profile"}
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Upload size={18} className="module-accent-text" />
          <h2 className="text-lg font-semibold text-slate-800">Avatar</h2>
        </div>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={identityLabel} className="w-16 h-16 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
              {initials(identityLabel)}
            </div>
          )}
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium cursor-pointer hover:bg-slate-200">
            <Upload size={14} />
            {uploading ? "Uploading..." : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              disabled={uploading}
              onChange={(e) => onUploadAvatar(e.target.files?.[0])}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">JPEG/PNG only, max size 2MB. Stored in Supabase Storage bucket `avatars`.</p>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="module-accent-text" />
          <h2 className="text-lg font-semibold text-slate-800">Security</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
        </div>
        <button onClick={onChangePassword} disabled={passwordSaving} className="px-4 py-2 rounded-xl bg-[var(--module-primary)] text-white text-sm font-medium disabled:opacity-50">
          {passwordSaving ? "Updating..." : "Change Password"}
        </button>
        <p className="text-xs text-slate-500">If password update fails with a session error, log out and log in again, then retry.</p>
      </section>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-sm text-white z-50 ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          <span className="inline-flex items-center gap-1.5">
            {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.message}
          </span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">x</button>
        </div>
      )}
    </div>
  );
}
