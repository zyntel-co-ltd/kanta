"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
// Use generic types - supabase-js types can vary by version
type User = { id: string; email?: string; user_metadata?: Record<string, unknown> };
type Session = { user: User };
import { createClient } from "@/lib/supabase/client";

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
    const auth = client.auth as {
      onAuthStateChange: (cb: (e: string, s: { user?: User } | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
      getSession: () => Promise<{ data: { session: { user?: User } | null } }>;
    };
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
      const { error } = await (client.auth as { signInWithPassword: (p: { email: string; password: string }) => Promise<{ error: unknown }> }).signInWithPassword({ email, password });
      return { error: error as Error | null };
    },
    []
  );

  const signOut = useCallback(async () => {
    const client = createClient();
    await (client.auth as { signOut: () => Promise<void> }).signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const client = createClient();
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { error } = await (client.auth as { resetPasswordForEmail: (e: string, o: { redirectTo: string }) => Promise<{ error: unknown }> }).resetPasswordForEmail(email, {
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
