"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { FacilityRole } from "@/lib/auth/roles";
import { emptyFacilityFlagsMap, KANTA_FEATURE_FLAG_NAMES } from "@/lib/featureFlagCatalog";
import posthog from "posthog-js";

// Generic types — supabase-js surface can differ slightly between environments
type UserMetadata = {
  full_name?: string;
  name?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  picture?: string;
  /** Google / some OAuth providers */
  image?: string;
};
type User = { id: string; email?: string; user_metadata?: UserMetadata };
type Session = { user: User };

export type FacilityAuthState = {
  facilityId: string | null;
  hospitalName: string | null;
  hospitalLogoUrl: string | null;
  /** From `hospitals.tier` — plan ceiling for feature gating */
  subscriptionTier: string | null;
  /** ENG-91: `hospital_groups` membership; null = standalone facility */
  groupId: string | null;
  groupName: string | null;
  branchName: string | null;
  role: FacilityRole | null;
  isSuperAdmin: boolean;
  canAccessAdminPanel: boolean;
  canAccessAdmin: boolean;
  canViewRevenue: boolean;
  canManageUsers: boolean;
  canWrite: boolean;
  /** ENG-161: per-flag enabled state from `facility_flags` + env overrides (GET `/api/me`). */
  flags: Record<string, boolean>;
};

/** Bridge casts: Vercel/CI uses stricter checks on SupabaseAuthClient overlaps */
type BrowserAuth = {
  onAuthStateChange: (
    cb: (e: string, s: { user?: User } | null) => void
  ) => { data: { subscription: { unsubscribe: () => void } } };
  getSession: () => Promise<{ data: { session: { user?: User } | null } }>;
  signInWithPassword: (p: {
    email: string;
    password: string;
  }) => Promise<{ error: unknown }>;
  signOut: () => Promise<{ error: unknown }>;
  resetPasswordForEmail: (
    e: string,
    o: { redirectTo: string }
  ) => Promise<{ error: unknown }>;
  updateUser: (payload: {
    password?: string;
    data?: Record<string, unknown>;
  }) => Promise<{ error: unknown }>;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  displayName: string;
  avatarUrl: string | null;
  loading: boolean;
  /** RBAC from GET /api/me — null when logged out or before fetch completes */
  facilityAuth: FacilityAuthState | null;
  facilityAuthLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshUser: () => Promise<void>;
  /** Re-fetch GET /api/me (e.g. after saving hospital branch name). */
  refreshFacilityAuth: () => Promise<void>;
};


const AUTH_CACHE_KEY = "zyntel_facility_auth_v1";

function normalizeCachedFlags(raw: unknown): Record<string, boolean> {
  const base = emptyFacilityFlagsMap();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const k of KANTA_FEATURE_FLAG_NAMES) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "boolean") base[k] = v;
    }
  }
  return base;
}

function readCachedAuth(): FacilityAuthState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<FacilityAuthState>;
    return {
      ...p,
      groupId: p.groupId ?? null,
      groupName: p.groupName ?? null,
      branchName: p.branchName ?? null,
      flags: normalizeCachedFlags(p.flags),
    } as FacilityAuthState;
  } catch {
    return null;
  }
}

function writeCachedAuth(auth: FacilityAuthState | null) {
  if (typeof window === "undefined") return;
  try {
    if (auth) {
      sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(auth));
    } else {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    // sessionStorage unavailable (private mode quota etc.) — degrade gracefully
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Seed from sessionStorage so the panel renders immediately on repeat visits.
  // The background fetch below will validate and update if anything has changed.
  const [facilityAuth, setFacilityAuth] = useState<FacilityAuthState | null>(
    () => readCachedAuth()
  );
  const [facilityAuthLoading, setFacilityAuthLoading] = useState(
    () => readCachedAuth() === null  // only show spinner when there is no cached data
  );

  useEffect(() => {
    const client = createClient();
    const auth = client.auth as unknown as BrowserAuth;
    const { data: { subscription } } = auth.onAuthStateChange((_event, s) => {
      setSession(s as Session | null);
      setUser((s?.user as User) ?? null);
      setLoading(false);
    });

    auth.getSession().then(({ data: { session: s } }) => {
      setSession(s as Session | null);
      setUser((s?.user as User) ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const applyMePayload = useCallback((data: Record<string, unknown> | null): FacilityAuthState | null => {
    if (!data) return null;
    const flags = normalizeCachedFlags(data.flags);
    return {
      facilityId: (data.facilityId as string | null) ?? null,
      hospitalName: (data.hospitalName as string | null) ?? null,
      hospitalLogoUrl: (data.hospitalLogoUrl as string | null) ?? null,
      subscriptionTier:
        typeof data.subscriptionTier === "string" ? data.subscriptionTier : null,
      groupId: typeof data.groupId === "string" ? data.groupId : null,
      groupName: typeof data.groupName === "string" ? data.groupName : null,
      branchName: typeof data.branchName === "string" ? data.branchName : null,
      role: (data.role as FacilityRole | null) ?? null,
      isSuperAdmin: !!data.isSuperAdmin,
      canAccessAdminPanel: !!data.canAccessAdminPanel,
      canAccessAdmin: !!data.canAccessAdmin,
      canViewRevenue: !!data.canViewRevenue,
      canManageUsers: !!data.canManageUsers,
      canWrite: !!data.canWrite,
      flags,
    };
  }, []);

  const refreshFacilityAuth = useCallback(async () => {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !data) return;
    const next = applyMePayload(data);
    if (next) {
      writeCachedAuth(next);
      setFacilityAuth(next);
    }
  }, [applyMePayload]);

  useEffect(() => {
    if (!user) {
      writeCachedAuth(null);
      setFacilityAuth(null);
      setFacilityAuthLoading(false);
      return;
    }

    let cancelled = false;
    // Only show the spinner if there's no cached auth to display yet.
    if (readCachedAuth() === null) setFacilityAuthLoading(true);

    fetch("/api/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) {
          if (!cancelled) {
            writeCachedAuth(null);
            setFacilityAuth(null);
          }
          return;
        }
        const next = applyMePayload(data as Record<string, unknown>);
        if (!next) {
          writeCachedAuth(null);
          setFacilityAuth(null);
          return;
        }
        writeCachedAuth(next);
        if (!cancelled) setFacilityAuth(next);
      })
      .catch(() => {
        if (!cancelled) {
          // On network error keep the cached value — don't flash the spinner.
          // The next successful fetch will refresh it.
        }
      })
      .finally(() => {
        if (!cancelled) setFacilityAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, applyMePayload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const fid = facilityAuth?.facilityId;
    if (!fid) return;
    posthog.group("branch", fid, {
      name: facilityAuth?.hospitalName ?? undefined,
      tier: facilityAuth?.subscriptionTier ?? undefined,
      branch: facilityAuth?.branchName ?? undefined,
      group: facilityAuth?.groupName ?? undefined,
    });
  }, [
    facilityAuth?.facilityId,
    facilityAuth?.hospitalName,
    facilityAuth?.subscriptionTier,
    facilityAuth?.branchName,
    facilityAuth?.groupName,
  ]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = createClient();
      const auth = client.auth as unknown as BrowserAuth;
      const { error } = await auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    },
    []
  );

  const signOut = useCallback(async () => {
    const client = createClient();
    const auth = client.auth as unknown as BrowserAuth;
    writeCachedAuth(null);
    setFacilityAuth(null);
    await auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const client = createClient();
    const auth = client.auth as unknown as BrowserAuth;
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { error } = await auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/confirm?next=/password-reset`,
    });
    return { error: error as Error | null };
  }, []);

  const refreshUser = useCallback(async () => {
    const client = createClient();
    const auth = client.auth as unknown as BrowserAuth;
    const { data: { session: s } } = await auth.getSession();
    setSession(s as Session | null);
    setUser((s?.user as User) ?? null);
  }, []);

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "User";
  const meta = user?.user_metadata;
  const avatarUrl =
    (typeof meta?.avatar_url === "string" && meta.avatar_url.trim()) ||
    (typeof meta?.picture === "string" && meta.picture.trim()) ||
    (typeof meta?.image === "string" && meta.image.trim()) ||
    null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        displayName,
        avatarUrl,
        loading,
        facilityAuth,
        facilityAuthLoading,
        signIn,
        signOut,
        resetPassword,
        refreshUser,
        refreshFacilityAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
