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
  role: FacilityRole | null;
  isSuperAdmin: boolean;
  canAccessAdminPanel: boolean;
  canAccessAdmin: boolean;
  canViewRevenue: boolean;
  canManageUsers: boolean;
  canWrite: boolean;
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
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [facilityAuth, setFacilityAuth] = useState<FacilityAuthState | null>(null);
  const [facilityAuthLoading, setFacilityAuthLoading] = useState(true);

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

  useEffect(() => {
    if (!user) {
      setFacilityAuth(null);
      setFacilityAuthLoading(false);
      return;
    }

    let cancelled = false;
    setFacilityAuthLoading(true);

    fetch("/api/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) {
          if (!cancelled) setFacilityAuth(null);
          return;
        }
        setFacilityAuth({
          facilityId: data.facilityId ?? null,
          hospitalName: data.hospitalName ?? null,
          hospitalLogoUrl: data.hospitalLogoUrl ?? null,
          subscriptionTier:
            typeof data.subscriptionTier === "string" ? data.subscriptionTier : null,
          role: data.role ?? null,
          isSuperAdmin: !!data.isSuperAdmin,
          canAccessAdminPanel: !!data.canAccessAdminPanel,
          canAccessAdmin: !!data.canAccessAdmin,
          canViewRevenue: !!data.canViewRevenue,
          canManageUsers: !!data.canManageUsers,
          canWrite: !!data.canWrite,
        });
      })
      .catch(() => {
        if (!cancelled) setFacilityAuth(null);
      })
      .finally(() => {
        if (!cancelled) setFacilityAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const fid = facilityAuth?.facilityId;
    if (!fid) return;
    posthog.group("branch", fid, {
      name: facilityAuth?.hospitalName ?? undefined,
      tier: facilityAuth?.subscriptionTier ?? undefined,
    });
  }, [
    facilityAuth?.facilityId,
    facilityAuth?.hospitalName,
    facilityAuth?.subscriptionTier,
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
