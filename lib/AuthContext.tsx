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

// Generic types — supabase-js surface can differ slightly between environments
type User = { id: string; email?: string; user_metadata?: Record<string, unknown> };
type Session = { user: User };

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
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signOut, resetPassword }}
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
